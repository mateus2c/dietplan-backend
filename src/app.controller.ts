import { Controller, Get } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiProperty,
} from '@nestjs/swagger';
import { AppService } from './app.service';

class MacrosPer100gDto {
  @ApiProperty()
  protein: number;

  @ApiProperty()
  carbs: number;

  @ApiProperty()
  fat: number;

  @ApiProperty()
  kcal: number;
}

class FoodDto {
  @ApiProperty()
  name: string;

  @ApiProperty({ type: MacrosPer100gDto })
  macrosPer100g: MacrosPer100gDto;
}

@ApiTags('App')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('foods')
  @ApiOperation({ summary: 'List foods with macros per 100g' })
  @ApiOkResponse({ type: FoodDto, isArray: true })
  getFoods(): Array<{
    name: string;
    macrosPer100g: {
      protein: number;
      carbs: number;
      fat: number;
      kcal: number;
    };
  }> {
    return [
      {
        name: 'Peito de frango cozido',
        macrosPer100g: { protein: 31, carbs: 0, fat: 3.6, kcal: 165 },
      },
      {
        name: 'Ovo cozido',
        macrosPer100g: { protein: 13, carbs: 1.1, fat: 11, kcal: 155 },
      },
      {
        name: 'Arroz integral cozido',
        macrosPer100g: { protein: 2.6, carbs: 23, fat: 0.9, kcal: 111 },
      },
      {
        name: 'Feijão preto cozido',
        macrosPer100g: { protein: 8.9, carbs: 23.7, fat: 0.5, kcal: 132 },
      },
      {
        name: 'Aveia',
        macrosPer100g: { protein: 16.9, carbs: 66.3, fat: 6.9, kcal: 389 },
      },
      {
        name: 'Banana',
        macrosPer100g: { protein: 1.1, carbs: 22.8, fat: 0.3, kcal: 96 },
      },
      {
        name: 'Maçã',
        macrosPer100g: { protein: 0.3, carbs: 13.8, fat: 0.2, kcal: 52 },
      },
      {
        name: 'Batata doce cozida',
        macrosPer100g: { protein: 1.6, carbs: 20.1, fat: 0.1, kcal: 86 },
      },
      {
        name: 'Salmão grelhado',
        macrosPer100g: { protein: 22, carbs: 0, fat: 12, kcal: 208 },
      },
      {
        name: 'Atum enlatado em água',
        macrosPer100g: { protein: 23.6, carbs: 0, fat: 0.8, kcal: 109 },
      },
      {
        name: 'Queijo cottage',
        macrosPer100g: { protein: 11.1, carbs: 3.4, fat: 4.3, kcal: 98 },
      },
      {
        name: 'Iogurte grego natural',
        macrosPer100g: { protein: 10, carbs: 3.6, fat: 4, kcal: 97 },
      },
      {
        name: 'Quinoa cozida',
        macrosPer100g: { protein: 4.4, carbs: 21.3, fat: 1.9, kcal: 120 },
      },
      {
        name: 'Brócolis cozido',
        macrosPer100g: { protein: 2.8, carbs: 7, fat: 0.4, kcal: 35 },
      },
      {
        name: 'Amêndoas',
        macrosPer100g: { protein: 21.2, carbs: 21.7, fat: 49.9, kcal: 579 },
      },
      {
        name: 'Abacate',
        macrosPer100g: { protein: 2, carbs: 8.5, fat: 14.7, kcal: 160 },
      },
      {
        name: 'Pão integral',
        macrosPer100g: { protein: 13, carbs: 41, fat: 4.2, kcal: 247 },
      },
      {
        name: 'Leite desnatado',
        macrosPer100g: { protein: 3.4, carbs: 5, fat: 0.2, kcal: 35 },
      },
      {
        name: 'Lentilha cozida',
        macrosPer100g: { protein: 9, carbs: 20, fat: 0.4, kcal: 116 },
      },
      {
        name: 'Azeite de oliva',
        macrosPer100g: { protein: 0, carbs: 0, fat: 100, kcal: 884 },
      },
    ];
  }
}
