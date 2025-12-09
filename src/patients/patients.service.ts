import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId, Types } from 'mongoose';
import { Patient, PatientDocument } from './schemas/patient.schema';
import { User, UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class PatientsService {
  constructor(
    @InjectModel(Patient.name)
    private readonly patientModel: Model<PatientDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async create(
    userId: string,
    data: {
      fullName: string;
      gender: 'male' | 'female' | 'other';
      birthDate: string;
      phone: string;
      email: string;
    },
  ) {
    if (!isValidObjectId(userId)) {
      throw new BadRequestException('Invalid user id');
    }
    const user = await this.userModel.findById(userId).lean();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const existingByEmail = await this.patientModel
      .findOne({ email: data.email })
      .lean();
    if (existingByEmail) {
      throw new ConflictException('Email already registered');
    }
    const existingByPhone = await this.patientModel
      .findOne({ phone: data.phone })
      .lean();
    if (existingByPhone) {
      throw new ConflictException('Phone already registered');
    }
    const created = await this.patientModel.create({
      user: new Types.ObjectId(userId),
      fullName: data.fullName,
      gender: data.gender,
      birthDate: new Date(data.birthDate),
      phone: data.phone,
      email: data.email,
    });
    return {
      id: created._id.toString(),
      user: userId,
      fullName: created.fullName,
      gender: created.gender,
      birthDate: new Date(created.birthDate).toISOString(),
      phone: created.phone,
      email: created.email,
    };
  }

  async findById(id: string, userId: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid patient id');
    }
    const patient = await this.patientModel.findById(id).lean();
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }
    if (patient.user?.toString() !== userId) {
      throw new NotFoundException('Patient not found');
    }
    return {
      id: patient._id.toString(),
      fullName: patient.fullName,
      gender: patient.gender,
      birthDate: new Date(patient.birthDate).toISOString(),
      phone: patient.phone,
      email: patient.email,
    };
  }

  async update(
    id: string,
    userId: string,
    data: Partial<{
      fullName: string;
      gender: 'male' | 'female' | 'other';
      birthDate: string;
      phone: string;
      email: string;
    }>,
  ) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid patient id');
    }
    const current = await this.patientModel.findById(id).lean();
    if (!current) {
      throw new NotFoundException('Patient not found');
    }
    if (current.user?.toString() !== userId) {
      throw new NotFoundException('Patient not found');
    }

    const updatePayload: Record<string, unknown> = {};
    if (data.fullName !== undefined && current.fullName !== data.fullName) {
      updatePayload.fullName = data.fullName;
    }
    if (data.gender !== undefined && current.gender !== data.gender) {
      updatePayload.gender = data.gender;
    }
    if (data.birthDate !== undefined) {
      const newBirth = new Date(data.birthDate);
      const currBirth = new Date(current.birthDate);
      if (newBirth.getTime() !== currBirth.getTime()) {
        updatePayload.birthDate = newBirth;
      }
    }
    if (data.phone !== undefined && current.phone !== data.phone) {
      const existingByPhone = await this.patientModel
        .findOne({ phone: data.phone, _id: { $ne: id } })
        .lean();
      if (existingByPhone) {
        throw new ConflictException('Phone already registered');
      }
      updatePayload.phone = data.phone;
    }
    if (data.email !== undefined && current.email !== data.email) {
      const existingByEmail = await this.patientModel
        .findOne({ email: data.email, _id: { $ne: id } })
        .lean();
      if (existingByEmail) {
        throw new ConflictException('Email already registered');
      }
      updatePayload.email = data.email;
    }

    if (Object.keys(updatePayload).length === 0) {
      return {
        id: current._id.toString(),
        fullName: current.fullName,
        gender: current.gender,
        birthDate: new Date(current.birthDate).toISOString(),
        phone: current.phone,
        email: current.email,
      };
    }

    const updated = await this.patientModel
      .findByIdAndUpdate(id, updatePayload, { new: true })
      .lean();
    if (!updated) {
      throw new NotFoundException('Patient not found');
    }
    return {
      id: updated._id.toString(),
      fullName: updated.fullName,
      gender: updated.gender,
      birthDate: new Date(updated.birthDate).toISOString(),
      phone: updated.phone,
      email: updated.email,
    };
  }

  async remove(id: string, userId: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid patient id');
    }
    const current = await this.patientModel.findById(id).lean();
    if (!current) {
      throw new NotFoundException('Patient not found');
    }
    if (current.user?.toString() !== userId) {
      throw new NotFoundException('Patient not found');
    }
    await this.patientModel.findByIdAndDelete(id).lean();
    return { deleted: true };
  }

  async list(
    userId: string,
    page = 1,
    pageSize = 10,
    filters?: { name?: string; email?: string },
  ) {
    const p =
      Number.isFinite(Number(page)) && Number(page) > 0 ? Number(page) : 1;
    const size = pageSize;
    const skip = (p - 1) * size;
    const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const query: Record<string, unknown> = { user: new Types.ObjectId(userId) };
    if (filters?.name) {
      query.fullName = { $regex: esc(filters.name), $options: 'i' };
    }
    if (filters?.email) {
      query.email = { $regex: esc(filters.email), $options: 'i' };
    }
    const [items, total] = await Promise.all([
      this.patientModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(size)
        .lean(),
      this.patientModel.countDocuments(query),
    ]);
    return {
      page: p,
      pageSize: size,
      total,
      totalPages: Math.max(1, Math.ceil(total / size)),
      items: items.map((patient) => ({
        id: patient._id.toString(),
        fullName: patient.fullName,
        gender: patient.gender,
        birthDate: new Date(patient.birthDate).toISOString(),
        phone: patient.phone,
        email: patient.email,
      })),
    };
  }
}
