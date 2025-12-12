import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { EnergyCalculationFormula } from '../enums/energy-calculation-formula.enum';
import { PhysicalActivityFactor } from '../enums/physical-activity-factor.enum';
import { InjuryFactor } from '../enums/injury-factor.enum';

export type EnergyCalculationDocument = HydratedDocument<EnergyCalculation>;

@Schema()
export class EnergyCalculationEntry {
  @Prop({ type: Number, required: false, min: 0 })
  height?: number; // Altura em cm

  @Prop({ type: Number, required: false, min: 0 })
  weight?: number; // Peso em kg

  @Prop({
    type: String,
    required: false,
    trim: true,
    enum: Object.values(EnergyCalculationFormula),
  })
  energyCalculationFormula?: EnergyCalculationFormula;

  @Prop({
    type: Number,
    required: false,
    enum: Object.values(PhysicalActivityFactor).filter(
      (v) => typeof v === 'number',
    ) as number[],
  })
  physicalActivityFactor?: PhysicalActivityFactor;

  @Prop({
    type: Number,
    required: false,
    enum: Object.values(InjuryFactor) as number[],
  })
  injuryFactor?: InjuryFactor;

  @Prop({ type: Number, required: false, min: 0 })
  pregnancyEnergyAdditional?: number; // Adicional energético de gestante (kcal)
}

const EnergyCalculationEntrySchema = SchemaFactory.createForClass(
  EnergyCalculationEntry,
);

@Schema({ collection: 'energy_calculations', timestamps: true })
export class EnergyCalculation {
  @Prop({
    type: Types.ObjectId,
    ref: 'Patient',
    required: true,
    index: true,
    unique: true,
  })
  patient: Types.ObjectId;

  @Prop({ type: [EnergyCalculationEntrySchema], default: [] })
  calculations: EnergyCalculationEntry[];
}

export const EnergyCalculationSchema =
  SchemaFactory.createForClass(EnergyCalculation);
