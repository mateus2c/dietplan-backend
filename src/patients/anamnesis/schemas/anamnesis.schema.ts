import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type AnamnesisDocument = HydratedDocument<Anamnesis>;

@Schema()
export class AnamnesisEntry {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, trim: true })
  description: string;
}

const AnamnesisEntrySchema = SchemaFactory.createForClass(AnamnesisEntry);

@Schema({ collection: 'anamnesis', timestamps: true })
export class Anamnesis {
  @Prop({
    type: Types.ObjectId,
    ref: 'Patient',
    required: true,
    index: true,
    unique: true,
  })
  patient: Types.ObjectId;

  @Prop({ type: [AnamnesisEntrySchema], default: [] })
  items: AnamnesisEntry[];
}

export const AnamnesisSchema = SchemaFactory.createForClass(Anamnesis);
