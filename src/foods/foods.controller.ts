import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { getAllFoods } from './data/food-data';

@ApiTags('foods')
@Controller('foods')
export class FoodsController {
  @Get()
  @ApiOperation({
    summary: 'List foods',
    description:
      'Returns all available foods with their nutritional information (name and macros per 100g).',
  })
  @ApiOkResponse({
    description: 'Returns array of foods with id, name, and macrosPer100g',
  })
  list() {
    return getAllFoods();
  }
}
