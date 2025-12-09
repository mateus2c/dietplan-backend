import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { UsersModule } from '../src/users/users.module';
import { AuthModule } from '../src/auth/auth.module';
import { GoogleStrategy } from '../src/auth/strategies/google.strategy';

describe('Users - register (e2e)', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    const moduleBuilder = Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(uri, { dbName: 'dietplan_e2e' }),
        UsersModule,
        AuthModule,
      ],
    })
      .overrideProvider(GoogleStrategy)
      .useValue({});
    const moduleFixture: TestingModule = await moduleBuilder.compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  it('POST /auth/register creates user', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'john.doe@example.com', password: 'Str0ngP@ssw0rd' })
      .expect(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('email', 'john.doe@example.com');
    expect(res.body).toHaveProperty('role', 'user');
  });

  it('POST /auth/register duplicate email returns 409', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'dup@example.com', password: 'Str0ngP@ssw0rd' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'dup@example.com', password: 'Str0ngP@ssw0rd' })
      .expect(409);
  });

  it('POST /auth/register short password returns 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'short@example.com', password: 'short7' })
      .expect(400);
    expect(res.body).toHaveProperty('statusCode', 400);
    expect(
      Array.isArray(res.body.message)
        ? res.body.message.join(' ')
        : String(res.body.message),
    ).toContain('password must be longer than or equal to 8 characters');
  });

  it('POST /auth/login returns access_token with valid credentials', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'login.ok@example.com', password: 'Str0ngP@ssw0rd' })
      .expect(201);
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'login.ok@example.com', password: 'Str0ngP@ssw0rd' })
      .expect(201);
    expect(res.body).toHaveProperty('access_token');
    expect(typeof res.body.access_token).toBe('string');
    expect(res.body.access_token.length).toBeGreaterThan(10);
  });

  it('POST /auth/login invalid password returns 401', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'login.fail@example.com', password: 'Str0ngP@ssw0rd' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'login.fail@example.com', password: 'WrongPass123' })
      .expect(401);
  });

  it('GET /auth/profile with Bearer token returns user payload', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'profile.user@example.com', password: 'Str0ngP@ssw0rd' })
      .expect(201);
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'profile.user@example.com', password: 'Str0ngP@ssw0rd' })
      .expect(201);
    const token: string = login.body.access_token;
    const res = await request(app.getHttpServer())
      .get('/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body).toHaveProperty('userId');
    expect(res.body).toHaveProperty('email', 'profile.user@example.com');
    expect(res.body).toHaveProperty('role', 'user');
  });

  it('GET /auth/profile without token returns 401', async () => {
    await request(app.getHttpServer()).get('/auth/profile').expect(401);
  });
});
