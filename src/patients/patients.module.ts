import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';
import { Patient, PatientSchema } from './schemas/patient.schema';
import { User, UserSchema } from '../users/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Patient.name, schema: PatientSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [PatientsController],
  providers: [PatientsService],
})
export class PatientsModule {}
