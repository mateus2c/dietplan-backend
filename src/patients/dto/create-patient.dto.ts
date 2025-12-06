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
  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  @MinLength(3)
  fullName: string;

  @ApiProperty({ example: 'female', enum: ['male', 'female', 'other'] })
  @IsEnum(['male', 'female', 'other'])
  gender: 'male' | 'female' | 'other';

  @ApiProperty({ example: '1990-05-20' })
  @IsDateString()
  birthDate: string;

  @ApiProperty({ example: '+55 11 91234-5678' })
  @IsString()
  @Matches(/^[+\d][\d\s()-]{6,}$/)
  phone: string;

  @ApiProperty({ example: 'jane.doe@example.com' })
  @IsEmail()
  email: string;
}
