import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsString,
  ValidateNested,
  IsNumber,
  Min,
  IsEnum,
  IsMilitaryTime,
} from 'class-validator';
import { Food } from '../../../foods/enums/food.enum';

export class MealItemDto {
  @ApiProperty({ enum: Food })
  @IsEnum(Food)
  foodId: Food;

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
