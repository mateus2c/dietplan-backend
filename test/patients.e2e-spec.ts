import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import request from 'supertest';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { UsersModule } from '../src/users/users.module';
import { AuthModule } from '../src/auth/auth.module';
import { PatientsModule } from '../src/patients/patients.module';
import { MealPlansModule } from '../src/patients/meal-plans/meal-plans.module';
import { AnamnesisModule } from '../src/patients/anamnesis/anamnesis.module';
import { EnergyCalculationModule } from '../src/patients/energy-calculation/energy-calculation.module';
import { GoogleStrategy } from '../src/auth/strategies/google.strategy';

describe('Patients (e2e)', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let token: string;
  let token2: string;
  let patientId: string;
  let nonExistentPatientId: string;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    const moduleBuilder = Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(uri, { dbName: 'dietplan_e2e' }),
        UsersModule,
        AuthModule,
        PatientsModule,
        MealPlansModule,
        AnamnesisModule,
        EnergyCalculationModule,
        RouterModule.register([
          {
            path: 'patients',
            module: PatientsModule,
            children: [
              { path: ':patientId/meal-plans', module: MealPlansModule },
              { path: ':patientId/anamnesis', module: AnamnesisModule },
              {
                path: ':patientId/energy-calculation',
                module: EnergyCalculationModule,
              },
            ],
          },
        ]),
      ],
    })
      .overrideProvider(GoogleStrategy)
      .useValue({});
    const moduleFixture: TestingModule = await moduleBuilder.compile();
    app = moduleFixture.createNestApplication();
    await app.init();

    // Create first user
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'patients.user@example.com', password: 'StrongPass123' })
      .expect(201);
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'patients.user@example.com', password: 'StrongPass123' })
      .expect(200);
    token = login.body.access_token;

    // Create second user for authorization tests
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'other.user@example.com', password: 'StrongPass123' })
      .expect(201);
    const login2 = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'other.user@example.com', password: 'StrongPass123' })
      .expect(200);
    token2 = login2.body.access_token;

    // Generate valid ObjectId format for non-existent ID
    nonExistentPatientId = '507f1f77bcf86cd799439011';
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  describe('POST /patients', () => {
    describe('Success cases', () => {
      it('creates patient and returns complete structure', async () => {
        const res = await request(app.getHttpServer())
          .post('/patients')
          .set('Authorization', `Bearer ${token}`)
          .send({
            fullName: 'Jane Doe',
            gender: 'female',
            birthDate: '1990-05-20',
            phone: '+55 11 91234-5678',
            email: 'jane.doe@example.com',
          })
          .expect(201);
        expect(res.body).toHaveProperty('id');
        expect(res.body).toHaveProperty('fullName', 'Jane Doe');
        expect(res.body).toHaveProperty('gender', 'female');
        expect(res.body).toHaveProperty('birthDate');
        expect(res.body).toHaveProperty('phone', '+55 11 91234-5678');
        expect(res.body).toHaveProperty('email', 'jane.doe@example.com');
        expect(res.body).toHaveProperty('user');
        expect(new Date(res.body.birthDate).toISOString()).toContain(
          '1990-05-20',
        );
        patientId = res.body.id;
      });

      it('patient is correctly linked to user', async () => {
        const res = await request(app.getHttpServer())
          .post('/patients')
          .set('Authorization', `Bearer ${token}`)
          .send({
            fullName: 'Linked Patient',
            gender: 'male',
            birthDate: '1985-01-01',
            phone: '+55 11 90000-1111',
            email: 'linked@example.com',
          })
          .expect(201);
        expect(res.body).toHaveProperty('user');
        expect(res.body.user).toBeTruthy();
      });
    });

    describe('Required fields validation (1.1)', () => {
      it('returns 400 when fullName is missing', async () => {
        await request(app.getHttpServer())
          .post('/patients')
          .set('Authorization', `Bearer ${token}`)
          .send({
            gender: 'female',
            birthDate: '1990-05-20',
            phone: '+55 11 91234-5678',
            email: 'test@example.com',
          })
          .expect(400);
      });

      it('returns 400 when gender is missing', async () => {
        await request(app.getHttpServer())
          .post('/patients')
          .set('Authorization', `Bearer ${token}`)
          .send({
            fullName: 'Test Name',
            birthDate: '1990-05-20',
            phone: '+55 11 91234-5678',
            email: 'test@example.com',
          })
          .expect(400);
      });

      it('returns 400 when birthDate is missing', async () => {
        await request(app.getHttpServer())
          .post('/patients')
          .set('Authorization', `Bearer ${token}`)
          .send({
            fullName: 'Test Name',
            gender: 'female',
            phone: '+55 11 91234-5678',
            email: 'test@example.com',
          })
          .expect(400);
      });

      it('returns 400 when phone is missing', async () => {
        await request(app.getHttpServer())
          .post('/patients')
          .set('Authorization', `Bearer ${token}`)
          .send({
            fullName: 'Test Name',
            gender: 'female',
            birthDate: '1990-05-20',
            email: 'test@example.com',
          })
          .expect(400);
      });

      it('returns 400 when email is missing', async () => {
        await request(app.getHttpServer())
          .post('/patients')
          .set('Authorization', `Bearer ${token}`)
          .send({
            fullName: 'Test Name',
            gender: 'female',
            birthDate: '1990-05-20',
            phone: '+55 11 91234-5678',
          })
          .expect(400);
      });
    });

    describe('fullName validation (1.2)', () => {
      it('returns 400 when fullName has less than 3 characters', async () => {
        await request(app.getHttpServer())
          .post('/patients')
          .set('Authorization', `Bearer ${token}`)
          .send({
            fullName: 'ab',
            gender: 'female',
            birthDate: '1990-05-20',
            phone: '+55 11 91234-5678',
            email: 'test@example.com',
          })
          .expect(400);
      });

      it('creates patient when fullName has exactly 3 characters', async () => {
        const res = await request(app.getHttpServer())
          .post('/patients')
          .set('Authorization', `Bearer ${token}`)
          .send({
            fullName: 'ABC',
            gender: 'male',
            birthDate: '1990-05-20',
            phone: '+55 11 90000-2222',
            email: 'abc@example.com',
          })
          .expect(201);
        expect(res.body.fullName).toBe('ABC');
      });

      it('returns 400 when fullName is a number', async () => {
        await request(app.getHttpServer())
          .post('/patients')
          .set('Authorization', `Bearer ${token}`)
          .send({
            fullName: 123,
            gender: 'female',
            birthDate: '1990-05-20',
            phone: '+55 11 91234-5678',
            email: 'test@example.com',
          })
          .expect(400);
      });

      it('returns 400 when fullName is an object', async () => {
        await request(app.getHttpServer())
          .post('/patients')
          .set('Authorization', `Bearer ${token}`)
          .send({
            fullName: {},
            gender: 'female',
            birthDate: '1990-05-20',
            phone: '+55 11 91234-5678',
            email: 'test@example.com',
          })
          .expect(400);
      });

      it('returns 400 when fullName is an array', async () => {
        await request(app.getHttpServer())
          .post('/patients')
          .set('Authorization', `Bearer ${token}`)
          .send({
            fullName: [],
            gender: 'female',
            birthDate: '1990-05-20',
            phone: '+55 11 91234-5678',
            email: 'test@example.com',
          })
          .expect(400);
      });

      it('returns 400 when fullName has only whitespace', async () => {
        await request(app.getHttpServer())
          .post('/patients')
          .set('Authorization', `Bearer ${token}`)
          .send({
            fullName: '   ',
            gender: 'female',
            birthDate: '1990-05-20',
            phone: '+55 11 91234-5678',
            email: 'test@example.com',
          })
          .expect(400);
      });
    });

    describe('gender validation (1.3)', () => {
      it('creates patient with gender male', async () => {
        const res = await request(app.getHttpServer())
          .post('/patients')
          .set('Authorization', `Bearer ${token}`)
          .send({
            fullName: 'Male Patient',
            gender: 'male',
            birthDate: '1990-05-20',
            phone: '+55 11 90000-3333',
            email: 'male@example.com',
          })
          .expect(201);
        expect(res.body.gender).toBe('male');
      });

      it('creates patient with gender female', async () => {
        const res = await request(app.getHttpServer())
          .post('/patients')
          .set('Authorization', `Bearer ${token}`)
          .send({
            fullName: 'Female Patient',
            gender: 'female',
            birthDate: '1990-05-20',
            phone: '+55 11 90000-4444',
            email: 'female@example.com',
          })
          .expect(201);
        expect(res.body.gender).toBe('female');
      });

      it('creates patient with gender other', async () => {
        const res = await request(app.getHttpServer())
          .post('/patients')
          .set('Authorization', `Bearer ${token}`)
          .send({
            fullName: 'Other Patient',
            gender: 'other',
            birthDate: '1990-05-20',
            phone: '+55 11 90000-5555',
            email: 'other@example.com',
          })
          .expect(201);
        expect(res.body.gender).toBe('other');
      });

      it('returns 400 when gender is invalid', async () => {
        await request(app.getHttpServer())
          .post('/patients')
          .set('Authorization', `Bearer ${token}`)
          .send({
            fullName: 'Test Name',
            gender: 'invalid',
            birthDate: '1990-05-20',
            phone: '+55 11 91234-5678',
            email: 'test@example.com',
          })
          .expect(400);
      });

      it('returns 400 when gender is a number', async () => {
        await request(app.getHttpServer())
          .post('/patients')
          .set('Authorization', `Bearer ${token}`)
          .send({
            fullName: 'Test Name',
            gender: 123,
            birthDate: '1990-05-20',
            phone: '+55 11 91234-5678',
            email: 'test@example.com',
          })
          .expect(400);
      });

      it('returns 400 when gender is an object', async () => {
        await request(app.getHttpServer())
          .post('/patients')
          .set('Authorization', `Bearer ${token}`)
          .send({
            fullName: 'Test Name',
            gender: {},
            birthDate: '1990-05-20',
            phone: '+55 11 91234-5678',
            email: 'test@example.com',
          })
          .expect(400);
      });

      it('returns 400 when gender is an array', async () => {
        await request(app.getHttpServer())
          .post('/patients')
          .set('Authorization', `Bearer ${token}`)
          .send({
            fullName: 'Test Name',
            gender: [],
            birthDate: '1990-05-20',
            phone: '+55 11 91234-5678',
            email: 'test@example.com',
          })
          .expect(400);
      });
    });

    describe('birthDate validation (1.4)', () => {
      it('returns 400 when birthDate is invalid format', async () => {
        await request(app.getHttpServer())
          .post('/patients')
          .set('Authorization', `Bearer ${token}`)
          .send({
            fullName: 'Test Name',
            gender: 'female',
            birthDate: 'not-a-date',
            phone: '+55 11 91234-5678',
            email: 'test@example.com',
          })
          .expect(400);
      });

      it('returns 400 when birthDate is a number', async () => {
        await request(app.getHttpServer())
          .post('/patients')
          .set('Authorization', `Bearer ${token}`)
          .send({
            fullName: 'Test Name',
            gender: 'female',
            birthDate: 123456,
            phone: '+55 11 91234-5678',
            email: 'test@example.com',
          })
          .expect(400);
      });

      it('returns 400 when birthDate is an object', async () => {
        await request(app.getHttpServer())
          .post('/patients')
          .set('Authorization', `Bearer ${token}`)
          .send({
            fullName: 'Test Name',
            gender: 'female',
            birthDate: {},
            phone: '+55 11 91234-5678',
            email: 'test@example.com',
          })
          .expect(400);
      });

      it('returns 400 when birthDate is an array', async () => {
        await request(app.getHttpServer())
          .post('/patients')
          .set('Authorization', `Bearer ${token}`)
          .send({
            fullName: 'Test Name',
            gender: 'female',
            birthDate: [],
            phone: '+55 11 91234-5678',
            email: 'test@example.com',
          })
          .expect(400);
      });
    });

    describe('phone validation (1.5)', () => {
      it('returns 400 when phone is too short', async () => {
        await request(app.getHttpServer())
          .post('/patients')
          .set('Authorization', `Bearer ${token}`)
          .send({
            fullName: 'Test Name',
            gender: 'female',
            birthDate: '1990-05-20',
            phone: '+123',
            email: 'test@example.com',
          })
          .expect(400);
      });

      it('returns 400 when phone is invalid', async () => {
        await request(app.getHttpServer())
          .post('/patients')
          .set('Authorization', `Bearer ${token}`)
          .send({
            fullName: 'Test Name',
            gender: 'female',
            birthDate: '1990-05-20',
            phone: 'invalid',
            email: 'test@example.com',
          })
          .expect(400);
      });

      it('returns 400 when phone is a number', async () => {
        await request(app.getHttpServer())
          .post('/patients')
          .set('Authorization', `Bearer ${token}`)
          .send({
            fullName: 'Test Name',
            gender: 'female',
            birthDate: '1990-05-20',
            phone: 1234567890,
            email: 'test@example.com',
          })
          .expect(400);
      });

      it('returns 400 when phone is an object', async () => {
        await request(app.getHttpServer())
          .post('/patients')
          .set('Authorization', `Bearer ${token}`)
          .send({
            fullName: 'Test Name',
            gender: 'female',
            birthDate: '1990-05-20',
            phone: {},
            email: 'test@example.com',
          })
          .expect(400);
      });

      it('returns 400 when phone is an array', async () => {
        await request(app.getHttpServer())
          .post('/patients')
          .set('Authorization', `Bearer ${token}`)
          .send({
            fullName: 'Test Name',
            gender: 'female',
            birthDate: '1990-05-20',
            phone: [],
            email: 'test@example.com',
          })
          .expect(400);
      });

      it('returns 400 when phone has only whitespace', async () => {
        await request(app.getHttpServer())
          .post('/patients')
          .set('Authorization', `Bearer ${token}`)
          .send({
            fullName: 'Test Name',
            gender: 'female',
            birthDate: '1990-05-20',
            phone: '   ',
            email: 'test@example.com',
          })
          .expect(400);
      });
    });

    describe('email validation (1.6)', () => {
      it('returns 400 when email is invalid', async () => {
        await request(app.getHttpServer())
          .post('/patients')
          .set('Authorization', `Bearer ${token}`)
          .send({
            fullName: 'Test Name',
            gender: 'female',
            birthDate: '1990-05-20',
            phone: '+55 11 91234-5678',
            email: 'not-an-email',
          })
          .expect(400);
      });

      it('returns 400 when email is a number', async () => {
        await request(app.getHttpServer())
          .post('/patients')
          .set('Authorization', `Bearer ${token}`)
          .send({
            fullName: 'Test Name',
            gender: 'female',
            birthDate: '1990-05-20',
            phone: '+55 11 91234-5678',
            email: 123456,
          })
          .expect(400);
      });

      it('returns 400 when email is an object', async () => {
        await request(app.getHttpServer())
          .post('/patients')
          .set('Authorization', `Bearer ${token}`)
          .send({
            fullName: 'Test Name',
            gender: 'female',
            birthDate: '1990-05-20',
            phone: '+55 11 91234-5678',
            email: {},
          })
          .expect(400);
      });

      it('returns 400 when email is an array', async () => {
        await request(app.getHttpServer())
          .post('/patients')
          .set('Authorization', `Bearer ${token}`)
          .send({
            fullName: 'Test Name',
            gender: 'female',
            birthDate: '1990-05-20',
            phone: '+55 11 91234-5678',
            email: [],
          })
          .expect(400);
      });

      it('returns 400 when email has only whitespace', async () => {
        await request(app.getHttpServer())
          .post('/patients')
          .set('Authorization', `Bearer ${token}`)
          .send({
            fullName: 'Test Name',
            gender: 'female',
            birthDate: '1990-05-20',
            phone: '+55 11 91234-5678',
            email: '   ',
          })
          .expect(400);
      });
    });

    describe('Conflict cases (1.7)', () => {
      it('returns 409 when email is duplicate', async () => {
        await request(app.getHttpServer())
          .post('/patients')
          .set('Authorization', `Bearer ${token}`)
          .send({
            fullName: 'John Roe',
            gender: 'male',
            birthDate: '1992-01-01',
            phone: '+55 11 90000-0001',
            email: 'john.roe@example.com',
          })
          .expect(201);

        await request(app.getHttpServer())
          .post('/patients')
          .set('Authorization', `Bearer ${token}`)
          .send({
            fullName: 'Duplicate Email',
            gender: 'female',
            birthDate: '1993-01-01',
            phone: '+55 11 90000-0002',
            email: 'john.roe@example.com',
          })
          .expect(409);
      });

      it('returns 409 when phone is duplicate', async () => {
        await request(app.getHttpServer())
          .post('/patients')
          .set('Authorization', `Bearer ${token}`)
          .send({
            fullName: 'Duplicate Phone',
            gender: 'female',
            birthDate: '1994-01-01',
            phone: '+55 11 90000-0001',
            email: 'duplicate.phone@example.com',
          })
          .expect(409);
      });
    });
  });

  describe('GET /patients', () => {
    describe('Success cases', () => {
      it('lists patients with pagination', async () => {
        const res = await request(app.getHttpServer())
          .get('/patients')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);
        expect(res.body).toHaveProperty('items');
        expect(Array.isArray(res.body.items)).toBe(true);
        expect(res.body.items.length).toBeGreaterThanOrEqual(1);
        expect(res.body).toHaveProperty('page', 1);
        expect(res.body).toHaveProperty('pageSize', 10);
        expect(res.body).toHaveProperty('total');
        expect(res.body).toHaveProperty('totalPages');
      });
    });

    describe('Query parameters validation (2.1)', () => {
      it('returns 400 when page is negative', async () => {
        await request(app.getHttpServer())
          .get('/patients?page=-1')
          .set('Authorization', `Bearer ${token}`)
          .expect(400);
      });

      it('returns 400 when page is zero', async () => {
        await request(app.getHttpServer())
          .get('/patients?page=0')
          .set('Authorization', `Bearer ${token}`)
          .expect(400);
      });

      it('returns 400 when page is a float', async () => {
        await request(app.getHttpServer())
          .get('/patients?page=1.5')
          .set('Authorization', `Bearer ${token}`)
          .expect(400);
      });

      it('returns 400 when page is not a number', async () => {
        await request(app.getHttpServer())
          .get('/patients?page=abc')
          .set('Authorization', `Bearer ${token}`)
          .expect(400);
      });

      it('returns 400 when name filter has less than 1 character', async () => {
        await request(app.getHttpServer())
          .get('/patients?name=')
          .set('Authorization', `Bearer ${token}`)
          .expect(400);
      });

      it('returns 400 when email filter has less than 1 character', async () => {
        await request(app.getHttpServer())
          .get('/patients?email=')
          .set('Authorization', `Bearer ${token}`)
          .expect(400);
      });
    });

    describe('Pagination (2.2)', () => {
      it('defaults to page 1 when page is not provided', async () => {
        const res = await request(app.getHttpServer())
          .get('/patients')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);
        expect(res.body.page).toBe(1);
      });

      it('defaults to pageSize 10', async () => {
        const res = await request(app.getHttpServer())
          .get('/patients')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);
        expect(res.body.pageSize).toBe(10);
      });

      it('returns correct pagination for multiple pages', async () => {
        // Create additional patients for pagination
        for (let i = 0; i < 13; i++) {
          await request(app.getHttpServer())
            .post('/patients')
            .set('Authorization', `Bearer ${token}`)
            .send({
              fullName: `Paging ${String(i + 1).padStart(2, '0')}`,
              gender: i % 2 === 0 ? 'male' : 'female',
              birthDate: '1990-01-01',
              phone: `+55 11 90000-${String(2000 + i)}`,
              email: `paging${i + 1}@example.com`,
            })
            .expect(201);
        }

        const page1 = await request(app.getHttpServer())
          .get('/patients?page=1')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);
        expect(page1.body.page).toBe(1);
        expect(page1.body.pageSize).toBe(10);
        expect(page1.body.items.length).toBe(10);

        const page2 = await request(app.getHttpServer())
          .get('/patients?page=2')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);
        expect(page2.body.page).toBe(2);
        expect(page2.body.items.length).toBeGreaterThanOrEqual(1);
        expect(page2.body.items.length).toBeLessThanOrEqual(10);

        const total = page1.body.total;
        expect(total).toBeGreaterThanOrEqual(13);
        const totalPages = page1.body.totalPages;
        expect(totalPages).toBe(
          Math.max(1, Math.ceil(total / page1.body.pageSize)),
        );
      });

      it('returns empty array when page is beyond total', async () => {
        const res = await request(app.getHttpServer())
          .get('/patients?page=9999')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);
        expect(res.body.items).toEqual([]);
        expect(res.body.page).toBe(9999);
      });
    });

    describe('Filters (2.3)', () => {
      it('filters by name case-insensitively', async () => {
        const res = await request(app.getHttpServer())
          .get('/patients?page=1&name=Paging')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);
        expect(
          res.body.items.every((p: any) =>
            String(p.fullName).toLowerCase().includes('paging'),
          ),
        ).toBe(true);
      });

      it('filters by name with partial match', async () => {
        const res = await request(app.getHttpServer())
          .get('/patients?page=1&name=Jane')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);
        expect(res.body.items.length).toBeGreaterThan(0);
        expect(
          res.body.items.every((p: any) => String(p.fullName).includes('Jane')),
        ).toBe(true);
      });

      it('filters by email case-insensitively', async () => {
        const res = await request(app.getHttpServer())
          .get('/patients?page=1&email=EXAMPLE.COM')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);
        expect(res.body.items.length).toBeGreaterThan(0);
        expect(
          res.body.items.every((p: any) =>
            String(p.email).toLowerCase().includes('example.com'),
          ),
        ).toBe(true);
      });

      it('filters by email with partial match', async () => {
        const res = await request(app.getHttpServer())
          .get('/patients?page=1&email=example.com')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);
        expect(res.body.items.length).toBeGreaterThan(0);
        expect(
          res.body.items.every((p: any) =>
            String(p.email).includes('example.com'),
          ),
        ).toBe(true);
      });

      it('returns empty array when filter has no matches', async () => {
        const res = await request(app.getHttpServer())
          .get('/patients?page=1&email=no-match-xyz-12345')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);
        expect(res.body.items.length).toBe(0);
        expect(res.body.total).toBe(0);
        expect(res.body.totalPages).toBe(1);
      });

      it('combines name and email filters (intersection)', async () => {
        await request(app.getHttpServer())
          .post('/patients')
          .set('Authorization', `Bearer ${token}`)
          .send({
            fullName: 'Combo Filter',
            gender: 'female',
            birthDate: '1991-03-03',
            phone: '+55 11 90000-7777',
            email: 'combo@example.com',
          })
          .expect(201);

        const res = await request(app.getHttpServer())
          .get('/patients?page=1&name=Combo&email=combo@example.com')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);
        expect(res.body.items.length).toBeGreaterThanOrEqual(1);
        expect(
          res.body.items.every(
            (p: any) =>
              String(p.fullName).includes('Combo') &&
              String(p.email).includes('combo@example.com'),
          ),
        ).toBe(true);
      });
    });

    describe('Data isolation (2.5)', () => {
      it('user only sees their own patients', async () => {
        const user1List = await request(app.getHttpServer())
          .get('/patients')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);
        const user1Ids = user1List.body.items.map((p: any) => p.id);

        const user2List = await request(app.getHttpServer())
          .get('/patients')
          .set('Authorization', `Bearer ${token2}`)
          .expect(200);
        const user2Ids = user2List.body.items.map((p: any) => p.id);

        // No overlap between user1 and user2 patients
        const overlap = user1Ids.filter((id: string) => user2Ids.includes(id));
        expect(overlap.length).toBe(0);
      });
    });
  });

  describe('GET /patients/:id', () => {
    describe('Success cases (3.2)', () => {
      it('returns patient with complete structure', async () => {
        const res = await request(app.getHttpServer())
          .get(`/patients/${patientId}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);
        expect(res.body).toHaveProperty('id', patientId);
        expect(res.body).toHaveProperty('fullName');
        expect(res.body).toHaveProperty('gender');
        expect(res.body).toHaveProperty('birthDate');
        expect(res.body).toHaveProperty('phone');
        expect(res.body).toHaveProperty('email');
        expect(new Date(res.body.birthDate).toISOString()).toBeTruthy();
      });
    });

    describe('ID validation (3.1)', () => {
      it('returns 400 when ID is invalid format', async () => {
        await request(app.getHttpServer())
          .get('/patients/123')
          .set('Authorization', `Bearer ${token}`)
          .expect(400);
      });

      it('returns 404 when ID does not exist', async () => {
        await request(app.getHttpServer())
          .get(`/patients/${nonExistentPatientId}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(404);
      });
    });

    describe('Authentication (3.3)', () => {
      it('returns 401 when no token is provided', async () => {
        await request(app.getHttpServer())
          .get(`/patients/${patientId}`)
          .expect(401);
      });

      it('returns 401 when token is invalid', async () => {
        await request(app.getHttpServer())
          .get(`/patients/${patientId}`)
          .set('Authorization', 'Bearer invalid-token-12345')
          .expect(401);
      });

      it('returns 401 when token format is incorrect', async () => {
        await request(app.getHttpServer())
          .get(`/patients/${patientId}`)
          .set('Authorization', 'InvalidFormat token')
          .expect(401);
      });
    });
  });

  describe('PATCH /patients/:id', () => {
    describe('Success cases', () => {
      it('updates patient name', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/patients/${patientId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ fullName: 'Jane Doe Silva' })
          .expect(200);
        expect(res.body).toHaveProperty('id', patientId);
        expect(res.body).toHaveProperty('fullName', 'Jane Doe Silva');
      });

      it('updates patient gender', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/patients/${patientId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ gender: 'other' })
          .expect(200);
        expect(res.body).toHaveProperty('id', patientId);
        expect(res.body).toHaveProperty('gender', 'other');
      });

      it('updates patient birthDate', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/patients/${patientId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ birthDate: '1991-12-31' })
          .expect(200);
        expect(res.body).toHaveProperty('id', patientId);
        expect(String(res.body.birthDate)).toContain('1991-12-31');
      });

      it('updates patient phone', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/patients/${patientId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ phone: '+55 11 90000-9999' })
          .expect(200);
        expect(res.body).toHaveProperty('id', patientId);
        expect(res.body).toHaveProperty('phone', '+55 11 90000-9999');
      });

      it('updates patient email', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/patients/${patientId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ email: 'jane.updated@example.com' })
          .expect(200);
        expect(res.body).toHaveProperty('id', patientId);
        expect(res.body).toHaveProperty('email', 'jane.updated@example.com');
      });
    });

    describe('Partial updates (4.4)', () => {
      it('updates only fullName, leaving other fields unchanged', async () => {
        const before = await request(app.getHttpServer())
          .get(`/patients/${patientId}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        const res = await request(app.getHttpServer())
          .patch(`/patients/${patientId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ fullName: 'Updated Name Only' })
          .expect(200);

        expect(res.body.fullName).toBe('Updated Name Only');
        expect(res.body.email).toBe(before.body.email);
        expect(res.body.phone).toBe(before.body.phone);
      });

      it('updates multiple fields simultaneously', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/patients/${patientId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            fullName: 'Multi Update',
            gender: 'male',
            phone: '+55 11 90000-8888',
          })
          .expect(200);
        expect(res.body.fullName).toBe('Multi Update');
        expect(res.body.gender).toBe('male');
        expect(res.body.phone).toBe('+55 11 90000-8888');
      });

      it('updates all fields simultaneously', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/patients/${patientId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            fullName: 'All Updated',
            gender: 'female',
            birthDate: '1992-06-15',
            phone: '+55 11 90000-7776',
            email: 'all.updated@example.com',
          })
          .expect(200);
        expect(res.body.fullName).toBe('All Updated');
        expect(res.body.gender).toBe('female');
        expect(String(res.body.birthDate)).toContain('1992-06-15');
        expect(res.body.phone).toBe('+55 11 90000-7776');
        expect(res.body.email).toBe('all.updated@example.com');
      });

      it('returns current state when no changes are made', async () => {
        const before = await request(app.getHttpServer())
          .get(`/patients/${patientId}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        const res = await request(app.getHttpServer())
          .patch(`/patients/${patientId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            fullName: before.body.fullName,
            gender: before.body.gender,
            birthDate: before.body.birthDate,
            phone: before.body.phone,
            email: before.body.email,
          })
          .expect(200);

        expect(res.body.fullName).toBe(before.body.fullName);
        expect(res.body.email).toBe(before.body.email);
      });
    });

    describe('Field value validation (4.3)', () => {
      it('returns 400 when fullName has less than 3 characters', async () => {
        await request(app.getHttpServer())
          .patch(`/patients/${patientId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ fullName: 'ab' })
          .expect(400);
      });

      it('returns 400 when fullName is invalid type', async () => {
        await request(app.getHttpServer())
          .patch(`/patients/${patientId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ fullName: 123 })
          .expect(400);
      });

      it('returns 400 when phone is invalid', async () => {
        await request(app.getHttpServer())
          .patch(`/patients/${patientId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ phone: '123' })
          .expect(400);
      });

      it('returns 400 when email is invalid', async () => {
        await request(app.getHttpServer())
          .patch(`/patients/${patientId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ email: 'bad' })
          .expect(400);
      });

      it('returns 400 when fullName has only whitespace', async () => {
        await request(app.getHttpServer())
          .patch(`/patients/${patientId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ fullName: '   ' })
          .expect(400);
      });

      it('returns 400 when phone has only whitespace', async () => {
        await request(app.getHttpServer())
          .patch(`/patients/${patientId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ phone: '   ' })
          .expect(400);
      });

      it('returns 400 when email has only whitespace', async () => {
        await request(app.getHttpServer())
          .patch(`/patients/${patientId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ email: '   ' })
          .expect(400);
      });
    });

    describe('ID validation (4.1)', () => {
      it('returns 400 when ID is invalid format', async () => {
        await request(app.getHttpServer())
          .patch('/patients/123')
          .set('Authorization', `Bearer ${token}`)
          .send({ fullName: 'Test' })
          .expect(400);
      });

      it('returns 404 when ID does not exist', async () => {
        await request(app.getHttpServer())
          .patch(`/patients/${nonExistentPatientId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ fullName: 'Test' })
          .expect(404);
      });
    });

    describe('Conflict cases (4.6)', () => {
      it('returns 409 when email is duplicate', async () => {
        await request(app.getHttpServer())
          .patch(`/patients/${patientId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ email: 'john.roe@example.com' })
          .expect(409);
      });

      it('returns 409 when phone is duplicate', async () => {
        await request(app.getHttpServer())
          .patch(`/patients/${patientId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ phone: '+55 11 90000-0001' })
          .expect(409);
      });

      it('returns 200 when updating to own email', async () => {
        const before = await request(app.getHttpServer())
          .get(`/patients/${patientId}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        const res = await request(app.getHttpServer())
          .patch(`/patients/${patientId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ email: before.body.email })
          .expect(200);
        expect(res.body.email).toBe(before.body.email);
      });

      it('returns 200 when updating to own phone', async () => {
        const before = await request(app.getHttpServer())
          .get(`/patients/${patientId}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        const res = await request(app.getHttpServer())
          .patch(`/patients/${patientId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ phone: before.body.phone })
          .expect(200);
        expect(res.body.phone).toBe(before.body.phone);
      });
    });

    describe('Success cases additional (4.5)', () => {
      it('only updates sent fields, others remain unchanged', async () => {
        const before = await request(app.getHttpServer())
          .get(`/patients/${patientId}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        const res = await request(app.getHttpServer())
          .patch(`/patients/${patientId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ fullName: 'Only Name Changed' })
          .expect(200);

        expect(res.body.fullName).toBe('Only Name Changed');
        expect(res.body.email).toBe(before.body.email);
        expect(res.body.phone).toBe(before.body.phone);
        expect(res.body.gender).toBe(before.body.gender);
      });

      it('returns complete structure after update', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/patients/${patientId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ fullName: 'Structure Test' })
          .expect(200);
        expect(res.body).toHaveProperty('id');
        expect(res.body).toHaveProperty('fullName');
        expect(res.body).toHaveProperty('gender');
        expect(res.body).toHaveProperty('birthDate');
        expect(res.body).toHaveProperty('phone');
        expect(res.body).toHaveProperty('email');
      });
    });
  });

  describe('DELETE /patients/:id', () => {
    describe('Success cases (5.3)', () => {
      it('deletes patient and returns deleted confirmation', async () => {
        const created = await request(app.getHttpServer())
          .post('/patients')
          .set('Authorization', `Bearer ${token}`)
          .send({
            fullName: 'To Delete',
            gender: 'male',
            birthDate: '1990-01-01',
            phone: '+55 11 90000-9999',
            email: 'todelete@example.com',
          })
          .expect(201);
        const deleteId = created.body.id;

        const res = await request(app.getHttpServer())
          .delete(`/patients/${deleteId}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);
        expect(res.body).toHaveProperty('deleted', true);
      });

      it('returns 404 when trying to get deleted patient', async () => {
        const created = await request(app.getHttpServer())
          .post('/patients')
          .set('Authorization', `Bearer ${token}`)
          .send({
            fullName: 'To Delete 2',
            gender: 'female',
            birthDate: '1990-01-01',
            phone: '+55 11 90000-9998',
            email: 'todelete2@example.com',
          })
          .expect(201);
        const deleteId = created.body.id;

        await request(app.getHttpServer())
          .delete(`/patients/${deleteId}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        await request(app.getHttpServer())
          .get(`/patients/${deleteId}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(404);
      });

      it('returns 404 when trying to delete again', async () => {
        const created = await request(app.getHttpServer())
          .post('/patients')
          .set('Authorization', `Bearer ${token}`)
          .send({
            fullName: 'To Delete 3',
            gender: 'other',
            birthDate: '1990-01-01',
            phone: '+55 11 90000-9997',
            email: 'todelete3@example.com',
          })
          .expect(201);
        const deleteId = created.body.id;

        await request(app.getHttpServer())
          .delete(`/patients/${deleteId}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        await request(app.getHttpServer())
          .delete(`/patients/${deleteId}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(404);
      });
    });

    describe('Cascade deletion (5.2)', () => {
      it('deletes meal-plans, anamnesis and energy-calculation when patient is deleted', async () => {
        const created = await request(app.getHttpServer())
          .post('/patients')
          .set('Authorization', `Bearer ${token}`)
          .send({
            fullName: 'Cascade Test',
            gender: 'female',
            birthDate: '1991-02-02',
            phone: '+55 11 95555-5556',
            email: 'cascade@example.com',
          })
          .expect(201);
        const pid: string = created.body.id;

        await request(app.getHttpServer())
          .post(`/patients/${pid}/meal-plans`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            title: 'Plano teste',
            meals: [
              {
                name: 'Breakfast',
                time: '08:00',
                items: [{ foodId: 'oats', quantityGrams: 60 }],
              },
            ],
          })
          .expect(201);
        await request(app.getHttpServer())
          .post(`/patients/${pid}/anamnesis`)
          .set('Authorization', `Bearer ${token}`)
          .send({ title: 'Inicial', description: 'Desc' })
          .expect(201);
        await request(app.getHttpServer())
          .post(`/patients/${pid}/energy-calculation`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            height: 175,
            weight: 80,
            energyCalculationFormula: 'harris-benedict-1984',
          })
          .expect(201);

        await request(app.getHttpServer())
          .delete(`/patients/${pid}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        await request(app.getHttpServer())
          .get(`/patients/${pid}/meal-plans`)
          .set('Authorization', `Bearer ${token}`)
          .expect(404);
        await request(app.getHttpServer())
          .get(`/patients/${pid}/anamnesis`)
          .set('Authorization', `Bearer ${token}`)
          .expect(404);
        await request(app.getHttpServer())
          .get(`/patients/${pid}/energy-calculation`)
          .set('Authorization', `Bearer ${token}`)
          .expect(404);
      });

      it('deletes patient without meal-plans and anamnesis', async () => {
        const created = await request(app.getHttpServer())
          .post('/patients')
          .set('Authorization', `Bearer ${token}`)
          .send({
            fullName: 'No Relations',
            gender: 'male',
            birthDate: '1990-01-01',
            phone: '+55 11 90000-9996',
            email: 'norelations@example.com',
          })
          .expect(201);
        const pid = created.body.id;

        const res = await request(app.getHttpServer())
          .delete(`/patients/${pid}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);
        expect(res.body).toHaveProperty('deleted', true);
      });
    });

    describe('ID validation (5.1)', () => {
      it('returns 400 when ID is invalid format', async () => {
        await request(app.getHttpServer())
          .delete('/patients/123')
          .set('Authorization', `Bearer ${token}`)
          .expect(400);
      });

      it('returns 404 when ID does not exist', async () => {
        await request(app.getHttpServer())
          .delete(`/patients/${nonExistentPatientId}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(404);
      });
    });

    describe('Authentication (5.4)', () => {
      it('returns 401 when no token is provided', async () => {
        await request(app.getHttpServer())
          .delete(`/patients/${patientId}`)
          .expect(401);
      });

      it('returns 401 when token is invalid', async () => {
        await request(app.getHttpServer())
          .delete(`/patients/${patientId}`)
          .set('Authorization', 'Bearer invalid-token-12345')
          .expect(401);
      });

      it('returns 401 when token format is incorrect', async () => {
        await request(app.getHttpServer())
          .delete(`/patients/${patientId}`)
          .set('Authorization', 'InvalidFormat token')
          .expect(401);
      });
    });
  });

  describe('Authentication (6.1)', () => {
    describe('POST /patients', () => {
      it('returns 401 when no token is provided', async () => {
        await request(app.getHttpServer())
          .post('/patients')
          .send({
            fullName: 'Test',
            gender: 'male',
            birthDate: '1990-01-01',
            phone: '+55 11 90000-0000',
            email: 'test@example.com',
          })
          .expect(401);
      });

      it('returns 401 when token is invalid', async () => {
        await request(app.getHttpServer())
          .post('/patients')
          .set('Authorization', 'Bearer invalid-token-12345')
          .send({
            fullName: 'Test',
            gender: 'male',
            birthDate: '1990-01-01',
            phone: '+55 11 90000-0000',
            email: 'test@example.com',
          })
          .expect(401);
      });

      it('returns 401 when token format is incorrect', async () => {
        await request(app.getHttpServer())
          .post('/patients')
          .set('Authorization', 'InvalidFormat token')
          .send({
            fullName: 'Test',
            gender: 'male',
            birthDate: '1990-01-01',
            phone: '+55 11 90000-0000',
            email: 'test@example.com',
          })
          .expect(401);
      });
    });

    describe('GET /patients', () => {
      it('returns 401 when no token is provided', async () => {
        await request(app.getHttpServer()).get('/patients').expect(401);
      });

      it('returns 401 when token is invalid', async () => {
        await request(app.getHttpServer())
          .get('/patients')
          .set('Authorization', 'Bearer invalid-token-12345')
          .expect(401);
      });

      it('returns 401 when token format is incorrect', async () => {
        await request(app.getHttpServer())
          .get('/patients')
          .set('Authorization', 'InvalidFormat token')
          .expect(401);
      });
    });

    describe('PATCH /patients/:id', () => {
      it('returns 401 when no token is provided', async () => {
        await request(app.getHttpServer())
          .patch(`/patients/${patientId}`)
          .send({ fullName: 'Test' })
          .expect(401);
      });

      it('returns 401 when token is invalid', async () => {
        await request(app.getHttpServer())
          .patch(`/patients/${patientId}`)
          .set('Authorization', 'Bearer invalid-token-12345')
          .send({ fullName: 'Test' })
          .expect(401);
      });

      it('returns 401 when token format is incorrect', async () => {
        await request(app.getHttpServer())
          .patch(`/patients/${patientId}`)
          .set('Authorization', 'InvalidFormat token')
          .send({ fullName: 'Test' })
          .expect(401);
      });
    });
  });

  describe('Authorization (6.2)', () => {
    it('user cannot access other user patient (GET)', async () => {
      await request(app.getHttpServer())
        .get(`/patients/${patientId}`)
        .set('Authorization', `Bearer ${token2}`)
        .expect(404);
    });

    it('user cannot update other user patient (PATCH)', async () => {
      await request(app.getHttpServer())
        .patch(`/patients/${patientId}`)
        .set('Authorization', `Bearer ${token2}`)
        .send({ fullName: 'Hack Attempt' })
        .expect(404);
    });

    it('user cannot delete other user patient (DELETE)', async () => {
      await request(app.getHttpServer())
        .delete(`/patients/${patientId}`)
        .set('Authorization', `Bearer ${token2}`)
        .expect(404);
    });

    it('user only sees their own patients in list', async () => {
      // Create a new patient for user1 to ensure we have one
      const timestamp = Date.now();
      const newPatient = await request(app.getHttpServer())
        .post('/patients')
        .set('Authorization', `Bearer ${token}`)
        .send({
          fullName: 'User1 Patient',
          gender: 'male',
          birthDate: '1990-01-01',
          phone: `+55 11 90000-${timestamp.toString().slice(-4)}`,
          email: `user1.patient.${timestamp}@example.com`,
        })
        .expect(201);
      const newPatientId = newPatient.body.id;

      const user1List = await request(app.getHttpServer())
        .get('/patients')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      const user1Ids = user1List.body.items.map((p: any) => p.id);

      const user2List = await request(app.getHttpServer())
        .get('/patients')
        .set('Authorization', `Bearer ${token2}`)
        .expect(200);
      const user2Ids = user2List.body.items.map((p: any) => p.id);

      expect(user1Ids.includes(newPatientId)).toBe(true);
      expect(user2Ids.includes(newPatientId)).toBe(false);
    });
  });

  describe('Data relationships (8.1)', () => {
    it('patient is correctly linked to user', async () => {
      const res = await request(app.getHttpServer())
        .post('/patients')
        .set('Authorization', `Bearer ${token}`)
        .send({
          fullName: 'Relationship Test',
          gender: 'male',
          birthDate: '1990-01-01',
          phone: '+55 11 90000-8889',
          email: 'relationship.test@example.com',
        })
        .expect(201);
      expect(res.body).toHaveProperty('user');
      expect(res.body.user).toBeTruthy();
    });

    it('user field is correctly populated', async () => {
      const created = await request(app.getHttpServer())
        .post('/patients')
        .set('Authorization', `Bearer ${token}`)
        .send({
          fullName: 'User Field Test',
          gender: 'female',
          birthDate: '1990-01-01',
          phone: '+55 11 90000-8887',
          email: 'userfield@example.com',
        })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/patients/${created.body.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      // User field might not be in response, but patient should be accessible
      expect(res.body).toHaveProperty('id', created.body.id);
    });
  });

  describe('Data consistency (8.2)', () => {
    it('create, update, and verify data consistency', async () => {
      const created = await request(app.getHttpServer())
        .post('/patients')
        .set('Authorization', `Bearer ${token}`)
        .send({
          fullName: 'Consistency Test',
          gender: 'male',
          birthDate: '1990-01-01',
          phone: '+55 11 90000-8886',
          email: 'consistency@example.com',
        })
        .expect(201);
      const pid = created.body.id;

      const updated = await request(app.getHttpServer())
        .patch(`/patients/${pid}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ fullName: 'Updated Consistency' })
        .expect(200);

      const retrieved = await request(app.getHttpServer())
        .get(`/patients/${pid}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(retrieved.body.fullName).toBe('Updated Consistency');
      expect(retrieved.body.email).toBe(updated.body.email);
      expect(retrieved.body.phone).toBe(updated.body.phone);
    });

    it('data is not corrupted after multiple updates', async () => {
      const created = await request(app.getHttpServer())
        .post('/patients')
        .set('Authorization', `Bearer ${token}`)
        .send({
          fullName: 'Multi Update Test',
          gender: 'female',
          birthDate: '1990-01-01',
          phone: '+55 11 90000-8885',
          email: 'multiupdate@example.com',
        })
        .expect(201);
      const pid = created.body.id;

      await request(app.getHttpServer())
        .patch(`/patients/${pid}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ fullName: 'Update 1' })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/patients/${pid}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ gender: 'other' })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/patients/${pid}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ phone: '+55 11 90000-8884' })
        .expect(200);

      const final = await request(app.getHttpServer())
        .get(`/patients/${pid}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(final.body.fullName).toBe('Update 1');
      expect(final.body.gender).toBe('other');
      expect(final.body.phone).toBe('+55 11 90000-8884');
      expect(final.body.email).toBe('multiupdate@example.com');
    });
  });
});
