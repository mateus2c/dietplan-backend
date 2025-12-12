import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { UsersModule } from '../src/users/users.module';
import { AuthModule } from '../src/auth/auth.module';
import { PatientsModule } from '../src/patients/patients.module';
import { MealPlansModule } from '../src/patients/meal-plans/meal-plans.module';
import { RouterModule } from '@nestjs/core';
import { GoogleStrategy } from '../src/auth/strategies/google.strategy';

describe('Meal Plans (e2e)', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let token: string;
  let token2: string;
  let patientId: string;
  let patientId2: string;
  let planId: string;
  let nonExistentPatientId: string;
  let nonExistentPlanId: string;

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
        RouterModule.register([
          {
            path: 'patients',
            module: PatientsModule,
            children: [
              { path: ':patientId/meal-plans', module: MealPlansModule },
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
      .send({ email: 'meal.user@example.com', password: 'StrongPass123' })
      .expect(201);
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'meal.user@example.com', password: 'StrongPass123' })
      .expect(200);
    token = login.body.access_token;

    const createdPatient = await request(app.getHttpServer())
      .post('/patients')
      .set('Authorization', `Bearer ${token}`)
      .send({
        fullName: 'Meal Patient',
        gender: 'female',
        birthDate: '1990-01-01',
        phone: '+55 11 90000-1111',
        email: 'meal.patient@example.com',
      })
      .expect(201);
    patientId = createdPatient.body.id;

    // Create second user and patient for authorization tests
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'other.meal@example.com', password: 'StrongPass123' })
      .expect(201);
    const login2 = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'other.meal@example.com', password: 'StrongPass123' })
      .expect(200);
    token2 = login2.body.access_token;

    const createdPatient2 = await request(app.getHttpServer())
      .post('/patients')
      .set('Authorization', `Bearer ${token2}`)
      .send({
        fullName: 'Other Meal Patient',
        gender: 'male',
        birthDate: '1985-05-15',
        phone: '+55 11 90000-2222',
        email: 'other.meal.patient@example.com',
      })
      .expect(201);
    patientId2 = createdPatient2.body.id;

    // Create meal plan for the first patient
    const res = await request(app.getHttpServer())
      .post(`/patients/${patientId}/meal-plans`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Initial Plan',
        meals: [
          {
            name: 'Breakfast',
            time: '08:00',
            items: [
              { foodId: 'oats', quantityGrams: 60 },
              { foodId: 'skim_milk', quantityGrams: 200 },
            ],
          },
        ],
      })
      .expect(201);
    planId = String(res.body.plans[0]._id || res.body.plans[0].id);

    // Generate valid ObjectId format for non-existent IDs
    nonExistentPatientId = '507f1f77bcf86cd799439011';
    nonExistentPlanId = '507f1f77bcf86cd799439012';
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  describe('DELETE /patients/:patientId/meal-plans/:planId', () => {
    describe('Success cases', () => {
      it('deletes plan and returns updated document', async () => {
        // Create a plan to delete
        const createRes = await request(app.getHttpServer())
          .post(`/patients/${patientId}/meal-plans`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            title: 'Plan to Delete',
            meals: [
              {
                name: 'Lunch',
                time: '12:00',
                items: [{ foodId: 'chicken_breast', quantityGrams: 150 }],
              },
            ],
          })
          .expect(201);
        const planToDeleteId = String(
          createRes.body.plans[createRes.body.plans.length - 1]._id ||
            createRes.body.plans[createRes.body.plans.length - 1].id,
        );
        const plansCountBefore = createRes.body.plans.length;

        const res = await request(app.getHttpServer())
          .delete(`/patients/${patientId}/meal-plans/${planToDeleteId}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(res.body).toHaveProperty('id');
        expect(res.body).toHaveProperty('patientId', patientId);
        expect(Array.isArray(res.body.plans)).toBe(true);
        expect(res.body.plans.length).toBe(plansCountBefore - 1);
        const deletedPlan = res.body.plans.find(
          (p: any) => String(p._id || p.id) === planToDeleteId,
        );
        expect(deletedPlan).toBeUndefined();
      });

      it('deletes plan and other plans remain unchanged', async () => {
        // Create two plans
        const createRes1 = await request(app.getHttpServer())
          .post(`/patients/${patientId}/meal-plans`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            title: 'Plan A',
            meals: [
              {
                name: 'Breakfast',
                time: '08:00',
                items: [{ foodId: 'oats', quantityGrams: 60 }],
              },
            ],
          })
          .expect(201);
        const planAId = String(
          createRes1.body.plans[createRes1.body.plans.length - 1]._id ||
            createRes1.body.plans[createRes1.body.plans.length - 1].id,
        );

        // Wait a bit to ensure different timestamps
        await new Promise((resolve) => setTimeout(resolve, 10));

        const createRes2 = await request(app.getHttpServer())
          .post(`/patients/${patientId}/meal-plans`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            title: 'Plan B',
            meals: [
              {
                name: 'Lunch',
                time: '12:00',
                items: [{ foodId: 'chicken_breast', quantityGrams: 150 }],
              },
            ],
          })
          .expect(201);
        const planBId = String(
          createRes2.body.plans[createRes2.body.plans.length - 1]._id ||
            createRes2.body.plans[createRes2.body.plans.length - 1].id,
        );

        // Delete Plan A
        const deleteRes = await request(app.getHttpServer())
          .delete(`/patients/${patientId}/meal-plans/${planAId}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        // Verify Plan B still exists
        const planB = deleteRes.body.plans.find(
          (p: any) => String(p._id || p.id) === planBId,
        );
        expect(planB).toBeTruthy();
        expect(planB.title).toBe('Plan B');

        // Verify Plan A is deleted
        const planA = deleteRes.body.plans.find(
          (p: any) => String(p._id || p.id) === planAId,
        );
        expect(planA).toBeUndefined();
      });

      it('returns document with empty plans array when last plan is deleted', async () => {
        // Create a new patient with a plan
        const newPatient = await request(app.getHttpServer())
          .post('/patients')
          .set('Authorization', `Bearer ${token}`)
          .send({
            fullName: 'Single Plan Patient',
            gender: 'male',
            birthDate: '1995-01-01',
            phone: '+55 11 90000-3333',
            email: 'single.plan@example.com',
          })
          .expect(201);
        const newPatientId = newPatient.body.id;

        const createRes = await request(app.getHttpServer())
          .post(`/patients/${newPatientId}/meal-plans`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            title: 'Only Plan',
            meals: [
              {
                name: 'Dinner',
                time: '19:00',
                items: [{ foodId: 'brown_rice_cooked', quantityGrams: 200 }],
              },
            ],
          })
          .expect(201);
        const onlyPlanId = String(
          createRes.body.plans[0]._id || createRes.body.plans[0].id,
        );

        const deleteRes = await request(app.getHttpServer())
          .delete(`/patients/${newPatientId}/meal-plans/${onlyPlanId}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(deleteRes.body).toHaveProperty('id');
        expect(deleteRes.body).toHaveProperty('patientId', newPatientId);
        expect(Array.isArray(deleteRes.body.plans)).toBe(true);
        expect(deleteRes.body.plans.length).toBe(0);
      });
    });

    describe('ID validation', () => {
      it('returns 400 when patientId is invalid format', async () => {
        await request(app.getHttpServer())
          .delete(`/patients/123/meal-plans/${planId}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(400);
      });

      it('returns 400 when planId is invalid format', async () => {
        await request(app.getHttpServer())
          .delete(`/patients/${patientId}/meal-plans/123`)
          .set('Authorization', `Bearer ${token}`)
          .expect(400);
      });

      it('returns 403 when patientId does not exist (ownership check first)', async () => {
        // Service checks ownership before checking if patient exists
        await request(app.getHttpServer())
          .delete(`/patients/${nonExistentPatientId}/meal-plans/${planId}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(403);
      });

      it('returns 404 when planId does not exist', async () => {
        await request(app.getHttpServer())
          .delete(`/patients/${patientId}/meal-plans/${nonExistentPlanId}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(404);
      });
    });

    describe('Authentication', () => {
      it('returns 401 when no token is provided', async () => {
        await request(app.getHttpServer())
          .delete(`/patients/${patientId}/meal-plans/${planId}`)
          .expect(401);
      });

      it('returns 401 when token is invalid', async () => {
        await request(app.getHttpServer())
          .delete(`/patients/${patientId}/meal-plans/${planId}`)
          .set('Authorization', 'Bearer invalid-token-12345')
          .expect(401);
      });

      it('returns 401 when token format is incorrect', async () => {
        await request(app.getHttpServer())
          .delete(`/patients/${patientId}/meal-plans/${planId}`)
          .set('Authorization', 'InvalidFormat token')
          .expect(401);
      });
    });

    describe('Authorization', () => {
      it('returns 403 when user tries to delete plan from another user patient', async () => {
        await request(app.getHttpServer())
          .delete(`/patients/${patientId}/meal-plans/${planId}`)
          .set('Authorization', `Bearer ${token2}`)
          .expect(403);
      });

      it('user can delete their own patient plan', async () => {
        // Create a plan for user2's patient
        const createRes = await request(app.getHttpServer())
          .post(`/patients/${patientId2}/meal-plans`)
          .set('Authorization', `Bearer ${token2}`)
          .send({
            title: 'User2 Plan',
            meals: [
              {
                name: 'Breakfast',
                time: '08:00',
                items: [{ foodId: 'oats', quantityGrams: 60 }],
              },
            ],
          })
          .expect(201);
        const user2PlanId = String(
          createRes.body.plans[createRes.body.plans.length - 1]._id ||
            createRes.body.plans[createRes.body.plans.length - 1].id,
        );

        await request(app.getHttpServer())
          .delete(`/patients/${patientId2}/meal-plans/${user2PlanId}`)
          .set('Authorization', `Bearer ${token2}`)
          .expect(200);
      });

      it('user cannot delete plan from another user patient', async () => {
        await request(app.getHttpServer())
          .delete(`/patients/${patientId2}/meal-plans/${planId}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(403);
      });
    });

    describe('Data relationships', () => {
      it('deleted plan is removed from meal plans document', async () => {
        // Create a plan
        const createRes = await request(app.getHttpServer())
          .post(`/patients/${patientId}/meal-plans`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            title: 'Relationship Test Plan',
            meals: [
              {
                name: 'Snack',
                time: '15:00',
                items: [{ foodId: 'broccoli_cooked', quantityGrams: 100 }],
              },
            ],
          })
          .expect(201);
        const testPlanId = String(
          createRes.body.plans[createRes.body.plans.length - 1]._id ||
            createRes.body.plans[createRes.body.plans.length - 1].id,
        );

        // Delete the plan
        const deleteRes = await request(app.getHttpServer())
          .delete(`/patients/${patientId}/meal-plans/${testPlanId}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        // Verify plan is not in the response
        const deletedPlan = deleteRes.body.plans.find(
          (p: any) => String(p._id || p.id) === testPlanId,
        );
        expect(deletedPlan).toBeUndefined();
      });

      it('meal plans document maintains correct patient association after deletion', async () => {
        // Create a plan
        const createRes = await request(app.getHttpServer())
          .post(`/patients/${patientId}/meal-plans`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            title: 'Patient Association Test',
            meals: [
              {
                name: 'Dinner',
                time: '19:00',
                items: [{ foodId: 'skim_milk', quantityGrams: 200 }],
              },
            ],
          })
          .expect(201);
        const testPlanId = String(
          createRes.body.plans[createRes.body.plans.length - 1]._id ||
            createRes.body.plans[createRes.body.plans.length - 1].id,
        );

        // Delete the plan
        const deleteRes = await request(app.getHttpServer())
          .delete(`/patients/${patientId}/meal-plans/${testPlanId}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        // Verify patient association is maintained
        expect(deleteRes.body.patientId).toBe(patientId);
      });
    });
  });
});
