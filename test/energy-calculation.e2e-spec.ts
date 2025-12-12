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
  let calculationId: string;
  let nonExistentPatientId: string;
  let nonExistentCalculationId: string;

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

    // Create second user for authorization tests
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'other.energy@example.com', password: 'StrongPass123' })
      .expect(201);
    const login2 = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'other.energy@example.com', password: 'StrongPass123' })
      .expect(200);
    token2 = login2.body.access_token;

    // Create energy calculation for the first patient
    const res = await request(app.getHttpServer())
      .post(`/patients/${patientId}/energy-calculation`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        height: 165,
        weight: 68,
        energyCalculationFormula: 'harris-benedict-1984',
        physicalActivityFactor: 1.375,
        injuryFactor: 1.0,
        pregnancyEnergyAdditional: 0,
      })
      .expect(201);
    calculationId = String(
      res.body.calculations[0]._id || res.body.calculations[0].id,
    );

    // Generate valid ObjectId format for non-existent IDs
    nonExistentPatientId = '507f1f77bcf86cd799439011';
    nonExistentCalculationId = '507f1f77bcf86cd799439012';
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  describe('POST /patients/:patientId/energy-calculation', () => {
    describe('Success cases', () => {
      it('creates calculation and returns document with all calculations', async () => {
        const res = await request(app.getHttpServer())
          .post(`/patients/${patientId}/energy-calculation`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            height: 170,
            weight: 75,
            energyCalculationFormula: 'eer-2023',
            physicalActivityFactor: 1.55,
            injuryFactor: 1.0,
            pregnancyEnergyAdditional: 0,
          })
          .expect(201);
        expect(res.body).toHaveProperty('id');
        expect(res.body).toHaveProperty('patientId', patientId);
        expect(Array.isArray(res.body.calculations)).toBe(true);
        expect(res.body.calculations.length).toBeGreaterThanOrEqual(2);
      });

      it('returns complete structure with all required fields', async () => {
        const res = await request(app.getHttpServer())
          .post(`/patients/${patientId}/energy-calculation`)
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
        expect(res.body).toHaveProperty('patientId', patientId);
        expect(Array.isArray(res.body.calculations)).toBe(true);
        expect(res.body.calculations.length).toBeGreaterThan(0);
        const newCalculation =
          res.body.calculations[res.body.calculations.length - 1];
        expect(newCalculation).toHaveProperty('height', 175);
        expect(newCalculation).toHaveProperty('weight', 80);
        expect(newCalculation).toHaveProperty('_id');
      });

      it('created calculation corresponds to the correct patient', async () => {
        const res = await request(app.getHttpServer())
          .post(`/patients/${patientId}/energy-calculation`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            height: 160,
            weight: 65,
            energyCalculationFormula: 'mifflin-obesidade-1990',
            physicalActivityFactor: 1.375,
            injuryFactor: 1.0,
            pregnancyEnergyAdditional: 0,
          })
          .expect(201);
        expect(res.body.patientId).toBe(patientId);
        const newCalculation =
          res.body.calculations[res.body.calculations.length - 1];
        expect(newCalculation).toBeTruthy();
        expect(newCalculation.height).toBe(160);
      });
    });

    describe('Error cases', () => {
      it('returns 400 when patientId is invalid format', async () => {
        await request(app.getHttpServer())
          .post(`/patients/123/energy-calculation`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            height: 170,
            weight: 70,
            energyCalculationFormula: 'harris-benedict-1984',
            physicalActivityFactor: 1.2,
            injuryFactor: 1.0,
            pregnancyEnergyAdditional: 0,
          })
          .expect(400);
      });

      it('returns 404 when patientId does not exist', async () => {
        await request(app.getHttpServer())
          .post(`/patients/${nonExistentPatientId}/energy-calculation`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            height: 170,
            weight: 70,
            energyCalculationFormula: 'harris-benedict-1984',
            physicalActivityFactor: 1.2,
            injuryFactor: 1.0,
            pregnancyEnergyAdditional: 0,
          })
          .expect(404);
      });

      it('returns 400 when energyCalculationFormula is invalid', async () => {
        await request(app.getHttpServer())
          .post(`/patients/${patientId}/energy-calculation`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            height: 170,
            weight: 70,
            energyCalculationFormula: 'invalid-formula',
            physicalActivityFactor: 1.2,
            injuryFactor: 1.0,
            pregnancyEnergyAdditional: 0,
          })
          .expect(400);
      });

      it('returns 401 when not authenticated', async () => {
        await request(app.getHttpServer())
          .post(`/patients/${patientId}/energy-calculation`)
          .send({
            height: 170,
            weight: 70,
            energyCalculationFormula: 'harris-benedict-1984',
            physicalActivityFactor: 1.2,
            injuryFactor: 1.0,
            pregnancyEnergyAdditional: 0,
          })
          .expect(401);
      });

      it('returns 403 when user tries to create another user patient calculation', async () => {
        await request(app.getHttpServer())
          .post(`/patients/${patientId}/energy-calculation`)
          .set('Authorization', `Bearer ${token2}`)
          .send({
            height: 170,
            weight: 70,
            energyCalculationFormula: 'harris-benedict-1984',
            physicalActivityFactor: 1.2,
            injuryFactor: 1.0,
            pregnancyEnergyAdditional: 0,
          })
          .expect(403);
      });
    });
  });

  describe('GET /patients/:patientId/energy-calculation', () => {
    describe('Success cases', () => {
      it('returns document with calculations', async () => {
        const res = await request(app.getHttpServer())
          .get(`/patients/${patientId}/energy-calculation`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);
        expect(res.body).toHaveProperty('id');
        expect(res.body).toHaveProperty('patientId', patientId);
        expect(Array.isArray(res.body.calculations)).toBe(true);
        expect(res.body.calculations.length).toBeGreaterThanOrEqual(1);
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

      it('returns 404 when energy calculation document does not exist for patient', async () => {
        // Create a new patient without energy calculation
        const newPatient = await request(app.getHttpServer())
          .post('/patients')
          .set('Authorization', `Bearer ${token}`)
          .send({
            fullName: 'New Patient',
            gender: 'male',
            birthDate: '1995-01-01',
            phone: '+55 11 90000-9999',
            email: 'new.patient@example.com',
          })
          .expect(201);

        await request(app.getHttpServer())
          .get(`/patients/${newPatient.body.id}/energy-calculation`)
          .set('Authorization', `Bearer ${token}`)
          .expect(404);
      });

      it('returns 401 when not authenticated', async () => {
        await request(app.getHttpServer())
          .get(`/patients/${patientId}/energy-calculation`)
          .expect(401);
      });

      it('returns 403 when user tries to access another user patient calculation', async () => {
        await request(app.getHttpServer())
          .get(`/patients/${patientId}/energy-calculation`)
          .set('Authorization', `Bearer ${token2}`)
          .expect(403);
      });
    });
  });

  describe('PATCH /patients/:patientId/energy-calculation/:calculationId', () => {
    describe('Success cases', () => {
      it('updates only the height', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/patients/${patientId}/energy-calculation/${calculationId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ height: 170 })
          .expect(200);
        expect(Array.isArray(res.body.calculations)).toBe(true);
        const updated = res.body.calculations.find(
          (c: any) => String(c._id || c.id) === String(calculationId),
        );
        expect(updated).toBeTruthy();
        expect(updated.height).toBe(170);
      });

      it('updates only the weight', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/patients/${patientId}/energy-calculation/${calculationId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ weight: 72 })
          .expect(200);
        expect(Array.isArray(res.body.calculations)).toBe(true);
        const updated = res.body.calculations.find(
          (c: any) => String(c._id || c.id) === String(calculationId),
        );
        expect(updated).toBeTruthy();
        expect(updated.weight).toBe(72);
      });

      it('updates multiple fields simultaneously', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/patients/${patientId}/energy-calculation/${calculationId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            height: 175,
            weight: 80,
            energyCalculationFormula: 'eer-2023',
            physicalActivityFactor: 1.55,
          })
          .expect(200);
        expect(Array.isArray(res.body.calculations)).toBe(true);
        const updated = res.body.calculations.find(
          (c: any) => String(c._id || c.id) === String(calculationId),
        );
        expect(updated).toBeTruthy();
        expect(updated.height).toBe(175);
        expect(updated.weight).toBe(80);
        expect(updated.energyCalculationFormula).toBe('eer-2023');
        expect(updated.physicalActivityFactor).toBe(1.55);
      });

      it('returns current state when no changes are made', async () => {
        const beforeRes = await request(app.getHttpServer())
          .get(`/patients/${patientId}/energy-calculation`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);
        const currentCalculation = beforeRes.body.calculations.find(
          (c: any) => String(c._id || c.id) === String(calculationId),
        );

        const res = await request(app.getHttpServer())
          .patch(`/patients/${patientId}/energy-calculation/${calculationId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            height: currentCalculation.height,
            weight: currentCalculation.weight,
          })
          .expect(200);
        expect(Array.isArray(res.body.calculations)).toBe(true);
        const updated = res.body.calculations.find(
          (c: any) => String(c._id || c.id) === String(calculationId),
        );
        expect(updated.height).toBe(currentCalculation.height);
        expect(updated.weight).toBe(currentCalculation.weight);
      });
    });

    describe('Error cases', () => {
      it('returns 400 when patientId is invalid format', async () => {
        await request(app.getHttpServer())
          .patch(`/patients/123/energy-calculation/${calculationId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ height: 170 })
          .expect(400);
      });

      it('returns 400 when calculationId is invalid format', async () => {
        await request(app.getHttpServer())
          .patch(`/patients/${patientId}/energy-calculation/123`)
          .set('Authorization', `Bearer ${token}`)
          .send({ height: 170 })
          .expect(400);
      });

      it('returns 404 when patientId does not exist', async () => {
        await request(app.getHttpServer())
          .patch(
            `/patients/${nonExistentPatientId}/energy-calculation/${calculationId}`,
          )
          .set('Authorization', `Bearer ${token}`)
          .send({ height: 170 })
          .expect(404);
      });

      it('returns 404 when calculationId does not exist', async () => {
        await request(app.getHttpServer())
          .patch(
            `/patients/${patientId}/energy-calculation/${nonExistentCalculationId}`,
          )
          .set('Authorization', `Bearer ${token}`)
          .send({ height: 170 })
          .expect(404);
      });

      it('returns 401 when not authenticated', async () => {
        await request(app.getHttpServer())
          .patch(`/patients/${patientId}/energy-calculation/${calculationId}`)
          .send({ height: 170 })
          .expect(401);
      });

      it('returns 403 when user tries to update another user patient calculation', async () => {
        await request(app.getHttpServer())
          .patch(`/patients/${patientId}/energy-calculation/${calculationId}`)
          .set('Authorization', `Bearer ${token2}`)
          .send({ height: 170 })
          .expect(403);
      });
    });
  });

  describe('DELETE /patients/:patientId/energy-calculation/:calculationId', () => {
    describe('Success cases', () => {
      it('deletes calculation and returns updated document', async () => {
        // Create a calculation first
        const createRes = await request(app.getHttpServer())
          .post(`/patients/${patientId}/energy-calculation`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            height: 180,
            weight: 90,
            energyCalculationFormula: 'harris-benedict-1984',
            physicalActivityFactor: 1.2,
            injuryFactor: 1.0,
            pregnancyEnergyAdditional: 0,
          })
          .expect(201);
        const newCalculationId = String(
          createRes.body.calculations[createRes.body.calculations.length - 1]
            ._id ||
            createRes.body.calculations[createRes.body.calculations.length - 1]
              .id,
        );

        const res = await request(app.getHttpServer())
          .delete(
            `/patients/${patientId}/energy-calculation/${newCalculationId}`,
          )
          .set('Authorization', `Bearer ${token}`)
          .expect(200);
        expect(res.body).toHaveProperty('id');
        expect(res.body).toHaveProperty('patientId', patientId);
        expect(Array.isArray(res.body.calculations)).toBe(true);
        const deleted = res.body.calculations.find(
          (c: any) => String(c._id || c.id) === String(newCalculationId),
        );
        expect(deleted).toBeUndefined();
      });
    });

    describe('Error cases', () => {
      it('returns 400 when patientId is invalid format', async () => {
        await request(app.getHttpServer())
          .delete(`/patients/123/energy-calculation/${calculationId}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(400);
      });

      it('returns 400 when calculationId is invalid format', async () => {
        await request(app.getHttpServer())
          .delete(`/patients/${patientId}/energy-calculation/123`)
          .set('Authorization', `Bearer ${token}`)
          .expect(400);
      });

      it('returns 404 when patientId does not exist', async () => {
        await request(app.getHttpServer())
          .delete(
            `/patients/${nonExistentPatientId}/energy-calculation/${calculationId}`,
          )
          .set('Authorization', `Bearer ${token}`)
          .expect(404);
      });

      it('returns 404 when calculationId does not exist', async () => {
        await request(app.getHttpServer())
          .delete(
            `/patients/${patientId}/energy-calculation/${nonExistentCalculationId}`,
          )
          .set('Authorization', `Bearer ${token}`)
          .expect(404);
      });

      it('returns 401 when not authenticated', async () => {
        await request(app.getHttpServer())
          .delete(`/patients/${patientId}/energy-calculation/${calculationId}`)
          .expect(401);
      });

      it('returns 403 when user tries to delete another user patient calculation', async () => {
        await request(app.getHttpServer())
          .delete(`/patients/${patientId}/energy-calculation/${calculationId}`)
          .set('Authorization', `Bearer ${token2}`)
          .expect(403);
      });
    });
  });
});
