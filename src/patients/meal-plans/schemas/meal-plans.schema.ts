import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type MealPlansDocument = HydratedDocument<MealPlans>;

@Schema({ _id: false })
export class MealItem {
  @Prop({ required: true, trim: true })
  foodId: string;

  @Prop({ required: true, min: 0 })
  quantityGrams: number;
}

const MealItemSchema = SchemaFactory.createForClass(MealItem);

@Schema({ _id: false })
export class Meal {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  time: string;

  @Prop({ type: [MealItemSchema], default: [] })
  items: MealItem[];
}

const MealSchema = SchemaFactory.createForClass(Meal);

@Schema()
export class DietPlan {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ type: [MealSchema], default: [] })
  meals: Meal[];
}

const DietPlanSchema = SchemaFactory.createForClass(DietPlan);

@Schema({ collection: 'meal_plans', timestamps: true })
export class MealPlans {
  @Prop({
    type: Types.ObjectId,
    ref: 'Patient',
    required: true,
    index: true,
    unique: true,
  })
  patient: Types.ObjectId;

  @Prop({ type: [DietPlanSchema], default: [] })
  plans: DietPlan[];
}

export const MealPlansSchema = SchemaFactory.createForClass(MealPlans);
