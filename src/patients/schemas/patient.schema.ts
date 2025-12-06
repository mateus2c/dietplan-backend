import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PatientDocument = HydratedDocument<Patient>;

@Schema({ collection: 'patients', timestamps: true })
export class Patient {
  @Prop({ required: true, trim: true })
  fullName: string;

  @Prop({ required: true, enum: ['male', 'female', 'other'] })
  gender: 'male' | 'female' | 'other';

  @Prop({ required: true, type: Date })
  birthDate: Date;

  @Prop({ required: true, unique: true, trim: true })
  phone: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;
}

export const PatientSchema = SchemaFactory.createForClass(Patient);
