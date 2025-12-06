import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import type { StrategyOptions } from 'passport-jwt';
import { Role } from '../enums/role.enum';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const options: StrategyOptions = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'dev-secret',
    };
    super(options);
  }

  async validate(payload: { sub: string; email: string; role?: Role }) {
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role ?? Role.User,
    };
  }
}
