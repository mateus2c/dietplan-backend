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
} from './schemas/energy-calculations.schema';
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

  async getByPatientId(
    patientId: string,
    userId: string,
    page?: number,
    pageSize?: number,
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
    const doc = await this.energyCalculationModel
      .findOne({ patient: new Types.ObjectId(patientId) })
      .lean();
    if (!doc) {
      throw new NotFoundException('Energy calculation not found for patient');
    }

    const allCalculations = doc.calculations || [];

    const p =
      page !== undefined && Number.isFinite(Number(page)) && Number(page) > 0
        ? Number(page)
        : 1;
    const size =
      pageSize !== undefined &&
      Number.isFinite(Number(pageSize)) &&
      Number(pageSize) > 0
        ? Number(pageSize)
        : 10;
    const skip = (p - 1) * size;
    const total = allCalculations.length;
    const paginatedCalculations = allCalculations.slice(skip, skip + size);

    return {
      id: doc._id.toString(),
      patientId: doc.patient.toString(),
      page: p,
      pageSize: size,
      total,
      totalPages: Math.max(1, Math.ceil(total / size)),
      calculations: paginatedCalculations,
    };
  }

  async addCalculation(
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
    const updated = await this.energyCalculationModel
      .findOneAndUpdate(
        { patient: new Types.ObjectId(patientId) },
        {
          $setOnInsert: { patient: new Types.ObjectId(patientId) },
          $push: { calculations: data },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .lean();
    if (!updated) {
      throw new NotFoundException(
        'Failed to create or update energy calculation',
      );
    }
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
      calculations: updated.calculations,
    };
  }

  async patchCalculationById(
    patientId: string,
    calculationId: string,
    userId: string,
    partial: UpdateEnergyCalculationDto,
  ) {
    if (!isValidObjectId(patientId)) {
      throw new BadRequestException('Invalid patient id');
    }
    if (!isValidObjectId(calculationId)) {
      throw new BadRequestException('Invalid calculation id');
    }
    const owner = await this.patientModel.findById(patientId).lean();
    if (!owner) {
      throw new NotFoundException('Patient not found');
    }
    if (owner.user?.toString() !== userId) {
      throw new ForbiddenException('Not allowed');
    }
    const castCalculationId = new Types.ObjectId(calculationId);
    const currentDoc = await this.energyCalculationModel
      .findOne({ patient: new Types.ObjectId(patientId) })
      .lean();
    if (!currentDoc) {
      throw new NotFoundException('Energy calculation not found for patient');
    }
    const currentCalculation = (currentDoc.calculations || []).find(
      (c: any) => {
        const cid =
          c._id instanceof Types.ObjectId ? c._id : new Types.ObjectId(c._id);
        return cid.equals(castCalculationId);
      },
    );
    const setPayload: Record<string, unknown> = {};
    if (
      partial.height !== undefined &&
      (!currentCalculation || currentCalculation.height !== partial.height)
    ) {
      setPayload['calculations.$.height'] = partial.height;
    }
    if (
      partial.weight !== undefined &&
      (!currentCalculation || currentCalculation.weight !== partial.weight)
    ) {
      setPayload['calculations.$.weight'] = partial.weight;
    }
    if (
      partial.energyCalculationFormula !== undefined &&
      (!currentCalculation ||
        currentCalculation.energyCalculationFormula !==
          partial.energyCalculationFormula)
    ) {
      setPayload['calculations.$.energyCalculationFormula'] =
        partial.energyCalculationFormula;
    }
    if (
      partial.physicalActivityFactor !== undefined &&
      (!currentCalculation ||
        currentCalculation.physicalActivityFactor !==
          partial.physicalActivityFactor)
    ) {
      setPayload['calculations.$.physicalActivityFactor'] =
        partial.physicalActivityFactor;
    }
    if (
      partial.injuryFactor !== undefined &&
      (!currentCalculation ||
        currentCalculation.injuryFactor !== partial.injuryFactor)
    ) {
      setPayload['calculations.$.injuryFactor'] = partial.injuryFactor;
    }
    if (
      partial.pregnancyEnergyAdditional !== undefined &&
      (!currentCalculation ||
        currentCalculation.pregnancyEnergyAdditional !==
          partial.pregnancyEnergyAdditional)
    ) {
      setPayload['calculations.$.pregnancyEnergyAdditional'] =
        partial.pregnancyEnergyAdditional;
    }
    if (
      partial.leanBodyMass !== undefined &&
      (!currentCalculation ||
        currentCalculation.leanBodyMass !== partial.leanBodyMass)
    ) {
      setPayload['calculations.$.leanBodyMass'] = partial.leanBodyMass;
    }
    if (Object.keys(setPayload).length === 0) {
      return {
        id: currentDoc._id.toString(),
        patientId: currentDoc.patient.toString(),
        calculations: currentDoc.calculations,
      };
    }
    const updated = await this.energyCalculationModel
      .findOneAndUpdate(
        {
          patient: new Types.ObjectId(patientId),
          'calculations._id': castCalculationId,
        },
        { $set: setPayload },
        { new: true },
      )
      .lean();
    if (!updated) {
      const doc = currentDoc;
      const normalized = (doc.calculations ?? []).map((c: any) => ({
        _id: c._id ? new Types.ObjectId(c._id) : new Types.ObjectId(),
        height: c.height,
        weight: c.weight,
        energyCalculationFormula: c.energyCalculationFormula,
        physicalActivityFactor: c.physicalActivityFactor,
        injuryFactor: c.injuryFactor,
        pregnancyEnergyAdditional: c.pregnancyEnergyAdditional,
        leanBodyMass: c.leanBodyMass,
      }));
      await this.energyCalculationModel
        .findOneAndUpdate(
          { _id: doc._id },
          { $set: { calculations: normalized } },
          { new: true },
        )
        .lean();
      const retry = await this.energyCalculationModel
        .findOneAndUpdate(
          { _id: doc._id, 'calculations._id': castCalculationId },
          { $set: setPayload },
          { new: true },
        )
        .lean();
      if (!retry) {
        throw new NotFoundException('Energy calculation not found for patient');
      }
      return {
        id: retry._id.toString(),
        patientId: retry.patient.toString(),
        calculations: retry.calculations,
      };
    }
    return {
      id: updated._id.toString(),
      patientId: updated.patient.toString(),
      calculations: updated.calculations,
    };
  }

  async deleteCalculationById(
    patientId: string,
    calculationId: string,
    userId: string,
  ) {
    if (!isValidObjectId(patientId)) {
      throw new BadRequestException('Invalid patient id');
    }
    if (!isValidObjectId(calculationId)) {
      throw new BadRequestException('Invalid calculation id');
    }
    const owner = await this.patientModel.findById(patientId).lean();
    if (!owner) {
      throw new NotFoundException('Patient not found');
    }
    if (owner.user?.toString() !== userId) {
      throw new ForbiddenException('Not allowed');
    }
    const castCalculationId = new Types.ObjectId(calculationId);
    const currentDoc = await this.energyCalculationModel
      .findOne({ patient: new Types.ObjectId(patientId) })
      .lean();
    if (!currentDoc) {
      throw new NotFoundException('Energy calculation not found for patient');
    }
    const calculationExists = (currentDoc.calculations || []).some((c: any) => {
      const cid =
        c._id instanceof Types.ObjectId ? c._id : new Types.ObjectId(c._id);
      return cid.equals(castCalculationId);
    });
    if (!calculationExists) {
      throw new NotFoundException(
        'Energy calculation item not found for patient',
      );
    }
    const updated = await this.energyCalculationModel
      .findOneAndUpdate(
        { patient: new Types.ObjectId(patientId) },
        { $pull: { calculations: { _id: castCalculationId } } },
        { new: true },
      )
      .lean();
    if (!updated) {
      throw new NotFoundException('Energy calculation not found for patient');
    }
    return {
      id: updated._id.toString(),
      patientId: updated.patient.toString(),
      calculations: updated.calculations,
    };
  }
}
