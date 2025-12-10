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
  let patientId: string;
  let itemId: string;

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
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  it('POST /patients/:patientId/anamnesis creates item and returns doc', async () => {
    const res = await request(app.getHttpServer())
      .post(`/patients/${patientId}/anamnesis`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Avaliação inicial',
        description:
          'Paciente relata dores lombares leves, rotina sedentária e sono irregular.',
      })
      .expect(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('patientId', patientId);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeGreaterThanOrEqual(1);
    itemId = String(res.body.items[0]._id || res.body.items[0].id);
    expect(itemId).toBeTruthy();
  });

  it('GET /patients/:patientId/anamnesis returns document with items', async () => {
    const res = await request(app.getHttpServer())
      .get(`/patients/${patientId}/anamnesis`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('patientId', patientId);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeGreaterThanOrEqual(1);
  });

  it('PATCH /patients/:patientId/anamnesis/:itemId updates title', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/patients/${patientId}/anamnesis/${itemId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Follow-up 30 dias' })
      .expect(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    const updated = res.body.items.find(
      (p: any) => String(p._id || p.id) === String(itemId),
    );
    expect(updated).toBeTruthy();
    expect(updated.title).toBe('Follow-up 30 dias');
  });

  it('PATCH invalid itemId returns 400', async () => {
    await request(app.getHttpServer())
      .patch(`/patients/${patientId}/anamnesis/123`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Bad' })
      .expect(400);
  });

  it('POST invalid payload returns 400', async () => {
    await request(app.getHttpServer())
      .post(`/patients/${patientId}/anamnesis`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '', description: '' })
      .expect(400);
  });

  it('GET invalid patientId returns 400', async () => {
    await request(app.getHttpServer())
      .get(`/patients/123/anamnesis`)
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
  });

  it('Cross-user access is forbidden (403)', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'other.anam@example.com', password: 'StrongPass123' })
      .expect(201);
    const login2 = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'other.anam@example.com', password: 'StrongPass123' })
      .expect(200);
    const token2: string = login2.body.access_token;

    await request(app.getHttpServer())
      .post(`/patients/${patientId}/anamnesis`)
      .set('Authorization', `Bearer ${token2}`)
      .send({ title: 'Hack', description: 'Attempt' })
      .expect(403);
    await request(app.getHttpServer())
      .get(`/patients/${patientId}/anamnesis`)
      .set('Authorization', `Bearer ${token2}`)
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/patients/${patientId}/anamnesis/${itemId}`)
      .set('Authorization', `Bearer ${token2}`)
      .send({ title: 'Hack2' })
      .expect(403);
  });
});
