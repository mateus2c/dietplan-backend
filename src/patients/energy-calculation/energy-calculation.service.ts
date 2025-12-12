import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId, Types } from 'mongoose';
import {
  EnergyCalculation,
  EnergyCalculationDocument,
} from './schemas/energy-calculation.schema';
import { Patient, PatientDocument } from '../schemas/patient.schema';
import { UpdateEnergyCalculationDto } from './dto/update-energy-calculation.dto';
import { CreateEnergyCalculationDto } from './dto/create-energy-calculation.dto';

@Injectable()
export class EnergyCalculationService {
  constructor(
    @InjectModel(EnergyCalculation.name)
    private readonly energyCalculationModel: Model<EnergyCalculationDocument>,
    @InjectModel(Patient.name)
    private readonly patientModel: Model<PatientDocument>,
  ) {}

  async getByPatientId(patientId: string, userId: string) {
    if (!isValidObjectId(patientId)) {
      throw new BadRequestException('Invalid patient id');
    }
    const owner = await this.patientModel.findById(patientId).lean();
    if (!owner) {
      throw new NotFoundException('Patient not found');
    }
    if (owner.user?.toString() !== userId) {
      throw new ForbiddenException('Not allowed');
    }
    const doc = await this.energyCalculationModel
      .findOne({ patient: new Types.ObjectId(patientId) })
      .lean();
    if (!doc) {
      throw new NotFoundException('Energy calculation not found for patient');
    }
    return {
      id: doc._id.toString(),
      patientId: doc.patient.toString(),
      height: doc.height,
      weight: doc.weight,
      energyCalculationFormula: doc.energyCalculationFormula,
      physicalActivityFactor: doc.physicalActivityFactor,
      injuryFactor: doc.injuryFactor,
      pregnancyEnergyAdditional: doc.pregnancyEnergyAdditional,
    };
  }

  async upsert(
    patientId: string,
    userId: string,
    data: UpdateEnergyCalculationDto,
  ) {
    if (!isValidObjectId(patientId)) {
      throw new BadRequestException('Invalid patient id');
    }
    const owner = await this.patientModel.findById(patientId).lean();
    if (!owner) {
      throw new NotFoundException('Patient not found');
    }
    if (owner.user?.toString() !== userId) {
      throw new ForbiddenException('Not allowed');
    }

    const updatePayload: Record<string, unknown> = {};
    if (data.height !== undefined) {
      updatePayload.height = data.height;
    }
    if (data.weight !== undefined) {
      updatePayload.weight = data.weight;
    }
    if (data.energyCalculationFormula !== undefined) {
      updatePayload.energyCalculationFormula = data.energyCalculationFormula;
    }
    if (data.physicalActivityFactor !== undefined) {
      updatePayload.physicalActivityFactor = data.physicalActivityFactor;
    }
    if (data.injuryFactor !== undefined) {
      updatePayload.injuryFactor = data.injuryFactor;
    }
    if (data.pregnancyEnergyAdditional !== undefined) {
      updatePayload.pregnancyEnergyAdditional = data.pregnancyEnergyAdditional;
    }

    const updated = await this.energyCalculationModel
      .findOneAndUpdate(
        { patient: new Types.ObjectId(patientId) },
        {
          $setOnInsert: { patient: new Types.ObjectId(patientId) },
          $set: updatePayload,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .lean();

    if (!updated) {
      throw new NotFoundException(
        'Failed to create or update energy calculation',
      );
    }

    // Update patient reference
    await this.patientModel
      .findByIdAndUpdate(
        patientId,
        { energyCalculation: updated._id },
        { new: false },
      )
      .lean();

    return {
      id: updated._id.toString(),
      patientId: updated.patient.toString(),
      height: updated.height,
      weight: updated.weight,
      energyCalculationFormula: updated.energyCalculationFormula,
      physicalActivityFactor: updated.physicalActivityFactor,
      injuryFactor: updated.injuryFactor,
      pregnancyEnergyAdditional: updated.pregnancyEnergyAdditional,
    };
  }

  async create(
    patientId: string,
    userId: string,
    data: CreateEnergyCalculationDto,
  ) {
    if (!isValidObjectId(patientId)) {
      throw new BadRequestException('Invalid patient id');
    }
    const owner = await this.patientModel.findById(patientId).lean();
    if (!owner) {
      throw new NotFoundException('Patient not found');
    }
    if (owner.user?.toString() !== userId) {
      throw new ForbiddenException('Not allowed');
    }

    // Check if energy calculation already exists
    const existing = await this.energyCalculationModel
      .findOne({ patient: new Types.ObjectId(patientId) })
      .lean();
    if (existing) {
      throw new BadRequestException(
        'Energy calculation already exists for this patient',
      );
    }

    const newDoc = new this.energyCalculationModel({
      patient: new Types.ObjectId(patientId),
      height: data.height,
      weight: data.weight,
      energyCalculationFormula: data.energyCalculationFormula,
      physicalActivityFactor: data.physicalActivityFactor,
      injuryFactor: data.injuryFactor,
      pregnancyEnergyAdditional: data.pregnancyEnergyAdditional,
    });

    const saved = await newDoc.save();

    // Update patient reference
    await this.patientModel
      .findByIdAndUpdate(
        patientId,
        { energyCalculation: saved._id },
        { new: false },
      )
      .lean();

    return {
      id: saved._id.toString(),
      patientId: saved.patient.toString(),
      height: saved.height,
      weight: saved.weight,
      energyCalculationFormula: saved.energyCalculationFormula,
      physicalActivityFactor: saved.physicalActivityFactor,
      injuryFactor: saved.injuryFactor,
      pregnancyEnergyAdditional: saved.pregnancyEnergyAdditional,
    };
  }

  async deleteByPatientId(patientId: string, userId: string) {
    if (!isValidObjectId(patientId)) {
      throw new BadRequestException('Invalid patient id');
    }
    const owner = await this.patientModel.findById(patientId).lean();
    if (!owner) {
      throw new NotFoundException('Patient not found');
    }
    if (owner.user?.toString() !== userId) {
      throw new ForbiddenException('Not allowed');
    }

    const deleted = await this.energyCalculationModel
      .findOneAndDelete({ patient: new Types.ObjectId(patientId) })
      .lean();

    if (!deleted) {
      throw new NotFoundException('Energy calculation not found for patient');
    }

    // Remove patient reference
    await this.patientModel
      .findByIdAndUpdate(
        patientId,
        { $unset: { energyCalculation: '' } },
        { new: false },
      )
      .lean();

    return { deleted: true };
  }
}
