import { Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { APP_GUARD } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PatientsModule } from './patients/patients.module';
import { MealPlansModule } from './patients/meal-plans/meal-plans.module';
import { AnamnesisModule } from './patients/anamnesis/anamnesis.module';
import { EnergyCalculationModule } from './patients/energy-calculations/energy-calculations.module';
import { FoodsModule } from './foods/foods.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RolesGuard } from './auth/guards/roles.guard';

@Module({
  imports: [
    ...(process.env.MONGO_URI
      ? [
          MongooseModule.forRoot(process.env.MONGO_URI, {
            dbName: process.env.MONGO_DB_NAME,
          }),
        ]
      : []),
    UsersModule,
    AuthModule,
    PatientsModule,
    MealPlansModule,
    AnamnesisModule,
    EnergyCalculationModule,
    FoodsModule,
    RouterModule.register([
      {
        path: 'patients',
        module: PatientsModule,
        children: [
          {
            path: ':patientId/meal-plans',
            module: MealPlansModule,
          },
          {
            path: ':patientId/anamnesis',
            module: AnamnesisModule,
          },
          {
            path: ':patientId/energy-calculations',
            module: EnergyCalculationModule,
          },
        ],
      },
    ]),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
