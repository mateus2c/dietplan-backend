import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreatePatientDto {
  @ApiProperty({ description: 'Nome completo' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MinLength(3)
  fullName: string;

  @ApiProperty({ enum: ['male', 'female'], description: 'Gênero' })
  @IsEnum(['male', 'female'])
  gender: 'male' | 'female';

  @ApiProperty({ description: 'Data de nascimento (YYYY-MM-DD)' })
  @IsDateString()
  birthDate: string;

  @ApiPropertyOptional({
    description: 'Massa magra em kg',
    example: 55,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  leanBodyMass?: number;

  @ApiProperty({ description: 'Telefone' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @Matches(/^[+\d][\d\s()-]{6,}$/)
  phone: string;

  @ApiProperty({ description: 'Email' })
  @IsEmail()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  email: string;
}
