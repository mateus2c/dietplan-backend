import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateAnamnesisDto {
  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((o) => o.title !== undefined)
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MinLength(1)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((o) => o.description !== undefined)
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MinLength(1)
  description?: string;
}
