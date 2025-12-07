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
      'Creates a new user with email and password. Returns the user identifier and basic information.',
  })
  @ApiResponse({ status: 201, description: 'User registered' })
  @ApiBody({
    type: RegisterDto,
    examples: {
      default: {
        summary: 'Registration example',
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
