import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';
import { Patient, PatientSchema } from './schemas/patient.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import {
  MealPlans,
  MealPlansSchema,
} from './meal-plans/schemas/meal-plans.schema';
import {
  Anamnesis,
  AnamnesisSchema,
} from './anamnesis/schemas/anamnesis.schema';
import {
  EnergyCalculation,
  EnergyCalculationSchema,
} from './energy-calculations/schemas/energy-calculations.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Patient.name, schema: PatientSchema },
      { name: User.name, schema: UserSchema },
      { name: MealPlans.name, schema: MealPlansSchema },
      { name: Anamnesis.name, schema: AnamnesisSchema },
      { name: EnergyCalculation.name, schema: EnergyCalculationSchema },
    ]),
  ],
  controllers: [PatientsController],
  providers: [PatientsService],
})
export class PatientsModule {}
