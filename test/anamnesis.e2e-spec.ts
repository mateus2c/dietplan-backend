import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { UsersModule } from '../src/users/users.module';
import { AuthModule } from '../src/auth/auth.module';
import { PatientsModule } from '../src/patients/patients.module';
import { AnamnesisModule } from '../src/patients/anamnesis/anamnesis.module';
import { RouterModule } from '@nestjs/core';
import { GoogleStrategy } from '../src/auth/strategies/google.strategy';

describe('Anamnesis (e2e)', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let token: string;
  let token2: string;
  let patientId: string;
  let patientId2: string;
  let itemId: string;
  let nonExistentPatientId: string;
  let nonExistentItemId: string;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    const moduleBuilder = Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(uri, { dbName: 'dietplan_e2e' }),
        UsersModule,
        AuthModule,
        PatientsModule,
        AnamnesisModule,
        RouterModule.register([
          {
            path: 'patients',
            module: PatientsModule,
            children: [
              { path: ':patientId/anamnesis', module: AnamnesisModule },
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
      .send({ email: 'anam.user@example.com', password: 'StrongPass123' })
      .expect(201);
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'anam.user@example.com', password: 'StrongPass123' })
      .expect(200);
    token = login.body.access_token;

    const createdPatient = await request(app.getHttpServer())
      .post('/patients')
      .set('Authorization', `Bearer ${token}`)
      .send({
        fullName: 'Ana Mnese',
        gender: 'female',
        birthDate: '1990-01-01',
        phone: '+55 11 90000-1234',
        email: 'anam.patient@example.com',
      })
      .expect(201);
    patientId = createdPatient.body.id;

    // Create second user and patient for authorization tests
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'other.anam@example.com', password: 'StrongPass123' })
      .expect(201);
    const login2 = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'other.anam@example.com', password: 'StrongPass123' })
      .expect(200);
    token2 = login2.body.access_token;

    const createdPatient2 = await request(app.getHttpServer())
      .post('/patients')
      .set('Authorization', `Bearer ${token2}`)
      .send({
        fullName: 'Other Patient',
        gender: 'male',
        birthDate: '1985-05-15',
        phone: '+55 11 90000-5678',
        email: 'other.patient@example.com',
      })
      .expect(201);
    patientId2 = createdPatient2.body.id;

    // Create anamnesis item for the first patient
    const res = await request(app.getHttpServer())
      .post(`/patients/${patientId}/anamnesis`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Avaliação inicial',
        description:
          'Paciente relata dores lombares leves, rotina sedentária e sono irregular.',
      })
      .expect(201);
    itemId = String(res.body.items[0]._id || res.body.items[0].id);

    // Generate valid ObjectId format for non-existent IDs
    nonExistentPatientId = '507f1f77bcf86cd799439011';
    nonExistentItemId = '507f1f77bcf86cd799439012';
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  describe('POST /patients/:patientId/anamnesis', () => {
    describe('Success cases', () => {
      it('creates item and returns document with all items', async () => {
        const res = await request(app.getHttpServer())
          .post(`/patients/${patientId}/anamnesis`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            title: 'Follow-up visit',
            description: 'Patient reports improvement in symptoms.',
          })
          .expect(201);
        expect(res.body).toHaveProperty('id');
        expect(res.body).toHaveProperty('patientId', patientId);
        expect(Array.isArray(res.body.items)).toBe(true);
        expect(res.body.items.length).toBeGreaterThanOrEqual(2);
      });

      it('returns complete structure with all required fields', async () => {
        const res = await request(app.getHttpServer())
          .post(`/patients/${patientId}/anamnesis`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            title: 'Complete Structure Test',
            description: 'Testing complete response structure',
          })
          .expect(201);
        expect(res.body).toHaveProperty('id');
        expect(res.body).toHaveProperty('patientId', patientId);
        expect(Array.isArray(res.body.items)).toBe(true);
        expect(res.body.items.length).toBeGreaterThan(0);
        const newItem = res.body.items[res.body.items.length - 1];
        expect(newItem).toHaveProperty('title', 'Complete Structure Test');
        expect(newItem).toHaveProperty('description', 'Testing complete response structure');
        expect(newItem).toHaveProperty('_id');
      });

      it('created item corresponds to the correct patient', async () => {
        const res = await request(app.getHttpServer())
          .post(`/patients/${patientId}/anamnesis`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            title: 'Patient Correspondence Test',
            description: 'Verifying item belongs to correct patient',
          })
          .expect(201);
        expect(res.body.patientId).toBe(patientId);
        const newItem = res.body.items[res.body.items.length - 1];
        expect(newItem).toBeTruthy();
        expect(newItem.title).toBe('Patient Correspondence Test');
      });

      it('items are returned in correct order (newest last)', async () => {
        const firstRes = await request(app.getHttpServer())
          .post(`/patients/${patientId}/anamnesis`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            title: 'First Item',
            description: 'First description',
          })
          .expect(201);
        const firstItemId = String(
          firstRes.body.items[firstRes.body.items.length - 1]._id ||
            firstRes.body.items[firstRes.body.items.length - 1].id,
        );

        const secondRes = await request(app.getHttpServer())
          .post(`/patients/${patientId}/anamnesis`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            title: 'Second Item',
            description: 'Second description',
          })
          .expect(201);
        const secondItemId = String(
          secondRes.body.items[secondRes.body.items.length - 1]._id ||
            secondRes.body.items[secondRes.body.items.length - 1].id,
        );

        // Verify both items are in the response
        expect(secondRes.body.items.length).toBeGreaterThan(firstRes.body.items.length);
        const firstItemInList = secondRes.body.items.find(
          (item: any) => String(item._id || item.id) === firstItemId,
        );
        const secondItemInList = secondRes.body.items.find(
          (item: any) => String(item._id || item.id) === secondItemId,
        );
        expect(firstItemInList).toBeTruthy();
        expect(secondItemInList).toBeTruthy();
        // Second item should be after first item in the array
        const firstIndex = secondRes.body.items.findIndex(
          (item: any) => String(item._id || item.id) === firstItemId,
        );
        const secondIndex = secondRes.body.items.findIndex(
          (item: any) => String(item._id || item.id) === secondItemId,
        );
        expect(secondIndex).toBeGreaterThan(firstIndex);
      });
    });

    describe('Error cases (2.3)', () => {
      it('returns 400 when patientId is invalid format', async () => {
        await request(app.getHttpServer())
          .post(`/patients/123/anamnesis`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            title: 'Test',
            description: 'Test description',
          })
          .expect(400);
      });

      it('returns 404 when patientId does not exist', async () => {
        await request(app.getHttpServer())
          .post(`/patients/${nonExistentPatientId}/anamnesis`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            title: 'Test',
            description: 'Test description',
          })
          .expect(404);
      });

      it('returns 400 when payload has empty title', async () => {
        await request(app.getHttpServer())
          .post(`/patients/${patientId}/anamnesis`)
          .set('Authorization', `Bearer ${token}`)
          .send({ title: '', description: 'Valid description' })
          .expect(400);
      });

      it('returns 400 when payload has empty description', async () => {
        await request(app.getHttpServer())
          .post(`/patients/${patientId}/anamnesis`)
          .set('Authorization', `Bearer ${token}`)
          .send({ title: 'Valid title', description: '' })
          .expect(400);
      });

      it('returns 400 when payload has both empty fields', async () => {
        await request(app.getHttpServer())
          .post(`/patients/${patientId}/anamnesis`)
          .set('Authorization', `Bearer ${token}`)
          .send({ title: '', description: '' })
          .expect(400);
      });

      it('returns 400 when title is missing', async () => {
        await request(app.getHttpServer())
          .post(`/patients/${patientId}/anamnesis`)
          .set('Authorization', `Bearer ${token}`)
          .send({ description: 'Valid description' })
          .expect(400);
      });

      it('returns 400 when description is missing', async () => {
        await request(app.getHttpServer())
          .post(`/patients/${patientId}/anamnesis`)
          .set('Authorization', `Bearer ${token}`)
          .send({ title: 'Valid title' })
          .expect(400);
      });

      it('returns 400 when title has only whitespace', async () => {
        await request(app.getHttpServer())
          .post(`/patients/${patientId}/anamnesis`)
          .set('Authorization', `Bearer ${token}`)
          .send({ title: '   ', description: 'Valid description' })
          .expect(400);
      });

      it('returns 400 when description has only whitespace', async () => {
        await request(app.getHttpServer())
          .post(`/patients/${patientId}/anamnesis`)
          .set('Authorization', `Bearer ${token}`)
          .send({ title: 'Valid title', description: '   ' })
          .expect(400);
      });

      it('returns 400 when both title and description have only whitespace', async () => {
        await request(app.getHttpServer())
          .post(`/patients/${patientId}/anamnesis`)
          .set('Authorization', `Bearer ${token}`)
          .send({ title: '   ', description: '   ' })
          .expect(400);
      });

      it('returns 400 when title is a number', async () => {
        await request(app.getHttpServer())
          .post(`/patients/${patientId}/anamnesis`)
          .set('Authorization', `Bearer ${token}`)
          .send({ title: 123456, description: 'Valid description' })
          .expect(400);
      });

      it('returns 400 when title is an object', async () => {
        await request(app.getHttpServer())
          .post(`/patients/${patientId}/anamnesis`)
          .set('Authorization', `Bearer ${token}`)
          .send({ title: {}, description: 'Valid description' })
          .expect(400);
      });

      it('returns 400 when title is an array', async () => {
        await request(app.getHttpServer())
          .post(`/patients/${patientId}/anamnesis`)
          .set('Authorization', `Bearer ${token}`)
          .send({ title: [], description: 'Valid description' })
          .expect(400);
      });

      it('returns 400 when description is a number', async () => {
        await request(app.getHttpServer())
          .post(`/patients/${patientId}/anamnesis`)
          .set('Authorization', `Bearer ${token}`)
          .send({ title: 'Valid title', description: 123456 })
          .expect(400);
      });

      it('returns 400 when description is an object', async () => {
        await request(app.getHttpServer())
          .post(`/patients/${patientId}/anamnesis`)
          .set('Authorization', `Bearer ${token}`)
          .send({ title: 'Valid title', description: {} })
          .expect(400);
      });

      it('returns 400 when description is an array', async () => {
        await request(app.getHttpServer())
          .post(`/patients/${patientId}/anamnesis`)
          .set('Authorization', `Bearer ${token}`)
          .send({ title: 'Valid title', description: [] })
          .expect(400);
      });
    });
  });

  describe('GET /patients/:patientId/anamnesis', () => {
    describe('Success cases', () => {
      it('returns document with items', async () => {
        const res = await request(app.getHttpServer())
          .get(`/patients/${patientId}/anamnesis`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);
        expect(res.body).toHaveProperty('id');
        expect(res.body).toHaveProperty('patientId', patientId);
        expect(Array.isArray(res.body.items)).toBe(true);
        expect(res.body.items.length).toBeGreaterThanOrEqual(1);
      });
    });

    describe('Error cases (3.2)', () => {
      it('returns 400 when patientId is invalid format', async () => {
        await request(app.getHttpServer())
          .get(`/patients/123/anamnesis`)
          .set('Authorization', `Bearer ${token}`)
          .expect(400);
      });

      it('returns 404 when patientId does not exist', async () => {
        await request(app.getHttpServer())
          .get(`/patients/${nonExistentPatientId}/anamnesis`)
          .set('Authorization', `Bearer ${token}`)
          .expect(404);
      });

      it('returns 404 when anamnesis document does not exist for patient', async () => {
        // Create a new patient without anamnesis
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
          .get(`/patients/${newPatient.body.id}/anamnesis`)
          .set('Authorization', `Bearer ${token}`)
          .expect(404);
      });
    });
  });

  describe('PATCH /patients/:patientId/anamnesis/:itemId', () => {
    describe('Success cases (4.3)', () => {
      it('updates only the title', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/patients/${patientId}/anamnesis/${itemId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ title: 'Updated Title Only' })
          .expect(200);
        expect(Array.isArray(res.body.items)).toBe(true);
        const updated = res.body.items.find(
          (p: any) => String(p._id || p.id) === String(itemId),
        );
        expect(updated).toBeTruthy();
        expect(updated.title).toBe('Updated Title Only');
      });

      it('updates only the description', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/patients/${patientId}/anamnesis/${itemId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ description: 'Updated Description Only' })
          .expect(200);
        expect(Array.isArray(res.body.items)).toBe(true);
        const updated = res.body.items.find(
          (p: any) => String(p._id || p.id) === String(itemId),
        );
        expect(updated).toBeTruthy();
        expect(updated.description).toBe('Updated Description Only');
      });

      it('updates both title and description simultaneously', async () => {
        const res = await request(app.getHttpServer())
          .patch(`/patients/${patientId}/anamnesis/${itemId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            title: 'Both Updated',
            description: 'Both fields updated together',
          })
          .expect(200);
        expect(Array.isArray(res.body.items)).toBe(true);
        const updated = res.body.items.find(
          (p: any) => String(p._id || p.id) === String(itemId),
        );
        expect(updated).toBeTruthy();
        expect(updated.title).toBe('Both Updated');
        expect(updated.description).toBe('Both fields updated together');
      });

      it('returns current state when no changes are made', async () => {
        const beforeRes = await request(app.getHttpServer())
          .get(`/patients/${patientId}/anamnesis`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);
        const currentItem = beforeRes.body.items.find(
          (p: any) => String(p._id || p.id) === String(itemId),
        );

        const res = await request(app.getHttpServer())
          .patch(`/patients/${patientId}/anamnesis/${itemId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            title: currentItem.title,
            description: currentItem.description,
          })
          .expect(200);
        expect(Array.isArray(res.body.items)).toBe(true);
        const updated = res.body.items.find(
          (p: any) => String(p._id || p.id) === String(itemId),
        );
        expect(updated.title).toBe(currentItem.title);
        expect(updated.description).toBe(currentItem.description);
      });

      it('only updates the specific item, leaving others unchanged', async () => {
        // Create another item first
        const createRes = await request(app.getHttpServer())
          .post(`/patients/${patientId}/anamnesis`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            title: 'Second Item',
            description: 'This should not change',
          })
          .expect(201);
        const secondItemId = String(
          createRes.body.items[createRes.body.items.length - 1]._id ||
            createRes.body.items[createRes.body.items.length - 1].id,
        );

        // Update the first item
        await request(app.getHttpServer())
          .patch(`/patients/${patientId}/anamnesis/${itemId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ title: 'First Item Updated' })
          .expect(200);

        // Verify second item is unchanged
        const getRes = await request(app.getHttpServer())
          .get(`/patients/${patientId}/anamnesis`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);
        const secondItem = getRes.body.items.find(
          (p: any) => String(p._id || p.id) === String(secondItemId),
        );
        expect(secondItem).toBeTruthy();
        expect(secondItem.title).toBe('Second Item');
        expect(secondItem.description).toBe('This should not change');
      });
    });

    describe('Field validation (4.2)', () => {
      it('returns 400 when updating title with empty string', async () => {
        await request(app.getHttpServer())
          .patch(`/patients/${patientId}/anamnesis/${itemId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ title: '' })
          .expect(400);
      });

      it('returns 400 when updating description with empty string', async () => {
        await request(app.getHttpServer())
          .patch(`/patients/${patientId}/anamnesis/${itemId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ description: '' })
          .expect(400);
      });

      it('returns 400 when updating title with only whitespace', async () => {
        await request(app.getHttpServer())
          .patch(`/patients/${patientId}/anamnesis/${itemId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ title: '   ' })
          .expect(400);
      });

      it('returns 400 when updating description with only whitespace', async () => {
        await request(app.getHttpServer())
          .patch(`/patients/${patientId}/anamnesis/${itemId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ description: '   ' })
          .expect(400);
      });

      it('returns 400 when updating title with a number', async () => {
        await request(app.getHttpServer())
          .patch(`/patients/${patientId}/anamnesis/${itemId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ title: 123456 })
          .expect(400);
      });

      it('returns 400 when updating title with an object', async () => {
        await request(app.getHttpServer())
          .patch(`/patients/${patientId}/anamnesis/${itemId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ title: {} })
          .expect(400);
      });

      it('returns 400 when updating title with an array', async () => {
        await request(app.getHttpServer())
          .patch(`/patients/${patientId}/anamnesis/${itemId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ title: [] })
          .expect(400);
      });

      it('returns 400 when updating description with a number', async () => {
        await request(app.getHttpServer())
          .patch(`/patients/${patientId}/anamnesis/${itemId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ description: 123456 })
          .expect(400);
      });

      it('returns 400 when updating description with an object', async () => {
        await request(app.getHttpServer())
          .patch(`/patients/${patientId}/anamnesis/${itemId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ description: {} })
          .expect(400);
      });

      it('returns 400 when updating description with an array', async () => {
        await request(app.getHttpServer())
          .patch(`/patients/${patientId}/anamnesis/${itemId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ description: [] })
          .expect(400);
      });
    });

    describe('Error cases (4.4)', () => {
      it('returns 400 when patientId is invalid format', async () => {
        await request(app.getHttpServer())
          .patch(`/patients/123/anamnesis/${itemId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ title: 'Test' })
          .expect(400);
      });

      it('returns 400 when itemId is invalid format', async () => {
        await request(app.getHttpServer())
          .patch(`/patients/${patientId}/anamnesis/123`)
          .set('Authorization', `Bearer ${token}`)
          .send({ title: 'Test' })
          .expect(400);
      });

      it('returns 404 when patientId does not exist', async () => {
        await request(app.getHttpServer())
          .patch(`/patients/${nonExistentPatientId}/anamnesis/${itemId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ title: 'Test' })
          .expect(404);
      });

      it('returns 404 when itemId does not exist', async () => {
        await request(app.getHttpServer())
          .patch(`/patients/${patientId}/anamnesis/${nonExistentItemId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ title: 'Test' })
          .expect(404);
      });
    });
  });

  describe('Authentication (5.1)', () => {
    describe('POST /patients/:patientId/anamnesis', () => {
      it('returns 401 when no token is provided', async () => {
        await request(app.getHttpServer())
          .post(`/patients/${patientId}/anamnesis`)
          .send({
            title: 'Test',
            description: 'Test description',
          })
          .expect(401);
      });

      it('returns 401 when invalid token is provided', async () => {
        await request(app.getHttpServer())
          .post(`/patients/${patientId}/anamnesis`)
          .set('Authorization', 'Bearer invalid-token-12345')
          .send({
            title: 'Test',
            description: 'Test description',
          })
          .expect(401);
      });

      it('returns 401 when token format is incorrect', async () => {
        await request(app.getHttpServer())
          .post(`/patients/${patientId}/anamnesis`)
          .set('Authorization', 'InvalidFormat token')
          .send({
            title: 'Test',
            description: 'Test description',
          })
          .expect(401);
      });
    });

    describe('GET /patients/:patientId/anamnesis', () => {
      it('returns 401 when no token is provided', async () => {
        await request(app.getHttpServer())
          .get(`/patients/${patientId}/anamnesis`)
          .expect(401);
      });

      it('returns 401 when invalid token is provided', async () => {
        await request(app.getHttpServer())
          .get(`/patients/${patientId}/anamnesis`)
          .set('Authorization', 'Bearer invalid-token-12345')
          .expect(401);
      });

      it('returns 401 when token format is incorrect', async () => {
        await request(app.getHttpServer())
          .get(`/patients/${patientId}/anamnesis`)
          .set('Authorization', 'InvalidFormat token')
          .expect(401);
      });
    });

    describe('PATCH /patients/:patientId/anamnesis/:itemId', () => {
      it('returns 401 when no token is provided', async () => {
        await request(app.getHttpServer())
          .patch(`/patients/${patientId}/anamnesis/${itemId}`)
          .send({ title: 'Test' })
          .expect(401);
      });

      it('returns 401 when invalid token is provided', async () => {
        await request(app.getHttpServer())
          .patch(`/patients/${patientId}/anamnesis/${itemId}`)
          .set('Authorization', 'Bearer invalid-token-12345')
          .send({ title: 'Test' })
          .expect(401);
      });

      it('returns 401 when token format is incorrect', async () => {
        await request(app.getHttpServer())
          .patch(`/patients/${patientId}/anamnesis/${itemId}`)
          .set('Authorization', 'InvalidFormat token')
          .send({ title: 'Test' })
          .expect(401);
      });
    });
  });

  describe('Authorization (5.2)', () => {
    describe('POST /patients/:patientId/anamnesis', () => {
      it('returns 403 when user tries to create item for another user patient', async () => {
        await request(app.getHttpServer())
          .post(`/patients/${patientId}/anamnesis`)
          .set('Authorization', `Bearer ${token2}`)
          .send({ title: 'Hack', description: 'Attempt' })
          .expect(403);
      });
    });

    describe('GET /patients/:patientId/anamnesis', () => {
      it('returns 403 when user tries to access another user patient anamnesis', async () => {
        await request(app.getHttpServer())
          .get(`/patients/${patientId}/anamnesis`)
          .set('Authorization', `Bearer ${token2}`)
          .expect(403);
      });
    });

    describe('PATCH /patients/:patientId/anamnesis/:itemId', () => {
      it('returns 403 when user tries to update item from another user patient', async () => {
        await request(app.getHttpServer())
          .patch(`/patients/${patientId}/anamnesis/${itemId}`)
          .set('Authorization', `Bearer ${token2}`)
          .send({ title: 'Hack2' })
          .expect(403);
      });
    });

    describe('Cross-user access scenarios', () => {
      it('user can access their own patient anamnesis', async () => {
        await request(app.getHttpServer())
          .get(`/patients/${patientId}/anamnesis`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);
      });

      it('user cannot access another user patient anamnesis', async () => {
        await request(app.getHttpServer())
          .get(`/patients/${patientId2}/anamnesis`)
          .set('Authorization', `Bearer ${token}`)
          .expect(403);
      });

      it('user can create item for their own patient', async () => {
        await request(app.getHttpServer())
          .post(`/patients/${patientId}/anamnesis`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            title: 'Own Patient Item',
            description: 'This should work',
          })
          .expect(201);
      });

      it('user cannot create item for another user patient', async () => {
        await request(app.getHttpServer())
          .post(`/patients/${patientId2}/anamnesis`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            title: 'Other Patient Item',
            description: 'This should fail',
          })
          .expect(403);
      });
    });
  });

  describe('Data relationships (6.1)', () => {
    it('anamnesis document is correctly linked to patient', async () => {
      const res = await request(app.getHttpServer())
        .get(`/patients/${patientId}/anamnesis`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(res.body.patientId).toBe(patientId);
    });

    it('anamnesis patientId in response matches the requested patientId', async () => {
      const res = await request(app.getHttpServer())
        .post(`/patients/${patientId}/anamnesis`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Relationship Test',
          description: 'Testing patient relationship',
        })
        .expect(201);
      expect(res.body.patientId).toBe(patientId);
    });

    it('multiple items belong to the same anamnesis document', async () => {
      const firstRes = await request(app.getHttpServer())
        .post(`/patients/${patientId}/anamnesis`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'First Item',
          description: 'First description',
        })
        .expect(201);
      const firstDocId = firstRes.body.id;

      const secondRes = await request(app.getHttpServer())
        .post(`/patients/${patientId}/anamnesis`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Second Item',
          description: 'Second description',
        })
        .expect(201);
      const secondDocId = secondRes.body.id;

      // Both should return the same document ID
      expect(firstDocId).toBe(secondDocId);
      expect(secondRes.body.items.length).toBeGreaterThan(
        firstRes.body.items.length,
      );
    });

    it('anamnesis items maintain correct patient association after updates', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/patients/${patientId}/anamnesis/${itemId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Updated Item' })
        .expect(200);
      expect(res.body.patientId).toBe(patientId);
    });
  });
});
