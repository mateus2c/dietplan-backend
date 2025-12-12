import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  UseGuards,
  UsePipes,
  ValidationPipe,
  Post,
  Patch,
  Req,
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

@ApiTags('patients/meal-plans')
@Controller()
export class MealPlansController {
  constructor(private readonly service: MealPlansService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  @ApiOperation({
    summary: 'Create diet plan',
    description:
      'Creates a diet plan for the given patient and returns the updated document with all plans.',
  })
  @ApiParam({ name: 'patientId', required: true })
  @ApiCreatedResponse({ description: 'Diet plan created' })
  @ApiBody({
    type: DietPlanDto,
    examples: {
      default: {
        summary: 'Diet plan addition example',
        value: {
          title: 'Cutting plan',
          meals: [
            {
              name: 'Breakfast',
              time: '08:00',
              items: [
                { foodId: 'oats', quantityGrams: 60 },
                { foodId: 'skim_milk', quantityGrams: 200 },
              ],
            },
            {
              name: 'Lunch',
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
    @Req() req: { user: { userId: string } },
  ) {
    return this.service.addPlan(patientId, req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(':planId')
  @ApiOperation({
    summary: 'Update diet plan',
    description:
      'Updates only the provided fields of the diet plan. If nothing changed, returns the current state without saving.',
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
        summary: 'Replace all meals (optional)',
        value: {
          meals: [
            {
              name: 'Breakfast',
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
    @Req() req: { user: { userId: string } },
  ) {
    return this.service.patchPlanById(patientId, planId, req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  @ApiOperation({
    summary: 'Get meal plans',
    description: 'Fetches all diet plans for the given patient.',
  })
  @ApiParam({ name: 'patientId', required: true })
  @ApiOkResponse({ description: 'Returns meal plans document' })
  async getByPatient(
    @Param('patientId') patientId: string,
    @Req() req: { user: { userId: string } },
  ) {
    return this.service.getByPatientId(patientId, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete(':planId')
  @ApiOperation({
    summary: 'Delete diet plan',
    description:
      'Deletes a diet plan by ID and returns the updated document with remaining plans.',
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
  @ApiOkResponse({ description: 'Diet plan deleted' })
  async deletePlan(
    @Param('patientId') patientId: string,
    @Param('planId') planId: string,
    @Req() req: { user: { userId: string } },
  ) {
    return this.service.deletePlanById(patientId, planId, req.user.userId);
  }
}
