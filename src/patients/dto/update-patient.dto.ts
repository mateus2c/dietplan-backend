import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdatePatientDto {
  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((o) => o.fullName !== undefined)
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MinLength(3)
  fullName?: string;

  @ApiPropertyOptional({ enum: ['male', 'female'] })
  @IsOptional()
  @IsEnum(['male', 'female'])
  gender?: 'male' | 'female';

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional({
    description: 'Massa magra em kg',
    example: 55,
    minimum: 0,
  })
  @IsOptional()
  @ValidateIf((o) => o.leanBodyMass !== undefined)
  @IsNumber()
  @Min(0)
  leanBodyMass?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((o) => o.phone !== undefined)
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @Matches(/^[+\d][\d\s()-]{6,}$/)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((o) => o.email !== undefined)
  @IsEmail()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  email?: string;
}
