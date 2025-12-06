import {
  Body,
  Controller,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiResponse, ApiBody, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { RegisterDto } from './dto/register.dto';

@ApiTags('auth')
@Controller('auth')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('register')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @ApiOperation({
    summary: 'Register user',
    description:
      'Cria um novo usuário com email e senha. Retorna o identificador do usuário e informações básicas.',
  })
  @ApiResponse({ status: 201, description: 'User registered' })
  @ApiBody({
    type: RegisterDto,
    examples: {
      default: {
        summary: 'Exemplo de registro',
        value: {
          email: 'john.doe@example.com',
          password: 'Str0ngP@ssw0rd',
        },
      },
    },
  })
  async register(@Body() dto: RegisterDto) {
    return this.usersService.register(dto.email, dto.password);
  }
}
