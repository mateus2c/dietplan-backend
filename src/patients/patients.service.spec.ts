import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { PatientsService } from './patients.service';
import { Patient } from './schemas/patient.schema';
import { User } from '../users/schemas/user.schema';
import { Types } from 'mongoose';
import { ConflictException } from '@nestjs/common';

describe('PatientsService', () => {
  let service: PatientsService;
  let userIdStr: string;
  const mockPatientModel: any = {
    findOne: jest.fn(),
    create: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
  };
  const mockUserModel: any = {
    findById: jest.fn(),
  };

  beforeEach(async () => {
    userIdStr = new Types.ObjectId().toString();
    mockUserModel.findById.mockReturnValue({
      lean: jest
        .fn()
        .mockResolvedValue({ _id: new Types.ObjectId(userIdStr) } as any),
    });
    mockPatientModel.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
    });
    const createdId = new Types.ObjectId();
    const createdUserId = new Types.ObjectId(userIdStr);
    const birthDate = new Date('2000-01-01T00:00:00.000Z');
    mockPatientModel.create.mockResolvedValue({
      _id: createdId,
      user: createdUserId,
      fullName: 'John Doe',
      gender: 'male',
      birthDate,
      phone: '999999999',
      email: 'john.doe@example.com',
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientsService,
        { provide: getModelToken(Patient.name), useValue: mockPatientModel },
        { provide: getModelToken(User.name), useValue: mockUserModel },
      ],
    }).compile();

    service = module.get<PatientsService>(PatientsService);
  });

  it('creates a patient and returns id, user, fullName, gender, birthDate, phone, email', async () => {
    const result = await service.create(userIdStr, {
      fullName: 'John Doe',
      gender: 'male',
      birthDate: '2000-01-01T00:00:00.000Z',
      phone: '999999999',
      email: 'john.doe@example.com',
    });
    expect(Types.ObjectId.isValid(result.id)).toBe(true);
    expect(Types.ObjectId.isValid(result.user)).toBe(true);
    expect(result.user).toBe(userIdStr);
    expect(result.fullName).toBe('John Doe');
    expect(result.gender).toBe('male');
    expect(result.birthDate).toBe('2000-01-01T00:00:00.000Z');
    expect(result.phone).toBe('999999999');
    expect(result.email).toBe('john.doe@example.com');
  });

  it('lists one patient after creation with created id', async () => {
    const createdId = new Types.ObjectId();
    const createdUserId = new Types.ObjectId(userIdStr);
    const birthDate = new Date('2000-01-01T00:00:00.000Z');
    mockPatientModel.create.mockResolvedValue({
      _id: createdId,
      user: createdUserId,
      fullName: 'John Doe',
      gender: 'male',
      birthDate,
      phone: '999999999',
      email: 'john.doe@example.com',
    });
    const created = await service.create(userIdStr, {
      fullName: 'John Doe',
      gender: 'male',
      birthDate: '2000-01-01T00:00:00.000Z',
      phone: '999999999',
      email: 'john.doe@example.com',
    });
    const chain: any = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([
        {
          _id: createdId,
          user: createdUserId,
          fullName: 'John Doe',
          gender: 'male',
          birthDate,
          phone: '999999999',
          email: 'john.doe@example.com',
        },
      ]),
    };
    mockPatientModel.find.mockReturnValue(chain);
    mockPatientModel.countDocuments.mockResolvedValue(1);
    const list = await service.list(userIdStr, 1, 10);
    expect(list.items.length).toBe(1);
    expect(list.items[0].id).toBe(created.id);
  });

  it('lists two patients after creation with created ids', async () => {
    const createdId1 = new Types.ObjectId();
    const createdId2 = new Types.ObjectId();
    const createdUserId = new Types.ObjectId(userIdStr);
    const birthDate = new Date('2000-01-01T00:00:00.000Z');
    mockPatientModel.create
      .mockResolvedValueOnce({
        _id: createdId1,
        user: createdUserId,
        fullName: 'John Doe',
        gender: 'male',
        birthDate,
        phone: '999999999',
        email: 'john.doe1@example.com',
      })
      .mockResolvedValueOnce({
        _id: createdId2,
        user: createdUserId,
        fullName: 'Jane Doe',
        gender: 'female',
        birthDate,
        phone: '888888888',
        email: 'jane.doe@example.com',
      });

    const created1 = await service.create(userIdStr, {
      fullName: 'John Doe',
      gender: 'male',
      birthDate: '2000-01-01T00:00:00.000Z',
      phone: '999999999',
      email: 'john.doe1@example.com',
    });
    const created2 = await service.create(userIdStr, {
      fullName: 'Jane Doe',
      gender: 'female',
      birthDate: '2000-01-01T00:00:00.000Z',
      phone: '888888888',
      email: 'jane.doe@example.com',
    });

    const chainTwo: any = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([
        {
          _id: createdId2,
          user: createdUserId,
          fullName: 'Jane Doe',
          gender: 'female',
          birthDate,
          phone: '888888888',
          email: 'jane.doe@example.com',
        },
        {
          _id: createdId1,
          user: createdUserId,
          fullName: 'John Doe',
          gender: 'male',
          birthDate,
          phone: '999999999',
          email: 'john.doe1@example.com',
        },
      ]),
    };
    mockPatientModel.find.mockReturnValue(chainTwo);
    mockPatientModel.countDocuments.mockResolvedValue(2);
    const listTwo = await service.list(userIdStr, 1, 10);
    expect(listTwo.items.length).toBe(2);
    expect(listTwo.items.map((p: any) => p.id)).toEqual([
      created2.id,
      created1.id,
    ]);
  });

  it('gets patient by id after successful creation', async () => {
    const createdId = new Types.ObjectId();
    const createdUserId = new Types.ObjectId(userIdStr);
    const birthDate = new Date('2000-01-01T00:00:00.000Z');
    mockPatientModel.create.mockResolvedValue({
      _id: createdId,
      user: createdUserId,
      fullName: 'John Doe',
      gender: 'male',
      birthDate,
      phone: '999999999',
      email: 'john.doe@example.com',
    });
    const created = await service.create(userIdStr, {
      fullName: 'John Doe',
      gender: 'male',
      birthDate: '2000-01-01T00:00:00.000Z',
      phone: '999999999',
      email: 'john.doe@example.com',
    });
    mockPatientModel.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: createdId,
        user: createdUserId,
        fullName: 'John Doe',
        gender: 'male',
        birthDate,
        phone: '999999999',
        email: 'john.doe@example.com',
      }),
    });
    const found = await service.findById(created.id, userIdStr);
    expect(found.id).toBe(created.id);
    expect(found.fullName).toBe('John Doe');
    expect(found.gender).toBe('male');
    expect(found.birthDate).toBe('2000-01-01T00:00:00.000Z');
    expect(found.phone).toBe('999999999');
    expect(found.email).toBe('john.doe@example.com');
  });

  it('updates a field after creation and reflects the change', async () => {
    const createdId = new Types.ObjectId();
    const createdUserId = new Types.ObjectId(userIdStr);
    const birthDate = new Date('2000-01-01T00:00:00.000Z');
    mockPatientModel.create.mockResolvedValue({
      _id: createdId,
      user: createdUserId,
      fullName: 'John Doe',
      gender: 'male',
      birthDate,
      phone: '999999999',
      email: 'john.doe@example.com',
    });
    const created = await service.create(userIdStr, {
      fullName: 'John Doe',
      gender: 'male',
      birthDate: '2000-01-01T00:00:00.000Z',
      phone: '999999999',
      email: 'john.doe@example.com',
    });

    mockPatientModel.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: createdId,
        user: createdUserId,
        fullName: 'John Doe',
        gender: 'male',
        birthDate,
        phone: '999999999',
        email: 'john.doe@example.com',
      }),
    });
    mockPatientModel.findByIdAndUpdate.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: createdId,
        user: createdUserId,
        fullName: 'John Updated',
        gender: 'male',
        birthDate,
        phone: '999999999',
        email: 'john.doe@example.com',
      }),
    });

    const updated = await service.update(created.id, userIdStr, {
      fullName: 'John Updated',
    });
    expect(updated.id).toBe(created.id);
    expect(updated.fullName).toBe('John Updated');
    expect(updated.gender).toBe('male');
    expect(updated.birthDate).toBe('2000-01-01T00:00:00.000Z');
    expect(updated.phone).toBe('999999999');
    expect(updated.email).toBe('john.doe@example.com');
  });

  it('deletes a patient and list returns empty', async () => {
    const createdId = new Types.ObjectId();
    const createdUserId = new Types.ObjectId(userIdStr);
    const birthDate = new Date('2000-01-01T00:00:00.000Z');
    mockPatientModel.create.mockResolvedValue({
      _id: createdId,
      user: createdUserId,
      fullName: 'John Doe',
      gender: 'male',
      birthDate,
      phone: '999999999',
      email: 'john.doe@example.com',
    });
    const created = await service.create(userIdStr, {
      fullName: 'John Doe',
      gender: 'male',
      birthDate: '2000-01-01T00:00:00.000Z',
      phone: '999999999',
      email: 'john.doe@example.com',
    });
    mockPatientModel.findByIdAndDelete.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: createdId,
        user: createdUserId,
        fullName: 'John Doe',
        gender: 'male',
        birthDate,
        phone: '999999999',
        email: 'john.doe@example.com',
      }),
    });
    const removed = await service.remove(created.id, userIdStr);
    expect(removed.deleted).toBe(true);
    const chainEmpty: any = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    };
    mockPatientModel.find.mockReturnValue(chainEmpty);
    mockPatientModel.countDocuments.mockResolvedValue(0);
    const listEmpty = await service.list(userIdStr, 1, 10);
    expect(listEmpty.items.length).toBe(0);
    expect(listEmpty.total).toBe(0);
  });

  it('fails when creating with an existing email', async () => {
    mockPatientModel.findOne.mockReturnValueOnce({
      lean: jest.fn().mockResolvedValue({ _id: new Types.ObjectId() }),
    });
    expect.assertions(2);
    await service
      .create(userIdStr, {
        fullName: 'John Doe',
        gender: 'male',
        birthDate: '2000-01-01T00:00:00.000Z',
        phone: '999999999',
        email: 'john.doe@example.com',
      })
      .catch((err) => {
        expect(err).toBeInstanceOf(ConflictException);
        const res = err.getResponse?.();
        expect(res.message).toBe('Email already registered');
      });
  });

  it('fails when creating with an existing phone', async () => {
    mockPatientModel.findOne
      .mockReturnValueOnce({ lean: jest.fn().mockResolvedValue(null) })
      .mockReturnValueOnce({
        lean: jest.fn().mockResolvedValue({ _id: new Types.ObjectId() }),
      });
    expect.assertions(2);
    await service
      .create(userIdStr, {
        fullName: 'John Doe',
        gender: 'male',
        birthDate: '2000-01-01T00:00:00.000Z',
        phone: '999999999',
        email: 'john.doe@example.com',
      })
      .catch((err) => {
        expect(err).toBeInstanceOf(ConflictException);
        const res = err.getResponse?.();
        expect(res.message).toBe('Phone already registered');
      });
  });
});
