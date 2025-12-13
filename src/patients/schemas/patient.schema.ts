import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PatientDocument = HydratedDocument<Patient>;

@Schema({ collection: 'patients', timestamps: true })
export class Patient {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  user: Types.ObjectId;
  @Prop({ required: true, trim: true })
  fullName: string;

  @Prop({ required: true, enum: ['male', 'female'] })
  gender: 'male' | 'female';

  @Prop({ required: true, type: Date })
  birthDate: Date;

  @Prop({ type: Number, required: false, min: 0 })
  leanBodyMass?: number; // Massa magra em kg

  @Prop({ required: true, unique: true, trim: true })
  phone: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ type: Types.ObjectId, ref: 'MealPlans', required: false })
  mealPlans?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Anamnesis', required: false })
  anamnesis?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'EnergyCalculation', required: false })
  energyCalculation?: Types.ObjectId;
}

export const PatientSchema = SchemaFactory.createForClass(Patient);
