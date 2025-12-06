import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsString,
  ValidateNested,
  IsNumber,
  Min,
  IsIn,
  IsMilitaryTime,
} from 'class-validator';
import { FOODS } from '../../../foods/foods.data';

export class MealItemDto {
  @ApiProperty()
  @IsString()
  @IsIn(FOODS.map((f) => f.id))
  foodId: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  quantityGrams: number;
}

export class MealDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ description: 'Horario HH:mm' })
  @IsString()
  @IsMilitaryTime()
  time: string;

  @ApiProperty({ type: [MealItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MealItemDto)
  items: MealItemDto[];
}

export class DietPlanDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty({ type: [MealDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MealDto)
  meals: MealDto[];
}

export class UpsertMealPlansDto {
  @ApiProperty({ type: [DietPlanDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DietPlanDto)
  plans: DietPlanDto[];
}
