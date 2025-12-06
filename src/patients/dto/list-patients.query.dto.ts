import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min, IsOptional, IsString, MinLength } from 'class-validator';

export class ListPatientsQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Página atual (>= 1)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    example: 'Jane',
    description: 'Nome parcial para busca',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional({
    example: 'jane',
    description: 'Email parcial para busca',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  email?: string;
}
