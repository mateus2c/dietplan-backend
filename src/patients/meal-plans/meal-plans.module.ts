import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MealPlansController } from './meal-plans.controller';
import { MealPlansService } from './meal-plans.service';
import { MealPlans, MealPlansSchema } from './schemas/meal-plans.schema';
import { Patient, PatientSchema } from '../schemas/patient.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MealPlans.name, schema: MealPlansSchema },
      { name: Patient.name, schema: PatientSchema },
    ]),
  ],
  controllers: [MealPlansController],
  providers: [MealPlansService],
})
export class MealPlansModule {}
