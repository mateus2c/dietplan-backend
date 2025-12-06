import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class CreatePatientDto {
  @ApiProperty({ description: 'Nome completo' })
  @IsString()
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
  @Matches(/^[+\d][\d\s()-]{6,}$/)
  phone: string;

  @ApiProperty({ description: 'Email' })
  @IsEmail()
  email: string;
}
