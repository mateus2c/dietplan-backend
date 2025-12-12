import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EnergyCalculationController } from './energy-calculations.controller';
import { EnergyCalculationService } from './energy-calculations.service';
import {
  EnergyCalculation,
  EnergyCalculationSchema,
} from './schemas/energy-calculations.schema';
import { Patient, PatientSchema } from '../schemas/patient.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EnergyCalculation.name, schema: EnergyCalculationSchema },
      { name: Patient.name, schema: PatientSchema },
    ]),
  ],
  controllers: [EnergyCalculationController],
  providers: [EnergyCalculationService],
})
export class EnergyCalculationModule {}
