jest.mock('bcryptjs', () => ({
  genSalt: jest.fn(() => Promise.resolve('salt')),
  hash: jest.fn(() => Promise.resolve('hashed')),
  compare: jest.fn(),
}));
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { User } from './schemas/user.schema';
import * as bcrypt from 'bcryptjs';
import { ConflictException, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';

describe('UsersService', () => {
  let service: UsersService;
  const mockModel: any = {
    findOne: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    mockModel.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
    });
    mockModel.create.mockResolvedValue({
      _id: new Types.ObjectId(),
      email: 'new@example.com',
      role: 'user',
    });
    (bcrypt.genSalt as jest.Mock).mockResolvedValue('salt');
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getModelToken(User.name), useValue: mockModel },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('creates a user and returns id, email and role', async () => {
    const result = await service.register('new@example.com', 'password');
    expect(Types.ObjectId.isValid(result.id)).toBe(true);
    expect(result.email).toBe('new@example.com');
    expect(result.role).toBe('user');
  });

  it('fails when registering with an existing email', async () => {
    mockModel.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue({ _id: 'exists' }),
    });
    expect.assertions(2);
    await service.register('existing@example.com', 'password').catch((err) => {
      expect(err).toBeInstanceOf(ConflictException);
      const res = err.getResponse?.();
      expect(res.message).toBe('Email already registered');
    });
  });

  it('fails when password is shorter than minimum length', async () => {
    expect.assertions(2);
    await service.register('short@example.com', '1234567').catch((err) => {
      expect(err).toBeInstanceOf(BadRequestException);
      const res = err.getResponse?.();
      expect(res.message).toBe(
        'password must be longer than or equal to 8 characters',
      );
    });
  });
});
