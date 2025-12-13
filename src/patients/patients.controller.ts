import {
  Body,
  Controller,
  Delete,
  Get,
  Query,
  Param,
  Post,
  Patch,
  UseGuards,
  UsePipes,
  ValidationPipe,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiOkResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { ListPatientsQueryDto } from './dto/list-patients.query.dto';
import { PatientsService } from './patients.service';

@ApiTags('patients')
@Controller()
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: 'Create patient' })
  @ApiResponse({
    status: 201,
    description: 'Patient created and linked to current user',
  })
  @ApiBody({
    type: CreatePatientDto,
    examples: {
      default: {
        summary: 'Patient creation example',
        value: {
          fullName: 'Jane Doe',
          gender: 'female',
          birthDate: '1990-05-20',
          phone: '+55 11 91234-5678',
          email: 'jane.doe@example.com',
          leanBodyMass: 55,
        },
      },
    },
  })
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async create(
    @Body() dto: CreatePatientDto,
    @Req() req: { user: { userId: string } },
  ) {
    return this.patientsService.create(req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  @ApiOperation({ summary: 'List patients (paginated)' })
  @ApiOkResponse({ description: 'Returns paginated patients' })
  @ApiQuery({
    name: 'page',
    required: false,
    schema: { type: 'integer', minimum: 1 },
    description: 'Current page (default 1)',
  })
  @ApiQuery({
    name: 'name',
    required: false,
    description: 'Name filter (partial)',
  })
  @ApiQuery({
    name: 'email',
    required: false,
    description: 'Email filter (partial)',
  })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async list(
    @Query() query: ListPatientsQueryDto,
    @Req() req: { user: { userId: string } },
  ) {
    return this.patientsService.list(req.user.userId, query.page ?? 1, 10, {
      name: query.name,
      email: query.email,
    });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(':id')
  @ApiOperation({ summary: 'Get patient' })
  @ApiOkResponse({ description: 'Returns patient details' })
  @ApiParam({
    name: 'id',
    required: true,
    schema: { type: 'string', example: '665f3b9c2a3d4e5f6a7b8c9d' },
  })
  async getById(
    @Param('id') id: string,
    @Req() req: { user: { userId: string } },
  ) {
    return this.patientsService.findById(id, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(':id')
  @ApiOperation({ summary: 'Update patient' })
  @ApiResponse({ status: 200, description: 'Returns updated patient' })
  @ApiParam({
    name: 'id',
    required: true,
    schema: { type: 'string', example: '665f3b9c2a3d4e5f6a7b8c9d' },
  })
  @ApiBody({
    type: UpdatePatientDto,
    examples: {
      default: {
        summary: 'Patient update example',
        value: {
          fullName: 'Jane Doe Silva',
          gender: 'female',
          birthDate: '1990-05-20',
          phone: '+55 11 92345-6789',
          email: 'jane.silva@example.com',
          leanBodyMass: 55,
        },
      },
    },
  })
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePatientDto,
    @Req() req: { user: { userId: string } },
  ) {
    return this.patientsService.update(id, req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete(':id')
  @ApiOperation({ summary: 'Delete patient' })
  @ApiResponse({ status: 200, description: 'Patient deleted' })
  @ApiParam({ name: 'id', required: true })
  async remove(
    @Param('id') id: string,
    @Req() req: { user: { userId: string } },
  ) {
    return this.patientsService.remove(id, req.user.userId);
  }
}
