import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
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

  @ApiProperty({ enum: ['male', 'female', 'other'], description: 'Gênero' })
  @IsEnum(['male', 'female', 'other'])
  gender: 'male' | 'female' | 'other';

  @ApiProperty({ description: 'Data de nascimento (YYYY-MM-DD)' })
  @IsDateString()
  birthDate: string;

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
