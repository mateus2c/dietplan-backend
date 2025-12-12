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
      'Creates a new energy calculation document for the given patient.',
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
    },
  })
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async create(
    @Param('patientId') patientId: string,
    @Body() dto: CreateEnergyCalculationDto,
    @Req() req: { user: { userId: string } },
  ) {
    return this.service.create(patientId, req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  @ApiOperation({
    summary: 'Get energy calculation',
    description: 'Fetches energy calculation data for the given patient.',
  })
  @ApiParam({ name: 'patientId', required: true })
  @ApiOkResponse({ description: 'Returns energy calculation document' })
  async getByPatient(
    @Param('patientId') patientId: string,
    @Req() req: { user: { userId: string } },
  ) {
    return this.service.getByPatientId(patientId, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch()
  @ApiOperation({
    summary: 'Update energy calculation',
    description:
      'Creates or updates energy calculation data for the given patient. Updates only the provided fields.',
  })
  @ApiParam({ name: 'patientId', required: true })
  @ApiOkResponse({ description: 'Energy calculation updated' })
  @ApiBody({
    type: UpdateEnergyCalculationDto,
    examples: {
      default: {
        summary: 'Update example',
        value: {
          height: 175,
          weight: 80,
          energyCalculationFormula: 'harris-benedict-1984',
          physicalActivityFactor: 1.2,
          injuryFactor: 1.0,
          pregnancyEnergyAdditional: 0,
        },
      },
    },
  })
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async upsert(
    @Param('patientId') patientId: string,
    @Body() dto: UpdateEnergyCalculationDto,
    @Req() req: { user: { userId: string } },
  ) {
    return this.service.upsert(patientId, req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete()
  @ApiOperation({
    summary: 'Delete energy calculation',
    description:
      'Deletes the energy calculation document for the given patient.',
  })
  @ApiParam({ name: 'patientId', required: true })
  @ApiOkResponse({ description: 'Energy calculation deleted' })
  async delete(
    @Param('patientId') patientId: string,
    @Req() req: { user: { userId: string } },
  ) {
    return this.service.deleteByPatientId(patientId, req.user.userId);
  }
}
