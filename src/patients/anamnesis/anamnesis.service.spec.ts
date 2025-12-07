import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AnamnesisService } from './anamnesis.service';
import { Anamnesis } from './schemas/anamnesis.schema';
import { Patient } from '../schemas/patient.schema';

describe('AnamnesisService', () => {
  let service: AnamnesisService;
  const mockAnamnesesModel: any = {
    findOneAndUpdate: jest.fn(),
    findOne: jest.fn(),
  };
  const mockPatientModel: any = {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnamnesisService,
        {
          provide: getModelToken(Anamnesis.name),
          useValue: mockAnamnesesModel,
        },
        { provide: getModelToken(Patient.name), useValue: mockPatientModel },
      ],
    }).compile();

    service = module.get<AnamnesisService>(AnamnesisService);
    jest.clearAllMocks();
  });

  it('creates an anamnesis and returns id, patientId and items', async () => {
    const userIdStr = new Types.ObjectId().toString();
    const patientIdStr = new Types.ObjectId().toString();
    const createdDocId = new Types.ObjectId();
    const itemId = new Types.ObjectId();

    const ownerLean = jest.fn().mockResolvedValueOnce({
      _id: new Types.ObjectId(patientIdStr),
      user: new Types.ObjectId(userIdStr),
    });
    mockPatientModel.findById.mockReturnValueOnce({
      lean: ownerLean,
    });
    mockAnamnesesModel.findOneAndUpdate.mockReturnValueOnce({
      lean: jest.fn().mockResolvedValueOnce({
        _id: createdDocId,
        patient: new Types.ObjectId(patientIdStr),
        items: [
          {
            _id: itemId,
            title: 'Anamnese inicial',
            description: 'Anamnesis description',
          },
        ],
      }),
    });
    mockPatientModel.findByIdAndUpdate.mockReturnValueOnce({
      lean: jest.fn().mockResolvedValueOnce({}),
    });

    const result = await service.addItem(patientIdStr, userIdStr, {
      title: 'Anamnese inicial',
      description: 'Anamnesis description',
    });

    const f1Args = mockAnamnesesModel.findOneAndUpdate.mock.calls[0];
    expect(f1Args[0].patient.equals(new Types.ObjectId(patientIdStr))).toBe(
      true,
    );
    expect(
      f1Args[1].$setOnInsert.patient.equals(new Types.ObjectId(patientIdStr)),
    ).toBe(true);

    expect(result.id).toBe(createdDocId.toString());
    expect(Types.ObjectId.isValid(result.patientId)).toBe(true);
    expect(result.patientId).toBe(patientIdStr);
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBe(1);
    expect(result.items[0].title).toBe('Anamnese inicial');
    expect(result.items[0].description).toBe('Anamnesis description');
    const firstItem: any = result.items[0];
    expect(Types.ObjectId.isValid(firstItem._id)).toBe(true);
    expect(mockPatientModel.findById).toHaveBeenCalledWith(patientIdStr);
    expect(mockPatientModel.findByIdAndUpdate).toHaveBeenCalledWith(
      patientIdStr,
      expect.objectContaining({ anamnesis: createdDocId }),
      expect.objectContaining({ new: false }),
    );
  });

  it("fails when patient's user does not match userId", async () => {
    const userIdStr = new Types.ObjectId().toString();
    const patientIdStr = new Types.ObjectId().toString();

    const ownerLean = jest.fn().mockResolvedValueOnce({
      _id: new Types.ObjectId(patientIdStr),
      user: new Types.ObjectId(),
    });
    mockPatientModel.findById.mockReturnValueOnce({ lean: ownerLean });

    await expect(
      service.addItem(patientIdStr, userIdStr, {
        title: 'Anamnese inicial',
        description: 'Anamnesis description',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(mockAnamnesesModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('throws NotFoundException if upsert returns null', async () => {
    const userIdStr = new Types.ObjectId().toString();
    const patientIdStr = new Types.ObjectId().toString();
    const ownerLean = jest.fn().mockResolvedValueOnce({
      _id: new Types.ObjectId(patientIdStr),
      user: new Types.ObjectId(userIdStr),
    });
    mockPatientModel.findById.mockReturnValueOnce({ lean: ownerLean });
    mockAnamnesesModel.findOneAndUpdate.mockReturnValueOnce({
      lean: jest.fn().mockResolvedValueOnce(null),
    });

    await expect(
      service.addItem(patientIdStr, userIdStr, {
        title: 'Anamnese inicial',
        description: 'Anamnesis description',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(mockAnamnesesModel.findOneAndUpdate).toHaveBeenCalledTimes(1);
    const args = mockAnamnesesModel.findOneAndUpdate.mock.calls[0];
    expect(args[0].patient.equals(new Types.ObjectId(patientIdStr))).toBe(true);
    expect(
      args[1].$setOnInsert.patient.equals(new Types.ObjectId(patientIdStr)),
    ).toBe(true);
    expect(args[1].$push.items).toEqual({
      title: 'Anamnese inicial',
      description: 'Anamnesis description',
    });
    expect(args[2]).toEqual({
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    });
    expect(mockPatientModel.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('throws NotFoundException if patient does not exist', async () => {
    const userIdStr = new Types.ObjectId().toString();
    const patientIdStr = new Types.ObjectId().toString();
    mockPatientModel.findById.mockReturnValueOnce({
      lean: jest.fn().mockResolvedValueOnce(null),
    });
    await expect(
      service.addItem(patientIdStr, userIdStr, {
        title: 'Anamnese inicial',
        description: 'Anamnesis description',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(mockAnamnesesModel.findOneAndUpdate).not.toHaveBeenCalled();
  });
});
