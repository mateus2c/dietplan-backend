import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { EnergyCalculationService } from './energy-calculation.service';
import { UpdateEnergyCalculationDto } from './dto/update-energy-calculation.dto';
import { CreateEnergyCalculationDto } from './dto/create-energy-calculation.dto';

@ApiTags('patients/energy-calculation')
@Controller()
export class EnergyCalculationController {
  constructor(private readonly service: EnergyCalculationService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  @ApiOperation({
    summary: 'Create energy calculation',
    description:
      'Creates an energy calculation entry for the given patient and returns the updated document with all calculations.',
  })
  @ApiParam({ name: 'patientId', required: true })
  @ApiCreatedResponse({ description: 'Energy calculation created' })
  @ApiBody({
    type: CreateEnergyCalculationDto,
    examples: {
      default: {
        summary: 'Creation example',
        value: {
          height: 175,
          weight: 80,
          energyCalculationFormula: 'harris-benedict-1984',
          physicalActivityFactor: 1.2,
          injuryFactor: 1.0,
          pregnancyEnergyAdditional: 0,
        },
      },
      comprehensive: {
        summary: 'More detailed example',
        value: {
          height: 170,
          weight: 75,
          energyCalculationFormula: 'eer-2023',
          physicalActivityFactor: 1.55,
          injuryFactor: 1.2,
          pregnancyEnergyAdditional: 0,
        },
      },
    },
  })
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async addCalculation(
    @Param('patientId') patientId: string,
    @Body() dto: CreateEnergyCalculationDto,
    @Req() req: { user: { userId: string } },
  ) {
    return this.service.addCalculation(patientId, req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(':calculationId')
  @ApiOperation({
    summary: 'Update energy calculation',
    description:
      'Updates only the provided fields of the energy calculation. If nothing changed, returns the current state without saving.',
  })
  @ApiParam({ name: 'patientId', required: true })
  @ApiParam({ name: 'calculationId', required: true })
  @ApiOkResponse({ description: 'Energy calculation updated' })
  @ApiBody({
    type: UpdateEnergyCalculationDto,
    examples: {
      changeHeight: {
        summary: 'Update only height',
        value: {
          height: 176,
        },
      },
      changeWeight: {
        summary: 'Update only weight',
        value: {
          weight: 82,
        },
      },
      changeFormula: {
        summary: 'Update formula and factors',
        value: {
          energyCalculationFormula: 'eer-2023',
          physicalActivityFactor: 1.55,
          injuryFactor: 1.0,
        },
      },
    },
  })
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async patchCalculation(
    @Param('patientId') patientId: string,
    @Param('calculationId') calculationId: string,
    @Body() dto: UpdateEnergyCalculationDto,
    @Req() req: { user: { userId: string } },
  ) {
    return this.service.patchCalculationById(
      patientId,
      calculationId,
      req.user.userId,
      dto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  @ApiOperation({
    summary: 'Get energy calculations',
    description:
      'Fetches all energy calculation entries for the given patient.',
  })
  @ApiParam({ name: 'patientId', required: true })
  @ApiOkResponse({ description: 'Returns energy calculations document' })
  async getByPatient(
    @Param('patientId') patientId: string,
    @Req() req: { user: { userId: string } },
  ) {
    return this.service.getByPatientId(patientId, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete(':calculationId')
  @ApiOperation({
    summary: 'Delete energy calculation item',
    description:
      'Deletes an energy calculation entry by ID and returns the updated document with remaining calculations.',
  })
  @ApiParam({
    name: 'patientId',
    required: true,
    schema: { type: 'string', example: '665f3b9c2a3d4e5f6a7b8c9d' },
  })
  @ApiParam({
    name: 'calculationId',
    required: true,
    schema: { type: 'string', example: '665f3b9c2a3d4e5f6a7b8c9e' },
  })
  @ApiOkResponse({ description: 'Energy calculation item deleted' })
  async deleteCalculation(
    @Param('patientId') patientId: string,
    @Param('calculationId') calculationId: string,
    @Req() req: { user: { userId: string } },
  ) {
    return this.service.deleteCalculationById(
      patientId,
      calculationId,
      req.user.userId,
    );
  }
}
