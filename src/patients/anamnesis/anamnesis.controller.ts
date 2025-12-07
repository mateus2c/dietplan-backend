import {
  Body,
  Controller,
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
import { AnamnesisService } from './anamnesis.service';
import { CreateAnamnesisDto } from './dto/create-anamnesis.dto';
import { UpdateAnamnesisDto } from './dto/update-anamnesis.dto';

@ApiTags('anamnesis')
@Controller()
export class AnamnesisController {
  constructor(private readonly service: AnamnesisService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  @ApiOperation({
    summary: 'Create anamnesis',
    description:
      'Creates an anamnesis entry for the given patient and returns the updated document with all entries.',
  })
  @ApiParam({ name: 'patientId', required: true })
  @ApiCreatedResponse({ description: 'Anamnesis created' })
  @ApiBody({
    type: CreateAnamnesisDto,
    examples: {
      default: {
        summary: 'Creation example',
        value: {
          title: 'Initial anamnesis',
          description:
            'Patient reports lower back pain for 2 weeks, no radiation. History of sedentary lifestyle and irregular sleep.',
        },
      },
      comprehensive: {
        summary: 'More detailed example',
        value: {
          title: 'Comprehensive assessment visit',
          description:
            'Main complaint: fatigue at the end of the day. Eating habits: high intake of ultra-processed foods. Family history: type 2 diabetes and hypertension. Recent tests: normal blood count, fasting glucose 98 mg/dL. Goal: weight reduction and improved energy.',
        },
      },
    },
  })
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async addItem(
    @Param('patientId') patientId: string,
    @Body() dto: CreateAnamnesisDto,
    @Req() req: { user: { userId: string } },
  ) {
    return this.service.addItem(patientId, req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(':itemId')
  @ApiOperation({
    summary: 'Update anamnesis',
    description:
      'Updates only the provided fields of the anamnesis. If nothing changed, returns the current state without saving.',
  })
  @ApiParam({ name: 'patientId', required: true })
  @ApiParam({ name: 'itemId', required: true })
  @ApiOkResponse({ description: 'Anamnesis updated' })
  @ApiBody({
    type: UpdateAnamnesisDto,
    examples: {
      changeTitle: {
        summary: 'Update only the title',
        value: {
          title: 'Follow-up anamnesis (30 days)',
        },
      },
      changeDescription: {
        summary: 'Update only the description',
        value: {
          description:
            'Progress: 2kg reduction, improved sleep quality, partial adherence to the diet plan. Adjust protein intake and hydration.',
        },
      },
      changeBoth: {
        summary: 'Update title and description',
        value: {
          title: 'Post-exam anamnesis',
          description:
            'Review after tests: lipid profile within normal range, start light physical activity protocol and provide personalized nutritional guidance.',
        },
      },
    },
  })
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async patchItem(
    @Param('patientId') patientId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateAnamnesisDto,
    @Req() req: { user: { userId: string } },
  ) {
    return this.service.patchItemById(patientId, itemId, req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  @ApiOperation({
    summary: 'Get anamnesis',
    description: 'Fetches all anamnesis items for the given patient.',
  })
  @ApiParam({ name: 'patientId', required: true })
  @ApiOkResponse({ description: 'Returns anamneses document' })
  async getByPatient(
    @Param('patientId') patientId: string,
    @Req() req: { user: { userId: string } },
  ) {
    return this.service.getByPatientId(patientId, req.user.userId);
  }
}
