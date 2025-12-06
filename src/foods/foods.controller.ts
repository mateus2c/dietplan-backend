import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FOODS } from './foods.data';

@ApiTags('foods')
@Controller('foods')
export class FoodsController {
  @Get()
  @ApiOperation({
    summary: 'List foods',
    description: 'Lista alimentos com macros por 100g',
  })
  @ApiOkResponse({ description: 'Returns foods list with macros per 100g' })
  list() {
    return FOODS;
  }
}
