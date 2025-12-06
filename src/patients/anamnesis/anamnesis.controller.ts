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
      'Cria uma anamnese para o paciente informado e retorna o documento atualizado com todas as anamneses.',
  })
  @ApiParam({ name: 'patientId', required: true })
  @ApiCreatedResponse({ description: 'Anamnesis created' })
  @ApiBody({
    type: CreateAnamnesisDto,
    examples: {
      default: {
        summary: 'Exemplo de criação',
        value: {
          title: 'Anamnese inicial',
          description:
            'Paciente relata dor lombar há 2 semanas, sem irradiação. Histórico de sedentarismo e sono irregular.',
        },
      },
      comprehensive: {
        summary: 'Exemplo mais detalhado',
        value: {
          title: 'Consulta de avaliação completa',
          description:
            'Queixa principal: fadiga ao final do dia. Hábito alimentar: alto consumo de ultraprocessados. Histórico familiar: DM2 e HAS. Exames recentes: hemograma normal, glicemia de jejum 98 mg/dL. Objetivo: redução de peso e melhora da disposição.',
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
      'Atualiza somente os campos enviados da anamnese. Se nada mudou, retorna o estado atual sem gravação.',
  })
  @ApiParam({ name: 'patientId', required: true })
  @ApiParam({ name: 'itemId', required: true })
  @ApiOkResponse({ description: 'Anamnesis updated' })
  @ApiBody({
    type: UpdateAnamnesisDto,
    examples: {
      changeTitle: {
        summary: 'Atualizar somente o título',
        value: {
          title: 'Anamnese de retorno (30 dias)',
        },
      },
      changeDescription: {
        summary: 'Atualizar somente a descrição',
        value: {
          description:
            'Evolução: redução de 2kg, melhora da qualidade do sono, aderência parcial ao plano alimentar. Ajustar ingestão proteica e hidratação.',
        },
      },
      changeBoth: {
        summary: 'Atualizar título e descrição',
        value: {
          title: 'Anamnese pós-exames',
          description:
            'Revisão após exames: perfil lipídico dentro da normalidade, iniciar protocolo de atividade física leve e orientação nutricional personalizada.',
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
    description: 'Obtém todas as anamneses do paciente informado.',
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
