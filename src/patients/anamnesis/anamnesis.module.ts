import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnamnesisController } from './anamnesis.controller';
import { AnamnesisService } from './anamnesis.service';
import { Anamnesis, AnamnesisSchema } from './schemas/anamnesis.schema';
import { Patient, PatientSchema } from '../schemas/patient.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Anamnesis.name, schema: AnamnesisSchema },
      { name: Patient.name, schema: PatientSchema },
    ]),
  ],
  controllers: [AnamnesisController],
  providers: [AnamnesisService],
})
export class AnamnesisModule {}
