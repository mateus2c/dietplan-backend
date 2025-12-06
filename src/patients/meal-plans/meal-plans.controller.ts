import {
  Body,
  Controller,
  Get,
  Param,
  UseGuards,
  UsePipes,
  ValidationPipe,
  Post,
  Patch,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiBody,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { MealPlansService } from './meal-plans.service';
import { DietPlanDto } from './dto/upsert-meal-plans.dto';
import { UpdateDietPlanDto } from './dto/update-diet-plan.dto';

@ApiTags('meal-plans')
@Controller()
export class MealPlansController {
  constructor(private readonly service: MealPlansService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  @ApiOperation({
    summary: 'Create diet plan',
    description:
      'Cria um plano alimentar para o paciente informado e retorna o documento atualizado com os planos.',
  })
  @ApiParam({ name: 'patientId', required: true })
  @ApiCreatedResponse({ description: 'Diet plan created' })
  @ApiBody({
    type: DietPlanDto,
    examples: {
      default: {
        summary: 'Exemplo de adição de diet plan',
        value: {
          title: 'Plano cutting',
          meals: [
            {
              name: 'Café da manhã',
              time: '08:00',
              items: [
                { foodId: 'oats', quantityGrams: 60 },
                { foodId: 'skim_milk', quantityGrams: 200 },
              ],
            },
            {
              name: 'Almoço',
              time: '12:30',
              items: [
                { foodId: 'chicken_breast', quantityGrams: 150 },
                { foodId: 'brown_rice_cooked', quantityGrams: 120 },
                { foodId: 'broccoli_cooked', quantityGrams: 100 },
              ],
            },
          ],
        },
      },
    },
  })
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async addPlan(
    @Param('patientId') patientId: string,
    @Body() dto: DietPlanDto,
  ) {
    return this.service.addPlan(patientId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(':planId')
  @ApiOperation({
    summary: 'Update diet plan',
    description:
      'Atualiza somente os campos enviados do plano alimentar. Se nada mudou, retorna o estado atual sem gravação.',
  })
  @ApiParam({
    name: 'patientId',
    required: true,
    schema: { type: 'string', example: '665f3b9c2a3d4e5f6a7b8c9d' },
  })
  @ApiParam({
    name: 'planId',
    required: true,
    schema: { type: 'string', example: '665f3b9c2a3d4e5f6a7b8c9e' },
  })
  @ApiOkResponse({ description: 'Diet plan updated' })
  @ApiBody({
    type: UpdateDietPlanDto,
    examples: {
      mealsReplace: {
        summary: 'Trocar todas as refeições (opcional)',
        value: {
          meals: [
            {
              name: 'Café da manhã',
              time: '08:00',
              items: [
                { foodId: 'oats', quantityGrams: 80 },
                { foodId: 'skim_milk', quantityGrams: 250 },
              ],
            },
          ],
        },
      },
    },
  })
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async patchPlan(
    @Param('patientId') patientId: string,
    @Param('planId') planId: string,
    @Body() dto: UpdateDietPlanDto,
  ) {
    return this.service.patchPlanById(patientId, planId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  @ApiOperation({
    summary: 'Get meal plans',
    description: 'Obtém todos os planos alimentares do paciente informado.',
  })
  @ApiParam({ name: 'patientId', required: true })
  @ApiOkResponse({ description: 'Returns meal plans document' })
  async getByPatient(@Param('patientId') patientId: string) {
    return this.service.getByPatientId(patientId);
  }
}
