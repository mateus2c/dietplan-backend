import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  Min,
  ValidateIf,
} from 'class-validator';
import { EnergyCalculationFormula } from '../enums/energy-calculation-formula.enum';
import { PhysicalActivityFactor } from '../enums/physical-activity-factor.enum';
import { InjuryFactor } from '../enums/injury-factor.enum';

export class UpdateEnergyCalculationDto {
  @ApiPropertyOptional({
    description: 'Altura em cm',
    example: 170,
    minimum: 0,
  })
  @IsOptional()
  @ValidateIf((o) => o.height !== undefined)
  @IsNumber()
  @Min(0)
  height?: number;

  @ApiPropertyOptional({ description: 'Peso em kg', example: 70, minimum: 0 })
  @IsOptional()
  @ValidateIf((o) => o.weight !== undefined)
  @IsNumber()
  @Min(0)
  weight?: number;

  @ApiPropertyOptional({
    enum: EnergyCalculationFormula,
    description: 'Fórmula para cálculo teórico',
    example: EnergyCalculationFormula.HARRIS_BENEDICT_1984,
  })
  @IsOptional()
  @ValidateIf((o) => o.energyCalculationFormula !== undefined)
  @IsEnum(EnergyCalculationFormula)
  energyCalculationFormula?: EnergyCalculationFormula;

  @ApiPropertyOptional({
    enum: PhysicalActivityFactor,
    description: 'Fator atividade física',
    example: PhysicalActivityFactor.SEDENTARIO,
  })
  @IsOptional()
  @ValidateIf((o) => o.physicalActivityFactor !== undefined)
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
  @ValidateIf((o) => o.injuryFactor !== undefined)
  @IsNumber()
  @IsIn(Object.values(InjuryFactor) as number[])
  injuryFactor?: InjuryFactor;

  @ApiPropertyOptional({
    description: 'Adicional energético de gestante (kcal)',
    example: 300,
    minimum: 0,
  })
  @IsOptional()
  @ValidateIf((o) => o.pregnancyEnergyAdditional !== undefined)
  @IsNumber()
  @Min(0)
  pregnancyEnergyAdditional?: number;
}
