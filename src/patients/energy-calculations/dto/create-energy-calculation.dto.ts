import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsNumber, IsOptional, Min } from 'class-validator';
import { EnergyCalculationFormula } from '../enums/energy-calculation-formula.enum';
import { PhysicalActivityFactor } from '../enums/physical-activity-factor.enum';
import { InjuryFactor } from '../enums/injury-factor.enum';

export class CreateEnergyCalculationDto {
  @ApiProperty({
    description: 'Altura em cm',
    example: 170,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  height: number;

  @ApiProperty({ description: 'Peso em kg', example: 70, minimum: 0 })
  @IsNumber()
  @Min(0)
  weight: number;

  @ApiProperty({
    enum: EnergyCalculationFormula,
    description: 'Fórmula para cálculo teórico',
    example: EnergyCalculationFormula.HARRIS_BENEDICT_1984,
  })
  @IsEnum(EnergyCalculationFormula)
  energyCalculationFormula: EnergyCalculationFormula;

  @ApiPropertyOptional({
    enum: PhysicalActivityFactor,
    description: 'Fator atividade física',
    example: PhysicalActivityFactor.SEDENTARIO,
  })
  @IsOptional()
  @IsNumber()
  @IsIn(
    Object.values(PhysicalActivityFactor).filter(
      (v) => typeof v === 'number',
    ) as number[],
  )
  physicalActivityFactor?: PhysicalActivityFactor;

  @ApiPropertyOptional({
    enum: InjuryFactor,
    description: 'Fator injúria',
    example: InjuryFactor.NAO_UTILIZAR,
  })
  @IsOptional()
  @IsNumber()
  @IsIn(Object.values(InjuryFactor) as number[])
  injuryFactor?: InjuryFactor;

  @ApiPropertyOptional({
    description: 'Adicional energético de gestante (kcal)',
    example: 300,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  pregnancyEnergyAdditional?: number;
}
