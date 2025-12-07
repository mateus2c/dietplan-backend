import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, isValidObjectId } from 'mongoose';
import { Anamnesis, AnamnesisDocument } from './schemas/anamnesis.schema';
import { Patient, PatientDocument } from '../schemas/patient.schema';

@Injectable()
export class AnamnesisService {
  constructor(
    @InjectModel(Anamnesis.name)
    private readonly anamnesesModel: Model<AnamnesisDocument>,
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
    const doc = await this.anamnesesModel
      .findOne({ patient: new Types.ObjectId(patientId) })
      .lean();
    if (!doc) {
      throw new NotFoundException('Anamnesis not found for patient');
    }
    return {
      id: doc._id.toString(),
      patientId: doc.patient.toString(),
      items: doc.items,
    };
  }

  async addItem(
    patientId: string,
    userId: string,
    item: Anamnesis['items'][number],
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
    const updated = await this.anamnesesModel
      .findOneAndUpdate(
        { patient: new Types.ObjectId(patientId) },
        {
          $setOnInsert: { patient: new Types.ObjectId(patientId) },
          $push: { items: item },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .lean();
    if (!updated) {
      throw new NotFoundException('Failed to create or update anamnesis');
    }
    await this.patientModel
      .findByIdAndUpdate(patientId, { anamnesis: updated._id }, { new: false })
      .lean();
    return {
      id: updated._id.toString(),
      patientId: updated.patient.toString(),
      items: updated.items,
    };
  }

  async patchItemById(
    patientId: string,
    itemId: string,
    userId: string,
    partial: Partial<Anamnesis['items'][number]>,
  ) {
    if (!isValidObjectId(patientId)) {
      throw new BadRequestException('Invalid patient id');
    }
    if (!isValidObjectId(itemId)) {
      throw new BadRequestException('Invalid item id');
    }
    const owner = await this.patientModel.findById(patientId).lean();
    if (!owner) {
      throw new NotFoundException('Patient not found');
    }
    if (owner.user?.toString() !== userId) {
      throw new ForbiddenException('Not allowed');
    }
    const castItemId = new Types.ObjectId(itemId);
    const currentDoc = await this.anamnesesModel
      .findOne({ patient: new Types.ObjectId(patientId) })
      .lean();
    if (!currentDoc) {
      throw new NotFoundException('Anamnesis not found for patient');
    }
    const currentItem = (currentDoc.items || []).find((p: any) => {
      const pid =
        p._id instanceof Types.ObjectId ? p._id : new Types.ObjectId(p._id);
      return pid.equals(castItemId);
    });
    const setPayload: Record<string, unknown> = {};
    if (
      partial.title !== undefined &&
      (!currentItem || currentItem.title !== partial.title)
    ) {
      setPayload['items.$.title'] = partial.title;
    }
    if (
      partial.description !== undefined &&
      (!currentItem || currentItem.description !== partial.description)
    ) {
      setPayload['items.$.description'] = partial.description;
    }
    if (Object.keys(setPayload).length === 0) {
      return {
        id: currentDoc._id.toString(),
        patientId: currentDoc.patient.toString(),
        items: currentDoc.items,
      };
    }
    const updated = await this.anamnesesModel
      .findOneAndUpdate(
        { patient: new Types.ObjectId(patientId), 'items._id': castItemId },
        { $set: setPayload },
        { new: true },
      )
      .lean();
    if (!updated) {
      const doc = currentDoc;
      const normalized = (doc.items ?? []).map((p: any) => ({
        _id: p._id ? new Types.ObjectId(p._id) : new Types.ObjectId(),
        title: p.title,
        description: p.description,
      }));
      await this.anamnesesModel
        .findOneAndUpdate(
          { _id: doc._id },
          { $set: { items: normalized } },
          { new: true },
        )
        .lean();
      const retry = await this.anamnesesModel
        .findOneAndUpdate(
          { _id: doc._id, 'items._id': castItemId },
          { $set: setPayload },
          { new: true },
        )
        .lean();
      if (!retry) {
        throw new NotFoundException('Anamnesis not found for patient');
      }
      return {
        id: retry._id.toString(),
        patientId: retry.patient.toString(),
        items: retry.items,
      };
    }
    return {
      id: updated._id.toString(),
      patientId: updated.patient.toString(),
      items: updated.items,
    };
  }
}
