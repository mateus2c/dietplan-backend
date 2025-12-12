import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { UsersModule } from '../src/users/users.module';
import { AuthModule } from '../src/auth/auth.module';
import { PatientsModule } from '../src/patients/patients.module';
import { EnergyCalculationModule } from '../src/patients/energy-calculation/energy-calculation.module';
import { RouterModule } from '@nestjs/core';
import { GoogleStrategy } from '../src/auth/strategies/google.strategy';

describe('Energy Calculation (e2e)', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let token: string;
  let token2: string;
  let patientId: string;
  let patientId2: string;
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
        EnergyCalculationModule,
        RouterModule.register([
          {
            path: 'patients',
            module: PatientsModule,
            children: [
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

    // Create first user and patient
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'energy.user@example.com', password: 'StrongPass123' })
      .expect(201);
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'energy.user@example.com', password: 'StrongPass123' })
      .expect(200);
    token = login.body.access_token;

    const createdPatient = await request(app.getHttpServer())
      .post('/patients')
      .set('Authorization', `Bearer ${token}`)
      .send({
        fullName: 'Energy Patient',
        gender: 'female',
        birthDate: '1990-01-01',
        phone: '+55 11 90000-1111',
        email: 'energy.patient@example.com',
      })
      .expect(201);
    patientId = createdPatient.body.id;

    // Create second user and patient for authorization tests
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'other.energy@example.com', password: 'StrongPass123' })
      .expect(201);
    const login2 = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'other.energy@example.com', password: 'StrongPass123' })
      .expect(200);
    token2 = login2.body.access_token;

    const createdPatient2 = await request(app.getHttpServer())
      .post('/patients')
      .set('Authorization', `Bearer ${token2}`)
      .send({
        fullName: 'Other Energy Patient',
        gender: 'male',
        birthDate: '1985-05-15',
        phone: '+55 11 90000-2222',
        email: 'other.energy.patient@example.com',
      })
      .expect(201);
    patientId2 = createdPatient2.body.id;

    // Generate valid ObjectId format for non-existent IDs
    nonExistentPatientId = '507f1f77bcf86cd799439011';
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  describe('GET /patients/:patientId/energy-calculation', () => {
    describe('Success cases', () => {
      it('returns 404 when energy calculation does not exist', async () => {
        await request(app.getHttpServer())
          .get(`/patients/${patientId}/energy-calculation`)
          .set('Authorization', `Bearer ${token}`)
          .expect(404);
      });

      it('returns energy calculation after creation', async () => {
        // Create energy calculation first
        await request(app.getHttpServer())
          .patch(`/patients/${patientId}/energy-calculation`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            height: 175,
            weight: 80,
            energyCalculationFormula: 'harris-benedict-1984',
            physicalActivityFactor: 1.2,
            injuryFactor: 1.0,
          })
          .expect(200);

        const res = await request(app.getHttpServer())
          .get(`/patients/${patientId}/energy-calculation`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(res.body).toHaveProperty('id');
        expect(res.body).toHaveProperty('patientId', patientId);
        expect(res.body).toHaveProperty('height', 175);
        expect(res.body).toHaveProperty('weight', 80);
        expect(res.body).toHaveProperty(
          'energyCalculationFormula',
          'harris-benedict-1984',
        );
        expect(res.body).toHaveProperty('physicalActivityFactor', 1.2);
        expect(res.body).toHaveProperty('injuryFactor', 1.0);
      });
    });

    describe('Error cases', () => {
      it('returns 400 when patientId is invalid format', async () => {
        await request(app.getHttpServer())
          .get(`/patients/123/energy-calculation`)
          .set('Authorization', `Bearer ${token}`)
          .expect(400);
      });

      it('returns 404 when patientId does not exist', async () => {
        await request(app.getHttpServer())
          .get(`/patients/${nonExistentPatientId}/energy-calculation`)
          .set('Authorization', `Bearer ${token}`)
          .expect(404);
      });
    });

    describe('Authentication', () => {
      it('returns 401 when no token is provided', async () => {
        await request(app.getHttpServer())
          .get(`/patients/${patientId}/energy-calculation`)
          .expect(401);
      });

      it('returns 401 when token is invalid', async () => {
        await request(app.getHttpServer())
          .get(`/patients/${patientId}/energy-calculation`)
          .set('Authorization', 'Bearer invalid-token-12345')
          .expect(401);
      });

      it('returns 401 when token format is incorrect', async () => {
        await request(app.getHttpServer())
          .get(`/patients/${patientId}/energy-calculation`)
          .set('Authorization', 'InvalidFormat token')
          .expect(401);
      });
    });

    describe('Authorization', () => {
      it('returns 403 when user tries to access another user patient energy calculation', async () => {
        await request(app.getHttpServer())
          .get(`/patients/${patientId}/energy-calculation`)
          .set('Authorization', `Bearer ${token2}`)
          .expect(403);
      });
    });
  });

  describe('PATCH /patients/:patientId/energy-calculation', () => {
    describe('Success cases', () => {
      it('creates energy calculation with all fields', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/patients/${patientId}/energy-calculation`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            height: 175,
            weight: 80,
            energyCalculationFormula: 'harris-benedict-1984',
            physicalActivityFactor: 1.2,
            injuryFactor: 1.0,
            pregnancyEnergyAdditional: 0,
          })
          .expect(200);

        expect(res.body).toHaveProperty('id');
        expect(res.body).toHaveProperty('patientId', patientId);
        expect(res.body).toHaveProperty('height', 175);
        expect(res.body).toHaveProperty('weight', 80);
        expect(res.body).toHaveProperty(
          'energyCalculationFormula',
          'harris-benedict-1984',
        );
        expect(res.body).toHaveProperty('physicalActivityFactor', 1.2);
        expect(res.body).toHaveProperty('injuryFactor', 1.0);
        expect(res.body).toHaveProperty('pregnancyEnergyAdditional', 0);
      });

      it('creates energy calculation with partial fields', async () => {
        const newPatient = await request(app.getHttpServer())
          .post('/patients')
          .set('Authorization', `Bearer ${token}`)
          .send({
            fullName: 'Partial Energy Patient',
            gender: 'male',
            birthDate: '1990-01-01',
            phone: '+55 11 90000-3333',
            email: 'partial.energy@example.com',
          })
          .expect(201);
        const newPatientId = newPatient.body.id;

        const res = await request(app.getHttpServer())
          .patch(`/patients/${newPatientId}/energy-calculation`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            height: 180,
            weight: 75,
          })
          .expect(200);

        expect(res.body).toHaveProperty('height', 180);
        expect(res.body).toHaveProperty('weight', 75);
        expect(res.body.energyCalculationFormula).toBeUndefined();
      });

      it('updates existing energy calculation', async () => {
        // Create first
        await request(app.getHttpServer())
          .patch(`/patients/${patientId}/energy-calculation`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            height: 175,
            weight: 80,
          })
          .expect(200);

        // Update
        const res = await request(app.getHttpServer())
          .patch(`/patients/${patientId}/energy-calculation`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            height: 180,
            weight: 85,
            energyCalculationFormula: 'eer-2023',
          })
          .expect(200);

        expect(res.body).toHaveProperty('height', 180);
        expect(res.body).toHaveProperty('weight', 85);
        expect(res.body).toHaveProperty('energyCalculationFormula', 'eer-2023');
      });

      it('updates only provided fields', async () => {
        // Create with all fields
        await request(app.getHttpServer())
          .patch(`/patients/${patientId}/energy-calculation`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            height: 175,
            weight: 80,
            energyCalculationFormula: 'harris-benedict-1984',
            physicalActivityFactor: 1.2,
            injuryFactor: 1.0,
          })
          .expect(200);

        // Update only height
        const res = await request(app.getHttpServer())
          .patch(`/patients/${patientId}/energy-calculation`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            height: 180,
          })
          .expect(200);

        expect(res.body).toHaveProperty('height', 180);
        expect(res.body).toHaveProperty('weight', 80);
        expect(res.body).toHaveProperty(
          'energyCalculationFormula',
          'harris-benedict-1984',
        );
      });
    });

    describe('Field validation', () => {
      it('returns 400 when height is negative', async () => {
        await request(app.getHttpServer())
          .patch(`/patients/${patientId}/energy-calculation`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            height: -10,
          })
          .expect(400);
      });

      it('returns 400 when weight is negative', async () => {
        await request(app.getHttpServer())
          .patch(`/patients/${patientId}/energy-calculation`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            weight: -5,
          })
          .expect(400);
      });

      it('returns 400 when energyCalculationFormula is invalid', async () => {
        await request(app.getHttpServer())
          .patch(`/patients/${patientId}/energy-calculation`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            energyCalculationFormula: 'invalid-formula',
          })
          .expect(400);
      });

      it('returns 400 when physicalActivityFactor is invalid', async () => {
        await request(app.getHttpServer())
          .patch(`/patients/${patientId}/energy-calculation`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            physicalActivityFactor: 1.999,
          })
          .expect(400);
      });

      it('returns 400 when injuryFactor is invalid', async () => {
        await request(app.getHttpServer())
          .patch(`/patients/${patientId}/energy-calculation`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            injuryFactor: 999.999,
          })
          .expect(400);
      });

      it('returns 400 when pregnancyEnergyAdditional is negative', async () => {
        await request(app.getHttpServer())
          .patch(`/patients/${patientId}/energy-calculation`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            pregnancyEnergyAdditional: -100,
          })
          .expect(400);
      });

      it('returns 400 when height is a string', async () => {
        await request(app.getHttpServer())
          .patch(`/patients/${patientId}/energy-calculation`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            height: 'invalid',
          })
          .expect(400);
      });

      it('returns 400 when weight is a string', async () => {
        await request(app.getHttpServer())
          .patch(`/patients/${patientId}/energy-calculation`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            weight: 'invalid',
          })
          .expect(400);
      });
    });

    describe('Error cases', () => {
      it('returns 400 when patientId is invalid format', async () => {
        await request(app.getHttpServer())
          .patch(`/patients/123/energy-calculation`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            height: 175,
          })
          .expect(400);
      });

      it('returns 404 when patientId does not exist', async () => {
        await request(app.getHttpServer())
          .patch(`/patients/${nonExistentPatientId}/energy-calculation`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            height: 175,
          })
          .expect(404);
      });
    });

    describe('Authentication', () => {
      it('returns 401 when no token is provided', async () => {
        await request(app.getHttpServer())
          .patch(`/patients/${patientId}/energy-calculation`)
          .send({
            height: 175,
          })
          .expect(401);
      });

      it('returns 401 when token is invalid', async () => {
        await request(app.getHttpServer())
          .patch(`/patients/${patientId}/energy-calculation`)
          .set('Authorization', 'Bearer invalid-token-12345')
          .send({
            height: 175,
          })
          .expect(401);
      });

      it('returns 401 when token format is incorrect', async () => {
        await request(app.getHttpServer())
          .patch(`/patients/${patientId}/energy-calculation`)
          .set('Authorization', 'InvalidFormat token')
          .send({
            height: 175,
          })
          .expect(401);
      });
    });

    describe('Authorization', () => {
      it('returns 403 when user tries to update another user patient energy calculation', async () => {
        await request(app.getHttpServer())
          .patch(`/patients/${patientId}/energy-calculation`)
          .set('Authorization', `Bearer ${token2}`)
          .send({
            height: 175,
          })
          .expect(403);
      });

      it('user can update their own patient energy calculation', async () => {
        await request(app.getHttpServer())
          .patch(`/patients/${patientId2}/energy-calculation`)
          .set('Authorization', `Bearer ${token2}`)
          .send({
            height: 170,
            weight: 70,
          })
          .expect(200);
      });

      it('user cannot update another user patient energy calculation', async () => {
        await request(app.getHttpServer())
          .patch(`/patients/${patientId2}/energy-calculation`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            height: 175,
          })
          .expect(403);
      });
    });

    describe('Valid enum values', () => {
      it('accepts all valid energyCalculationFormula values', async () => {
        const validFormulas = [
          'harris-benedict-1984',
          'harris-benedict-1919',
          'fao-who-2004',
          'eer-iom-2005',
          'eer-2023',
          'katch-mcardle-1996',
          'cunningham-1980',
          'mifflin-obesidade-1990',
          'mifflin-sobrepeso-1990',
          'henry-rees-1991',
          'tinsley-por-peso-2018',
          'tinsley-por-mlg-2018',
          'get-por-formula-bolso',
          'colocar-tmb-manualmente',
          'colocar-get-manualmente',
          'eer-iom-2005-infantil',
          'eer-2023-infantil',
          'fao-who-2004-infantil',
          'schofield-1985-infantil',
          'min-saude-gestante-2005',
          'eer-2023-gestante',
          'eer-2023-lactante',
          'handymet',
        ];

        for (let i = 0; i < validFormulas.length; i++) {
          const formula = validFormulas[i];
          const newPatient = await request(app.getHttpServer())
            .post('/patients')
            .set('Authorization', `Bearer ${token}`)
            .send({
              fullName: `Test ${formula}`,
              gender: 'male',
              birthDate: '1990-01-01',
              phone: `+55 11 90000-${5000 + i}`,
              email: `test.${formula}.${i}@example.com`,
            })
            .expect(201);
          const pid = newPatient.body.id;

          const res = await request(app.getHttpServer())
            .patch(`/patients/${pid}/energy-calculation`)
            .set('Authorization', `Bearer ${token}`)
            .send({
              energyCalculationFormula: formula,
            })
            .expect(200);
          expect(res.body.energyCalculationFormula).toBe(formula);
        }
      });

      it('accepts all valid physicalActivityFactor values', async () => {
        const validFactors = [1.0, 1.2, 1.375, 1.55, 1.725, 1.9];

        for (let i = 0; i < validFactors.length; i++) {
          const factor = validFactors[i];
          const newPatient = await request(app.getHttpServer())
            .post('/patients')
            .set('Authorization', `Bearer ${token}`)
            .send({
              fullName: `Test Factor ${factor}`,
              gender: 'male',
              birthDate: '1990-01-01',
              phone: `+55 11 90000-${6000 + i}`,
              email: `test.factor.${factor}.${i}@example.com`,
            })
            .expect(201);
          const pid = newPatient.body.id;

          const res = await request(app.getHttpServer())
            .patch(`/patients/${pid}/energy-calculation`)
            .set('Authorization', `Bearer ${token}`)
            .send({
              physicalActivityFactor: factor,
            })
            .expect(200);
          expect(res.body.physicalActivityFactor).toBe(factor);
        }
      });

      it('accepts valid injuryFactor values', async () => {
        const testFactors = [
          1.0, 1.1, 1.2, 1.25, 1.27, 1.3, 1.32, 1.35, 1.4, 1.42, 1.5, 1.55, 1.6,
          0.9,
        ];

        for (let i = 0; i < testFactors.length; i++) {
          const factor = testFactors[i];
          const newPatient = await request(app.getHttpServer())
            .post('/patients')
            .set('Authorization', `Bearer ${token}`)
            .send({
              fullName: `Test Injury ${factor}`,
              gender: 'male',
              birthDate: '1990-01-01',
              phone: `+55 11 90000-${7000 + i}`,
              email: `test.injury.${factor}.${i}@example.com`,
            })
            .expect(201);
          const pid = newPatient.body.id;

          const res = await request(app.getHttpServer())
            .patch(`/patients/${pid}/energy-calculation`)
            .set('Authorization', `Bearer ${token}`)
            .send({
              injuryFactor: factor,
            })
            .expect(200);
          expect(res.body.injuryFactor).toBe(factor);
        }
      });
    });

    describe('Data relationships', () => {
      it('energy calculation is correctly linked to patient', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/patients/${patientId}/energy-calculation`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            height: 175,
            weight: 80,
          })
          .expect(200);
        expect(res.body.patientId).toBe(patientId);
      });

      it('energy calculation patientId in response matches the requested patientId', async () => {
        const res = await request(app.getHttpServer())
          .get(`/patients/${patientId}/energy-calculation`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);
        expect(res.body.patientId).toBe(patientId);
      });
    });
  });

  describe('POST /patients/:patientId/energy-calculation', () => {
    describe('Success cases', () => {
      it('creates energy calculation with all fields', async () => {
        const newPatient = await request(app.getHttpServer())
          .post('/patients')
          .set('Authorization', `Bearer ${token}`)
          .send({
            fullName: 'POST Test Patient',
            gender: 'male',
            birthDate: '1990-01-01',
            phone: '+55 11 90000-9999',
            email: 'post.test@example.com',
          })
          .expect(201);
        const newPatientId = newPatient.body.id;

        const res = await request(app.getHttpServer())
          .post(`/patients/${newPatientId}/energy-calculation`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            height: 175,
            weight: 80,
            energyCalculationFormula: 'harris-benedict-1984',
            physicalActivityFactor: 1.2,
            injuryFactor: 1.0,
            pregnancyEnergyAdditional: 0,
          })
          .expect(201);

        expect(res.body).toHaveProperty('id');
        expect(res.body).toHaveProperty('patientId', newPatientId);
        expect(res.body).toHaveProperty('height', 175);
        expect(res.body).toHaveProperty('weight', 80);
        expect(res.body).toHaveProperty(
          'energyCalculationFormula',
          'harris-benedict-1984',
        );
        expect(res.body).toHaveProperty('physicalActivityFactor', 1.2);
        expect(res.body).toHaveProperty('injuryFactor', 1.0);
        expect(res.body).toHaveProperty('pregnancyEnergyAdditional', 0);
      });

      it('creates energy calculation with partial fields', async () => {
        const newPatient = await request(app.getHttpServer())
          .post('/patients')
          .set('Authorization', `Bearer ${token}`)
          .send({
            fullName: 'POST Partial Test',
            gender: 'female',
            birthDate: '1990-01-01',
            phone: '+55 11 90000-8888',
            email: 'post.partial@example.com',
          })
          .expect(201);
        const newPatientId = newPatient.body.id;

        const res = await request(app.getHttpServer())
          .post(`/patients/${newPatientId}/energy-calculation`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            height: 180,
            weight: 75,
          })
          .expect(201);

        expect(res.body).toHaveProperty('height', 180);
        expect(res.body).toHaveProperty('weight', 75);
        expect(res.body.energyCalculationFormula).toBeUndefined();
      });
    });

    describe('Error cases', () => {
      it('returns 400 when energy calculation already exists', async () => {
        const newPatient = await request(app.getHttpServer())
          .post('/patients')
          .set('Authorization', `Bearer ${token}`)
          .send({
            fullName: 'Duplicate Test',
            gender: 'male',
            birthDate: '1990-01-01',
            phone: '+55 11 90000-7777',
            email: 'duplicate.test@example.com',
          })
          .expect(201);
        const newPatientId = newPatient.body.id;

        // Create first
        await request(app.getHttpServer())
          .post(`/patients/${newPatientId}/energy-calculation`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            height: 175,
            weight: 80,
          })
          .expect(201);

        // Try to create again
        await request(app.getHttpServer())
          .post(`/patients/${newPatientId}/energy-calculation`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            height: 180,
            weight: 85,
          })
          .expect(400);
      });

      it('returns 400 when patientId is invalid format', async () => {
        await request(app.getHttpServer())
          .post(`/patients/123/energy-calculation`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            height: 175,
          })
          .expect(400);
      });

      it('returns 404 when patientId does not exist', async () => {
        await request(app.getHttpServer())
          .post(`/patients/${nonExistentPatientId}/energy-calculation`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            height: 175,
          })
          .expect(404);
      });
    });

    describe('Authentication', () => {
      it('returns 401 when no token is provided', async () => {
        await request(app.getHttpServer())
          .post(`/patients/${patientId}/energy-calculation`)
          .send({
            height: 175,
          })
          .expect(401);
      });

      it('returns 401 when token is invalid', async () => {
        await request(app.getHttpServer())
          .post(`/patients/${patientId}/energy-calculation`)
          .set('Authorization', 'Bearer invalid-token-12345')
          .send({
            height: 175,
          })
          .expect(401);
      });
    });

    describe('Authorization', () => {
      it('returns 403 when user tries to create another user patient energy calculation', async () => {
        await request(app.getHttpServer())
          .post(`/patients/${patientId}/energy-calculation`)
          .set('Authorization', `Bearer ${token2}`)
          .send({
            height: 175,
            weight: 80,
          })
          .expect(403);
      });
    });

    describe('Field validation', () => {
      it('returns 400 when height is negative', async () => {
        const newPatient = await request(app.getHttpServer())
          .post('/patients')
          .set('Authorization', `Bearer ${token}`)
          .send({
            fullName: 'Validation Test',
            gender: 'male',
            birthDate: '1990-01-01',
            phone: '+55 11 90000-6666',
            email: 'validation.test@example.com',
          })
          .expect(201);
        const newPatientId = newPatient.body.id;

        await request(app.getHttpServer())
          .post(`/patients/${newPatientId}/energy-calculation`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            height: -10,
          })
          .expect(400);
      });

      it('returns 400 when energyCalculationFormula is invalid', async () => {
        const newPatient = await request(app.getHttpServer())
          .post('/patients')
          .set('Authorization', `Bearer ${token}`)
          .send({
            fullName: 'Formula Test',
            gender: 'male',
            birthDate: '1990-01-01',
            phone: '+55 11 90000-5555',
            email: 'formula.test@example.com',
          })
          .expect(201);
        const newPatientId = newPatient.body.id;

        await request(app.getHttpServer())
          .post(`/patients/${newPatientId}/energy-calculation`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            energyCalculationFormula: 'invalid-formula',
          })
          .expect(400);
      });
    });
  });

  describe('DELETE /patients/:patientId/energy-calculation', () => {
    describe('Success cases', () => {
      it('deletes energy calculation and returns deleted confirmation', async () => {
        const newPatient = await request(app.getHttpServer())
          .post('/patients')
          .set('Authorization', `Bearer ${token}`)
          .send({
            fullName: 'DELETE Test Patient',
            gender: 'male',
            birthDate: '1990-01-01',
            phone: '+55 11 90000-4444',
            email: 'delete.test@example.com',
          })
          .expect(201);
        const newPatientId = newPatient.body.id;

        // Create energy calculation
        await request(app.getHttpServer())
          .post(`/patients/${newPatientId}/energy-calculation`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            height: 175,
            weight: 80,
          })
          .expect(201);

        // Delete
        const res = await request(app.getHttpServer())
          .delete(`/patients/${newPatientId}/energy-calculation`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(res.body).toHaveProperty('deleted', true);

        // Verify it's deleted
        await request(app.getHttpServer())
          .get(`/patients/${newPatientId}/energy-calculation`)
          .set('Authorization', `Bearer ${token}`)
          .expect(404);
      });

      it('returns 404 when energy calculation does not exist', async () => {
        const timestamp = Date.now();
        const newPatient = await request(app.getHttpServer())
          .post('/patients')
          .set('Authorization', `Bearer ${token}`)
          .send({
            fullName: 'No Energy Calc Patient',
            gender: 'female',
            birthDate: '1990-01-01',
            phone: `+55 11 90000-${timestamp.toString().slice(-4)}`,
            email: `no.energy.${timestamp}@example.com`,
          })
          .expect(201);
        const newPatientId = newPatient.body.id;

        await request(app.getHttpServer())
          .delete(`/patients/${newPatientId}/energy-calculation`)
          .set('Authorization', `Bearer ${token}`)
          .expect(404);
      });
    });

    describe('Error cases', () => {
      it('returns 400 when patientId is invalid format', async () => {
        await request(app.getHttpServer())
          .delete(`/patients/123/energy-calculation`)
          .set('Authorization', `Bearer ${token}`)
          .expect(400);
      });

      it('returns 404 when patientId does not exist', async () => {
        await request(app.getHttpServer())
          .delete(`/patients/${nonExistentPatientId}/energy-calculation`)
          .set('Authorization', `Bearer ${token}`)
          .expect(404);
      });
    });

    describe('Authentication', () => {
      it('returns 401 when no token is provided', async () => {
        await request(app.getHttpServer())
          .delete(`/patients/${patientId}/energy-calculation`)
          .expect(401);
      });

      it('returns 401 when token is invalid', async () => {
        await request(app.getHttpServer())
          .delete(`/patients/${patientId}/energy-calculation`)
          .set('Authorization', 'Bearer invalid-token-12345')
          .expect(401);
      });
    });

    describe('Authorization', () => {
      it('returns 403 when user tries to delete another user patient energy calculation', async () => {
        const timestamp = Date.now();
        const newPatient = await request(app.getHttpServer())
          .post('/patients')
          .set('Authorization', `Bearer ${token}`)
          .send({
            fullName: 'Auth Test Patient',
            gender: 'male',
            birthDate: '1990-01-01',
            phone: `+55 11 90000-${timestamp.toString().slice(-4)}`,
            email: `auth.test.${timestamp}@example.com`,
          })
          .expect(201);
        const newPatientId = newPatient.body.id;

        // Create energy calculation
        await request(app.getHttpServer())
          .post(`/patients/${newPatientId}/energy-calculation`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            height: 175,
            weight: 80,
          })
          .expect(201);

        // Try to delete with different user
        await request(app.getHttpServer())
          .delete(`/patients/${newPatientId}/energy-calculation`)
          .set('Authorization', `Bearer ${token2}`)
          .expect(403);
      });
    });
  });
});
