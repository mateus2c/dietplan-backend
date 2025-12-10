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
import { GoogleStrategy } from '../src/auth/strategies/google.strategy';

describe('Patients (e2e)', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let token: string;
  let patientId: string;

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
        RouterModule.register([
          {
            path: 'patients',
            module: PatientsModule,
            children: [
              { path: ':patientId/meal-plans', module: MealPlansModule },
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
      .send({ email: 'patients.user@example.com', password: 'StrongPass123' })
      .expect(201);
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'patients.user@example.com', password: 'StrongPass123' })
      .expect(200);
    token = login.body.access_token;
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  it('POST /patients creates patient', async () => {
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
    patientId = res.body.id;
  });

  it('GET /patients lists patients', async () => {
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

  it('GET /patients/:id returns patient', async () => {
    const res = await request(app.getHttpServer())
      .get(`/patients/${patientId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body).toHaveProperty('id', patientId);
    expect(res.body).toHaveProperty('email', 'jane.doe@example.com');
  });

  it('PATCH /patients/:id updates patient name', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/patients/${patientId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ fullName: 'Jane Doe Silva' })
      .expect(200);
    expect(res.body).toHaveProperty('id', patientId);
    expect(res.body).toHaveProperty('fullName', 'Jane Doe Silva');
  });

  it('PATCH /patients/:id updates patient gender', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/patients/${patientId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ gender: 'other' })
      .expect(200);
    expect(res.body).toHaveProperty('id', patientId);
    expect(res.body).toHaveProperty('gender', 'other');
  });

  it('PATCH /patients/:id updates patient birthDate', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/patients/${patientId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ birthDate: '1991-12-31' })
      .expect(200);
    expect(res.body).toHaveProperty('id', patientId);
    expect(String(res.body.birthDate)).toContain('1991-12-31');
  });

  it('PATCH /patients/:id updates patient phone', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/patients/${patientId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ phone: '+55 11 90000-9999' })
      .expect(200);
    expect(res.body).toHaveProperty('id', patientId);
    expect(res.body).toHaveProperty('phone', '+55 11 90000-9999');
  });

  it('PATCH /patients/:id updates patient email', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/patients/${patientId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'jane.updated@example.com' })
      .expect(200);
    expect(res.body).toHaveProperty('id', patientId);
    expect(res.body).toHaveProperty('email', 'jane.updated@example.com');
  });

  it('PATCH /patients/:id invalid fullName returns 400', async () => {
    await request(app.getHttpServer())
      .patch(`/patients/${patientId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ fullName: 'aa' })
      .expect(400);
  });

  it('PATCH /patients/:id invalid gender returns 400', async () => {
    await request(app.getHttpServer())
      .patch(`/patients/${patientId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ gender: 'invalid' })
      .expect(400);
  });

  it('PATCH /patients/:id invalid birthDate returns 400', async () => {
    await request(app.getHttpServer())
      .patch(`/patients/${patientId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ birthDate: 'not-a-date' })
      .expect(400);
  });

  it('PATCH /patients/:id invalid phone returns 400', async () => {
    await request(app.getHttpServer())
      .patch(`/patients/${patientId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ phone: '123' })
      .expect(400);
  });

  it('PATCH /patients/:id invalid email returns 400', async () => {
    await request(app.getHttpServer())
      .patch(`/patients/${patientId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'bad' })
      .expect(400);
  });

  it('PATCH /patients/:id with same values returns 200 unchanged', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/patients/${patientId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        fullName: 'Jane Doe Silva',
        gender: 'other',
        birthDate: '1991-12-31',
        phone: '+55 11 90000-9999',
        email: 'jane.updated@example.com',
      })
      .expect(200);
    expect(res.body).toHaveProperty('id', patientId);
    expect(res.body).toHaveProperty('fullName', 'Jane Doe Silva');
    expect(res.body).toHaveProperty('gender', 'other');
    expect(String(res.body.birthDate)).toContain('1991-12-31');
    expect(res.body).toHaveProperty('phone', '+55 11 90000-9999');
    expect(res.body).toHaveProperty('email', 'jane.updated@example.com');
  });

  it('POST /patients invalid phone returns 400', async () => {
    await request(app.getHttpServer())
      .post('/patients')
      .set('Authorization', `Bearer ${token}`)
      .send({
        fullName: 'Invalid Phone',
        gender: 'other',
        birthDate: '1995-10-10',
        phone: 'invalid',
        email: 'invalid.phone@example.com',
      })
      .expect(400);
  });

  it('POST /patients invalid email returns 400', async () => {
    await request(app.getHttpServer())
      .post('/patients')
      .set('Authorization', `Bearer ${token}`)
      .send({
        fullName: 'Invalid Email',
        gender: 'male',
        birthDate: '1994-07-07',
        phone: '+55 11 95555-5555',
        email: 'not-an-email',
      })
      .expect(400);
  });

  it('POST /patients create second patient for conflict checks', async () => {
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
  });

  it('Cross-user access is forbidden (404 on other user)', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'other.user@example.com', password: 'StrongPass123' })
      .expect(201);
    const login2 = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'other.user@example.com', password: 'StrongPass123' })
      .expect(200);
    const token2: string = login2.body.access_token;

    await request(app.getHttpServer())
      .get(`/patients/${patientId}`)
      .set('Authorization', `Bearer ${token2}`)
      .expect(404);
    await request(app.getHttpServer())
      .patch(`/patients/${patientId}`)
      .set('Authorization', `Bearer ${token2}`)
      .send({ fullName: 'Hack Attempt' })
      .expect(404);
    await request(app.getHttpServer())
      .delete(`/patients/${patientId}`)
      .set('Authorization', `Bearer ${token2}`)
      .expect(404);
    const listOther = await request(app.getHttpServer())
      .get('/patients')
      .set('Authorization', `Bearer ${token2}`)
      .expect(200);
    expect(Array.isArray(listOther.body.items)).toBe(true);
    expect(listOther.body.items.length).toBeGreaterThanOrEqual(0);
    expect(
      listOther.body.items.find((p: any) => p.id === patientId),
    ).toBeUndefined();
  });

  it('PATCH /patients/:id duplicate email returns 409', async () => {
    await request(app.getHttpServer())
      .patch(`/patients/${patientId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'john.roe@example.com' })
      .expect(409);
  });

  it('PATCH /patients/:id duplicate phone returns 409', async () => {
    await request(app.getHttpServer())
      .patch(`/patients/${patientId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ phone: '+55 11 90000-0001' })
      .expect(409);
  });

  it('DELETE /patients/:id deletes patient', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/patients/${patientId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body).toHaveProperty('deleted', true);
  });

  it('GET /patients/:id after delete returns 404', async () => {
    await request(app.getHttpServer())
      .get(`/patients/${patientId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  it('POST /patients without token returns 401', async () => {
    await request(app.getHttpServer())
      .post('/patients')
      .send({
        fullName: 'John Roe',
        gender: 'male',
        birthDate: '1992-01-01',
        phone: '+55 11 90000-0000',
        email: 'john.roe@example.com',
      })
      .expect(401);
  });

  it('GET /patients paginated returns 10 per page and correct totals', async () => {
    for (let i = 0; i < 13; i++) {
      await request(app.getHttpServer())
        .post('/patients')
        .set('Authorization', `Bearer ${token}`)
        .send({
          fullName: `Paging ${String(i + 1).padStart(2, '0')}`,
          gender: i % 2 === 0 ? 'male' : 'female',
          birthDate: '1990-01-01',
          phone: `+55 11 90000-${String(1000 + i)}`,
          email: `paging${i + 1}@example.com`,
        })
        .expect(201);
    }
    const page1 = await request(app.getHttpServer())
      .get('/patients?page=1')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(page1.body).toHaveProperty('page', 1);
    expect(page1.body).toHaveProperty('pageSize', 10);
    expect(page1.body.items.length).toBe(10);
    const page2 = await request(app.getHttpServer())
      .get('/patients?page=2')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(page2.body).toHaveProperty('page', 2);
    expect(page2.body.items.length).toBeGreaterThanOrEqual(1);
    expect(page2.body.items.length).toBeLessThanOrEqual(10);
    const total = page1.body.total;
    expect(total).toBeGreaterThanOrEqual(13);
    const totalPages = page1.body.totalPages;
    expect(totalPages).toBe(
      Math.max(1, Math.ceil(total / page1.body.pageSize)),
    );
  });

  it('GET /patients invalid page returns 400', async () => {
    await request(app.getHttpServer())
      .get('/patients?page=0')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
  });

  it('GET /patients with name filter returns only matches', async () => {
    const res = await request(app.getHttpServer())
      .get('/patients?page=1&name=Paging')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(
      res.body.items.every((p: any) => String(p.fullName).includes('Paging')),
    ).toBe(true);
  });

  it('GET /patients with email filter returns only matches', async () => {
    const res = await request(app.getHttpServer())
      .get('/patients?page=1&email=example.com')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(
      res.body.items.every((p: any) => String(p.email).includes('example.com')),
    ).toBe(true);
  });

  it('GET /patients with email filter is case-insensitive', async () => {
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

  it('GET /patients with email filter no matches returns empty', async () => {
    const res = await request(app.getHttpServer())
      .get('/patients?page=1&email=no-match-xyz')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.items.length).toBe(0);
    expect(res.body.total).toBe(0);
    expect(res.body.totalPages).toBe(1);
  });

  it('GET /patients with combined name+email filters returns intersection only', async () => {
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
    await request(app.getHttpServer())
      .post('/patients')
      .set('Authorization', `Bearer ${token}`)
      .send({
        fullName: 'Combo Filter Two',
        gender: 'male',
        birthDate: '1991-03-04',
        phone: '+55 11 90000-7778',
        email: 'other@example.com',
      })
      .expect(201);
    const res = await request(app.getHttpServer())
      .get('/patients?page=1&name=Combo%20Filter&email=combo@example.com')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.items.length).toBe(1);
    expect(res.body.items[0].email).toBe('combo@example.com');
    expect(String(res.body.items[0].fullName)).toContain('Combo Filter');
  });

  it('DELETE /patients cascades removal of meal-plans and anamnesis', async () => {
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

    const beforePlansRes = await request(app.getHttpServer())
      .get(`/patients/${pid}/meal-plans`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(beforePlansRes.body).toHaveProperty('patientId', pid);
    const beforeAnamRes = await request(app.getHttpServer())
      .get(`/patients/${pid}/anamnesis`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(beforeAnamRes.body).toHaveProperty('patientId', pid);

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

    // already validated above
  });
});
