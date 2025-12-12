import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { FoodsModule } from '../src/foods/foods.module';
import { Food } from '../src/foods/enums/food.enum';
import { getAllFoods } from '../src/foods/data/food-data';

describe('Foods (e2e)', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(uri, { dbName: 'dietplan_e2e' }),
        FoodsModule,
      ],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  describe('GET /foods', () => {
    describe('Success cases', () => {
      it('returns 200 and array of foods', async () => {
        const res = await request(app.getHttpServer())
          .get('/foods')
          .expect(200);

        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);
      });

      it('each food has correct structure', async () => {
        const res = await request(app.getHttpServer())
          .get('/foods')
          .expect(200);

        expect(Array.isArray(res.body)).toBe(true);
        res.body.forEach((food: any) => {
          expect(food).toHaveProperty('id');
          expect(food).toHaveProperty('name');
          expect(food).toHaveProperty('macrosPer100g');
          expect(typeof food.id).toBe('string');
          expect(typeof food.name).toBe('string');
          expect(typeof food.macrosPer100g).toBe('object');
          expect(food.macrosPer100g).toHaveProperty('protein');
          expect(food.macrosPer100g).toHaveProperty('carbs');
          expect(food.macrosPer100g).toHaveProperty('fat');
          expect(food.macrosPer100g).toHaveProperty('kcal');
        });
      });

      it('macros are valid numbers', async () => {
        const res = await request(app.getHttpServer())
          .get('/foods')
          .expect(200);

        res.body.forEach((food: any) => {
          expect(typeof food.macrosPer100g.protein).toBe('number');
          expect(typeof food.macrosPer100g.carbs).toBe('number');
          expect(typeof food.macrosPer100g.fat).toBe('number');
          expect(typeof food.macrosPer100g.kcal).toBe('number');
          expect(food.macrosPer100g.protein).toBeGreaterThanOrEqual(0);
          expect(food.macrosPer100g.carbs).toBeGreaterThanOrEqual(0);
          expect(food.macrosPer100g.fat).toBeGreaterThanOrEqual(0);
          expect(food.macrosPer100g.kcal).toBeGreaterThanOrEqual(0);
        });
      });

      it('all food IDs are valid enum values', async () => {
        const res = await request(app.getHttpServer())
          .get('/foods')
          .expect(200);

        const validFoodIds = Object.values(Food);
        res.body.forEach((food: any) => {
          expect(validFoodIds).toContain(food.id);
        });
      });
    });

    describe('Data validation', () => {
      it('no duplicate foods', async () => {
        const res = await request(app.getHttpServer())
          .get('/foods')
          .expect(200);

        const ids = res.body.map((food: any) => food.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);
      });

      it('macros are non-negative', async () => {
        const res = await request(app.getHttpServer())
          .get('/foods')
          .expect(200);

        res.body.forEach((food: any) => {
          expect(food.macrosPer100g.protein).toBeGreaterThanOrEqual(0);
          expect(food.macrosPer100g.carbs).toBeGreaterThanOrEqual(0);
          expect(food.macrosPer100g.fat).toBeGreaterThanOrEqual(0);
          expect(food.macrosPer100g.kcal).toBeGreaterThanOrEqual(0);
        });
      });

      it('response is consistent across multiple calls', async () => {
        const res1 = await request(app.getHttpServer())
          .get('/foods')
          .expect(200);
        const res2 = await request(app.getHttpServer())
          .get('/foods')
          .expect(200);
        const res3 = await request(app.getHttpServer())
          .get('/foods')
          .expect(200);

        expect(JSON.stringify(res1.body)).toBe(JSON.stringify(res2.body));
        expect(JSON.stringify(res2.body)).toBe(JSON.stringify(res3.body));
      });

      it('response matches getAllFoods() from data file', async () => {
        const res = await request(app.getHttpServer())
          .get('/foods')
          .expect(200);

        const expectedFoods = getAllFoods();
        expect(res.body).toEqual(expectedFoods);
      });
    });

    describe('Public access', () => {
      it('works without authentication', async () => {
        await request(app.getHttpServer()).get('/foods').expect(200);
      });

      it('works with authentication (optional)', async () => {
        // For this test, we just verify it doesn't require auth
        // The route should work with or without token
        // Testing with an invalid token to ensure it still works (public route)
        await request(app.getHttpServer())
          .get('/foods')
          .set('Authorization', 'Bearer invalid-token')
          .expect(200);
      });
    });
  });
});
