import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId, Types } from 'mongoose';
import { MealPlans, MealPlansDocument } from './schemas/meal-plans.schema';
import { Patient, PatientDocument } from '../schemas/patient.schema';

@Injectable()
export class MealPlansService {
  constructor(
    @InjectModel(MealPlans.name)
    private readonly mealPlansModel: Model<MealPlansDocument>,
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
    const doc = await this.mealPlansModel
      .findOne({ patient: patientId })
      .lean();
    if (!doc) {
      throw new NotFoundException('Meal plans not found for patient');
    }
    return {
      id: doc._id.toString(),
      patientId: doc.patient.toString(),
      plans: doc.plans,
    };
  }

  async addPlan(
    patientId: string,
    userId: string,
    plan: MealPlans['plans'][number],
  ) {
    if (!isValidObjectId(patientId)) {
      throw new BadRequestException('Invalid patient id');
    }
    const owner = await this.patientModel.findById(patientId).lean();
    if (!owner || owner.user?.toString() !== userId) {
      throw new ForbiddenException('Not allowed');
    }
    const updated = await this.mealPlansModel
      .findOneAndUpdate(
        { patient: patientId },
        { $setOnInsert: { patient: patientId }, $push: { plans: plan } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .lean();
    await this.patientModel
      .findByIdAndUpdate(patientId, { mealPlans: updated._id }, { new: false })
      .lean();
    return {
      id: updated._id.toString(),
      patientId: updated.patient.toString(),
      plans: updated.plans,
    };
  }

  async patchPlanById(
    patientId: string,
    planId: string,
    userId: string,
    partial: Partial<MealPlans['plans'][number]>,
  ) {
    if (!isValidObjectId(patientId)) {
      throw new BadRequestException('Invalid patient id');
    }
    if (!isValidObjectId(planId)) {
      throw new BadRequestException('Invalid plan id');
    }
    const owner = await this.patientModel.findById(patientId).lean();
    if (!owner || owner.user?.toString() !== userId) {
      throw new ForbiddenException('Not allowed');
    }
    const castPlanId = new Types.ObjectId(planId);
    const currentDoc = await this.mealPlansModel
      .findOne({ patient: patientId })
      .lean();
    if (!currentDoc) {
      throw new NotFoundException('Meal plans not found for patient');
    }
    const currentPlan = (currentDoc.plans || []).find((p: any) => {
      const pid =
        p._id instanceof Types.ObjectId ? p._id : new Types.ObjectId(p._id);
      return pid.equals(castPlanId);
    });
    const setPayload: Record<string, unknown> = {};
    if (
      partial.title !== undefined &&
      (!currentPlan || currentPlan.title !== partial.title)
    ) {
      setPayload['plans.$.title'] = partial.title;
    }
    if (
      partial.meals !== undefined &&
      (!currentPlan ||
        JSON.stringify(currentPlan.meals ?? []) !==
          JSON.stringify(partial.meals ?? []))
    ) {
      setPayload['plans.$.meals'] = partial.meals;
    }
    if (Object.keys(setPayload).length === 0) {
      return {
        id: currentDoc._id.toString(),
        patientId: currentDoc.patient.toString(),
        plans: currentDoc.plans,
      };
    }
    const updated = await this.mealPlansModel
      .findOneAndUpdate(
        { patient: patientId, 'plans._id': castPlanId },
        { $set: setPayload },
        { new: true },
      )
      .lean();
    if (!updated) {
      const doc = currentDoc;
      const normalizedPlans = (doc.plans ?? []).map((p: any) => ({
        _id: p._id ? new Types.ObjectId(p._id) : new Types.ObjectId(),
        title: p.title,
        meals: p.meals,
      }));
      await this.mealPlansModel
        .findOneAndUpdate(
          { _id: doc._id },
          { $set: { plans: normalizedPlans } },
          { new: true },
        )
        .lean();
      const retry = await this.mealPlansModel
        .findOneAndUpdate(
          { _id: doc._id, 'plans._id': castPlanId },
          { $set: setPayload },
          { new: true },
        )
        .lean();
      if (!retry) {
        throw new NotFoundException('Diet plan not found for patient');
      }
      return {
        id: retry._id.toString(),
        patientId: retry.patient.toString(),
        plans: retry.plans,
      };
    }
    return {
      id: updated._id.toString(),
      patientId: updated.patient.toString(),
      plans: updated.plans,
    };
  }

  async deletePlanById(patientId: string, planId: string, userId: string) {
    if (!isValidObjectId(patientId)) {
      throw new BadRequestException('Invalid patient id');
    }
    if (!isValidObjectId(planId)) {
      throw new BadRequestException('Invalid plan id');
    }
    const owner = await this.patientModel.findById(patientId).lean();
    if (!owner || owner.user?.toString() !== userId) {
      throw new ForbiddenException('Not allowed');
    }
    const castPlanId = new Types.ObjectId(planId);
    const currentDoc = await this.mealPlansModel
      .findOne({ patient: patientId })
      .lean();
    if (!currentDoc) {
      throw new NotFoundException('Meal plans not found for patient');
    }
    const planExists = (currentDoc.plans || []).some((p: any) => {
      const pid =
        p._id instanceof Types.ObjectId ? p._id : new Types.ObjectId(p._id);
      return pid.equals(castPlanId);
    });
    if (!planExists) {
      throw new NotFoundException('Diet plan not found for patient');
    }
    const updated = await this.mealPlansModel
      .findOneAndUpdate(
        { patient: patientId },
        { $pull: { plans: { _id: castPlanId } } },
        { new: true },
      )
      .lean();
    if (!updated) {
      throw new NotFoundException('Meal plans not found for patient');
    }
    return {
      id: updated._id.toString(),
      patientId: updated.patient.toString(),
      plans: updated.plans,
    };
  }
}
