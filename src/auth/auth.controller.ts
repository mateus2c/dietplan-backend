import { Controller, Post, UseGuards, Request, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @ApiOperation({ summary: 'Login with email/password via local strategy' })
  @ApiResponse({ status: 200, description: 'Returns JWT access_token' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', example: 'john.doe@example.com' },
        password: { type: 'string', example: 'Str0ngP@ssw0rd' },
      },
    },
  })
  async login(@Request() req: { user: { id: string; email: string } }) {
    return this.authService.login(req.user);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiOperation({ summary: 'Get authenticated user profile' })
  @ApiResponse({ status: 200, description: 'Returns user profile payload' })
  profile(@Request() req: { user: { userId: string; email: string } }) {
    return req.user;
  }

  @UseGuards(AuthGuard('google'))
  @Get('google')
  @ApiOperation({ summary: 'Start Google OAuth flow' })
  @ApiResponse({
    status: 302,
    description: 'Redirects to Google consent screen',
  })
  async google() {}

  @UseGuards(JwtAuthGuard)
  @Get('google/link')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Link Google account to current user' })
  @ApiResponse({
    status: 302,
    description: 'Redirects to Google with state for linking',
  })
  async googleLink(
    @Request() req: { user: { userId: string } },
    @Res() res: Response,
  ) {
    const clientID = process.env.GOOGLE_CLIENT_ID ?? '';
    const callbackURL =
      process.env.GOOGLE_CALLBACK_URL ??
      'http://localhost:3001/auth/google/callback';
    const scope = encodeURIComponent('email profile');
    const state = await this.authService.createLinkState(req.user.userId);
    const url =
      'https://accounts.google.com/o/oauth2/v2/auth?' +
      `client_id=${encodeURIComponent(clientID)}` +
      `&redirect_uri=${encodeURIComponent(callbackURL)}` +
      `&response_type=code` +
      `&scope=${scope}` +
      `&state=${encodeURIComponent(state)}`;
    res.redirect(url);
  }

  @UseGuards(AuthGuard('google'))
  @Get('google/callback')
  @ApiOperation({ summary: 'Handle Google OAuth callback' })
  @ApiResponse({ status: 200, description: 'Returns JWT access_token' })
  async googleCallback(
    @Request() req: { user: { id: string; email: string } },
  ) {
    return this.authService.login(req.user);
  }
}
