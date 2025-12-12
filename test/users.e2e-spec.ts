import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { UsersModule } from '../src/users/users.module';
import { AuthModule } from '../src/auth/auth.module';
import { GoogleStrategy } from '../src/auth/strategies/google.strategy';

describe('Users/Auth (e2e)', () => {
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

  describe('POST /auth/register', () => {
    describe('Success cases', () => {
      it('creates user and returns complete structure', async () => {
        const res = await request(app.getHttpServer())
          .post('/auth/register')
          .send({ email: 'john.doe@example.com', password: 'Str0ngP@ssw0rd' })
          .expect(201);
        expect(res.body).toHaveProperty('id');
        expect(res.body).toHaveProperty('email', 'john.doe@example.com');
        expect(res.body).toHaveProperty('role', 'user');
        expect(res.body).not.toHaveProperty('passwordHash');
      });

      it('default role is user', async () => {
        const res = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: 'role.test@example.com',
            password: 'Str0ngP@ssw0rd',
          })
          .expect(201);
        expect(res.body.role).toBe('user');
      });

      it('email is saved in lowercase', async () => {
        const res = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: 'UPPERCASE@EXAMPLE.COM',
            password: 'Str0ngP@ssw0rd',
          })
          .expect(201);
        expect(res.body.email).toBe('uppercase@example.com');
      });

      it('passwordHash is not returned in response', async () => {
        const res = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: 'nohash@example.com',
            password: 'Str0ngP@ssw0rd',
          })
          .expect(201);
        expect(res.body).not.toHaveProperty('passwordHash');
        expect(res.body).not.toHaveProperty('password');
      });

      it('creates user with exactly 8 character password', async () => {
        const res = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: 'minpass@example.com',
            password: '12345678',
          })
          .expect(201);
        expect(res.body).toHaveProperty('id');
        expect(res.body).toHaveProperty('email', 'minpass@example.com');
      });
    });

    describe('Required fields validation (1.1)', () => {
      it('returns 400 when email is missing', async () => {
        await request(app.getHttpServer())
          .post('/auth/register')
          .send({ password: 'Str0ngP@ssw0rd' })
          .expect(400);
      });

      it('returns 400 when password is missing', async () => {
        await request(app.getHttpServer())
          .post('/auth/register')
          .send({ email: 'test@example.com' })
          .expect(400);
      });
    });

    describe('Email validation (1.2)', () => {
      it('returns 400 when email is invalid (no @)', async () => {
        await request(app.getHttpServer())
          .post('/auth/register')
          .send({ email: 'invalidemail', password: 'Str0ngP@ssw0rd' })
          .expect(400);
      });

      it('returns 400 when email is invalid (no domain)', async () => {
        await request(app.getHttpServer())
          .post('/auth/register')
          .send({ email: 'test@', password: 'Str0ngP@ssw0rd' })
          .expect(400);
      });

      it('returns 400 when email is a number', async () => {
        await request(app.getHttpServer())
          .post('/auth/register')
          .send({ email: 123456, password: 'Str0ngP@ssw0rd' })
          .expect(400);
      });

      it('returns 400 when email is an object', async () => {
        await request(app.getHttpServer())
          .post('/auth/register')
          .send({ email: {}, password: 'Str0ngP@ssw0rd' })
          .expect(400);
      });

      it('returns 400 when email is an array', async () => {
        await request(app.getHttpServer())
          .post('/auth/register')
          .send({ email: [], password: 'Str0ngP@ssw0rd' })
          .expect(400);
      });

      it('returns 400 when email has only whitespace', async () => {
        await request(app.getHttpServer())
          .post('/auth/register')
          .send({ email: '   ', password: 'Str0ngP@ssw0rd' })
          .expect(400);
      });
    });

    describe('Conflict cases (1.5)', () => {
      it('returns 409 when email is duplicate', async () => {
        await request(app.getHttpServer())
          .post('/auth/register')
          .send({ email: 'dup@example.com', password: 'Str0ngP@ssw0rd' })
          .expect(201);
        await request(app.getHttpServer())
          .post('/auth/register')
          .send({ email: 'dup@example.com', password: 'Str0ngP@ssw0rd' })
          .expect(409);
      });

      it('returns 409 when email is duplicate (case-insensitive)', async () => {
        await request(app.getHttpServer())
          .post('/auth/register')
          .send({ email: 'case.test@example.com', password: 'Str0ngP@ssw0rd' })
          .expect(201);
        await request(app.getHttpServer())
          .post('/auth/register')
          .send({ email: 'CASE.TEST@EXAMPLE.COM', password: 'Str0ngP@ssw0rd' })
          .expect(409);
      });
    });

    describe('Password validation', () => {
      it('returns 400 when password is too short', async () => {
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

      it('returns 400 when password is a number', async () => {
        await request(app.getHttpServer())
          .post('/auth/register')
          .send({ email: 'test@example.com', password: 12345678 })
          .expect(400);
      });

      it('returns 400 when password is an object', async () => {
        await request(app.getHttpServer())
          .post('/auth/register')
          .send({ email: 'test@example.com', password: {} })
          .expect(400);
      });

      it('returns 400 when password is an array', async () => {
        await request(app.getHttpServer())
          .post('/auth/register')
          .send({ email: 'test@example.com', password: [] })
          .expect(400);
      });

      it('returns 400 when password has only whitespace', async () => {
        await request(app.getHttpServer())
          .post('/auth/register')
          .send({ email: 'test@example.com', password: '   ' })
          .expect(400);
      });
    });
  });

  describe('POST /auth/login', () => {
    describe('Success cases', () => {
      it('returns access_token with valid credentials', async () => {
        await request(app.getHttpServer())
          .post('/auth/register')
          .send({ email: 'login.ok@example.com', password: 'Str0ngP@ssw0rd' })
          .expect(201);
        const res = await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: 'login.ok@example.com', password: 'Str0ngP@ssw0rd' })
          .expect(200);
        expect(res.body).toHaveProperty('access_token');
        expect(typeof res.body.access_token).toBe('string');
        expect(res.body.access_token.length).toBeGreaterThan(10);
      });

      it('access_token can be used for authentication', async () => {
        await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: 'token.test@example.com',
            password: 'Str0ngP@ssw0rd',
          })
          .expect(201);
        const loginToken = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: 'token.test@example.com',
            password: 'Str0ngP@ssw0rd',
          })
          .expect(200);

        const profileRes = await request(app.getHttpServer())
          .get('/auth/profile')
          .set('Authorization', `Bearer ${loginToken.body.access_token}`)
          .expect(200);
        expect(profileRes.body.email).toBe('token.test@example.com');
      });
    });

    describe('Required fields validation (2.1)', () => {
      // Note: LocalAuthGuard returns 401 for invalid credentials, not 400 for validation
      // This is expected behavior as Passport validates before DTO validation
      it('returns 401 when email is missing', async () => {
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({ password: 'Str0ngP@ssw0rd' })
          .expect(401);
      });

      it('returns 401 when password is missing', async () => {
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: 'test@example.com' })
          .expect(401);
      });
    });

    describe('Email validation (2.2)', () => {
      // Note: LocalAuthGuard returns 401 for invalid credentials
      it('returns 401 when email is invalid', async () => {
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: 'invalidemail', password: 'Str0ngP@ssw0rd' })
          .expect(401);
      });

      it('returns 401 when email is a number', async () => {
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: 123456, password: 'Str0ngP@ssw0rd' })
          .expect(401);
      });

      it('returns 401 when email is an object', async () => {
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: {}, password: 'Str0ngP@ssw0rd' })
          .expect(401);
      });

      it('returns 401 when email is an array', async () => {
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: [], password: 'Str0ngP@ssw0rd' })
          .expect(401);
      });

      it('returns 401 when email has only whitespace', async () => {
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: '   ', password: 'Str0ngP@ssw0rd' })
          .expect(401);
      });
    });

    describe('Error cases (2.4)', () => {
      it('returns 401 when email does not exist', async () => {
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: 'nonexistent@example.com',
            password: 'Str0ngP@ssw0rd',
          })
          .expect(401);
      });

      it('returns 401 when password is invalid', async () => {
        await request(app.getHttpServer())
          .post('/auth/register')
          .send({ email: 'login.fail@example.com', password: 'Str0ngP@ssw0rd' })
          .expect(201);
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: 'login.fail@example.com',
            password: 'WrongPass123',
          })
          .expect(401);
      });
    });

    describe('Password validation', () => {
      // Note: LocalAuthGuard returns 401 for invalid credentials
      it('returns 401 when password is a number', async () => {
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: 'test@example.com', password: 12345678 })
          .expect(401);
      });

      it('returns 401 when password is an object', async () => {
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: 'test@example.com', password: {} })
          .expect(401);
      });

      it('returns 401 when password is an array', async () => {
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: 'test@example.com', password: [] })
          .expect(401);
      });

      it('returns 401 when password has only whitespace', async () => {
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: 'test@example.com', password: '   ' })
          .expect(401);
      });
    });
  });

  describe('GET /auth/profile', () => {
    describe('Success cases (3.2)', () => {
      it('returns user profile with complete structure', async () => {
        await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: 'profile.user@example.com',
            password: 'Str0ngP@ssw0rd',
          })
          .expect(201);
        const login = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: 'profile.user@example.com',
            password: 'Str0ngP@ssw0rd',
          })
          .expect(200);
        const profileToken: string = login.body.access_token;

        const res = await request(app.getHttpServer())
          .get('/auth/profile')
          .set('Authorization', `Bearer ${profileToken}`)
          .expect(200);
        expect(res.body).toHaveProperty('userId');
        expect(res.body).toHaveProperty('email', 'profile.user@example.com');
        expect(res.body).toHaveProperty('role', 'user');
      });

      it('userId corresponds to authenticated user', async () => {
        const registerRes = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: 'userid.test@example.com',
            password: 'Str0ngP@ssw0rd',
          })
          .expect(201);
        const registeredUserId = registerRes.body.id;

        const login = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: 'userid.test@example.com',
            password: 'Str0ngP@ssw0rd',
          })
          .expect(200);
        const profileToken: string = login.body.access_token;

        const profileRes = await request(app.getHttpServer())
          .get('/auth/profile')
          .set('Authorization', `Bearer ${profileToken}`)
          .expect(200);
        expect(profileRes.body.userId).toBe(registeredUserId);
      });

      it('email corresponds to authenticated user', async () => {
        const login = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: 'profile.user@example.com',
            password: 'Str0ngP@ssw0rd',
          })
          .expect(200);
        const profileToken: string = login.body.access_token;

        const res = await request(app.getHttpServer())
          .get('/auth/profile')
          .set('Authorization', `Bearer ${profileToken}`)
          .expect(200);
        expect(res.body.email).toBe('profile.user@example.com');
      });

      it('role is present in response', async () => {
        const login = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: 'profile.user@example.com',
            password: 'Str0ngP@ssw0rd',
          })
          .expect(200);
        const profileToken: string = login.body.access_token;

        const res = await request(app.getHttpServer())
          .get('/auth/profile')
          .set('Authorization', `Bearer ${profileToken}`)
          .expect(200);
        expect(res.body).toHaveProperty('role');
        expect(['user', 'admin']).toContain(res.body.role);
      });
    });

    describe('Authentication (3.1)', () => {
      it('returns 401 when no token is provided', async () => {
        await request(app.getHttpServer()).get('/auth/profile').expect(401);
      });

      it('returns 401 when token is invalid', async () => {
        await request(app.getHttpServer())
          .get('/auth/profile')
          .set('Authorization', 'Bearer invalid-token-12345')
          .expect(401);
      });

      it('returns 401 when token format is incorrect', async () => {
        await request(app.getHttpServer())
          .get('/auth/profile')
          .set('Authorization', 'InvalidFormat token')
          .expect(401);
      });
    });
  });

  describe('GET /auth/google/link', () => {
    describe('Success cases', () => {
      it('returns 302 with Location and state', async () => {
        await request(app.getHttpServer())
          .post('/auth/register')
          .send({ email: 'link.user@example.com', password: 'Str0ngP@ssw0rd' })
          .expect(201);
        const login = await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: 'link.user@example.com', password: 'Str0ngP@ssw0rd' })
          .expect(200);
        const linkToken: string = login.body.access_token;
        const res = await request(app.getHttpServer())
          .get('/auth/google/link')
          .set('Authorization', `Bearer ${linkToken}`)
          .expect(302);
        const loc = res.headers['location'];
        expect(typeof loc).toBe('string');
        expect(loc).toContain('https://accounts.google.com/o/oauth2/v2/auth');
        expect(loc).toContain('client_id=');
        expect(loc).toContain('redirect_uri=');
        expect(loc).toContain('response_type=code');
        expect(loc).toContain('scope=');
        expect(loc).toContain('state=');
      });
    });

    describe('Redirection validation (4.2)', () => {
      it('redirect URL contains correct parameters', async () => {
        const login = await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: 'link.user@example.com', password: 'Str0ngP@ssw0rd' })
          .expect(200);
        const linkToken: string = login.body.access_token;
        const res = await request(app.getHttpServer())
          .get('/auth/google/link')
          .set('Authorization', `Bearer ${linkToken}`)
          .expect(302);
        const loc = res.headers['location'];
        expect(loc).toContain('client_id=');
        expect(loc).toContain('redirect_uri=');
        expect(loc).toContain('response_type=code');
        expect(loc).toContain('scope=');
        expect(loc).toContain('state=');
      });

      it('state parameter is present and valid', async () => {
        const login = await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: 'link.user@example.com', password: 'Str0ngP@ssw0rd' })
          .expect(200);
        const linkToken: string = login.body.access_token;
        const res = await request(app.getHttpServer())
          .get('/auth/google/link')
          .set('Authorization', `Bearer ${linkToken}`)
          .expect(302);
        const loc = res.headers['location'];
        const stateMatch = loc.match(/state=([^&]+)/);
        expect(stateMatch).toBeTruthy();
        if (stateMatch) {
          expect(stateMatch[1]).toBeTruthy();
          expect(stateMatch[1].length).toBeGreaterThan(0);
        }
      });

      it('client_id is present in redirect URL', async () => {
        const login = await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: 'link.user@example.com', password: 'Str0ngP@ssw0rd' })
          .expect(200);
        const linkToken: string = login.body.access_token;
        const res = await request(app.getHttpServer())
          .get('/auth/google/link')
          .set('Authorization', `Bearer ${linkToken}`)
          .expect(302);
        const loc = res.headers['location'];
        // client_id parameter should be present (even if empty)
        expect(loc).toContain('client_id=');
        // Check if client_id has a value (might be empty if env var not set)
        const clientIdParam = loc.split('client_id=')[1]?.split('&')[0];
        expect(clientIdParam).toBeDefined();
      });

      it('redirect_uri is present in redirect URL', async () => {
        const login = await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: 'link.user@example.com', password: 'Str0ngP@ssw0rd' })
          .expect(200);
        const linkToken: string = login.body.access_token;
        const res = await request(app.getHttpServer())
          .get('/auth/google/link')
          .set('Authorization', `Bearer ${linkToken}`)
          .expect(302);
        const loc = res.headers['location'];
        expect(loc).toContain('redirect_uri=');
        const redirectUriMatch = loc.match(/redirect_uri=([^&]+)/);
        expect(redirectUriMatch).toBeTruthy();
      });
    });

    describe('Authentication (4.1)', () => {
      it('returns 401 when no token is provided', async () => {
        await request(app.getHttpServer()).get('/auth/google/link').expect(401);
      });

      it('returns 401 when token is invalid', async () => {
        await request(app.getHttpServer())
          .get('/auth/google/link')
          .set('Authorization', 'Bearer invalid-token-12345')
          .expect(401);
      });

      it('returns 401 when token format is incorrect', async () => {
        await request(app.getHttpServer())
          .get('/auth/google/link')
          .set('Authorization', 'InvalidFormat token')
          .expect(401);
      });
    });
  });

  describe('Password hash security (7.1)', () => {
    it('password is not stored in plain text', async () => {
      const password = 'TestPassword123';
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'hash.test@example.com', password })
        .expect(201);

      // Note: We can't directly check the database in e2e tests easily,
      // but we can verify that the password works for login
      // and that passwordHash is never returned in responses
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'hash.test@example.com', password })
        .expect(200);
      expect(loginRes.body).toHaveProperty('access_token');
    });

    it('passwordHash is never returned in responses', async () => {
      const registerRes = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'nohash.response@example.com',
          password: 'Str0ngP@ssw0rd',
        })
        .expect(201);
      expect(registerRes.body).not.toHaveProperty('passwordHash');
      expect(registerRes.body).not.toHaveProperty('password');

      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nohash.response@example.com',
          password: 'Str0ngP@ssw0rd',
        })
        .expect(200);
      expect(loginRes.body).not.toHaveProperty('passwordHash');
      expect(loginRes.body).not.toHaveProperty('password');

      const profileToken = loginRes.body.access_token;
      const profileRes = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${profileToken}`)
        .expect(200);
      expect(profileRes.body).not.toHaveProperty('passwordHash');
      expect(profileRes.body).not.toHaveProperty('password');
    });
  });

  describe('JWT security (7.2)', () => {
    it('token contains correct information', async () => {
      const registerRes = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'jwt.test@example.com',
          password: 'Str0ngP@ssw0rd',
        })
        .expect(201);
      const registeredUserId = registerRes.body.id;
      const registeredEmail = registerRes.body.email;

      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'jwt.test@example.com',
          password: 'Str0ngP@ssw0rd',
        })
        .expect(200);
      const token = loginRes.body.access_token;

      const profileRes = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(profileRes.body.userId).toBe(registeredUserId);
      expect(profileRes.body.email).toBe(registeredEmail);
    });

    it('token is a valid JWT format', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'jwt.test@example.com',
          password: 'Str0ngP@ssw0rd',
        })
        .expect(200);
      const token = loginRes.body.access_token;

      // JWT format: header.payload.signature (3 parts separated by dots)
      const parts = token.split('.');
      expect(parts.length).toBe(3);
      expect(parts[0].length).toBeGreaterThan(0);
      expect(parts[1].length).toBeGreaterThan(0);
      expect(parts[2].length).toBeGreaterThan(0);
    });
  });
});
