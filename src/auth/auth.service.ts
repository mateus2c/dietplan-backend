import { ConflictException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcryptjs';
import { Role } from './enums/role.enum';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService['userModel'].findOne({ email });
    if (!user) return null;
    if (!user.passwordHash) return null;
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return null;
    return {
      id: user._id.toString(),
      email: user.email,
      role: (user.role ?? Role.User) as Role,
    };
  }

  async login(payload: { id: string; email: string; role: Role }) {
    const token = await this.jwtService.signAsync({
      sub: payload.id,
      email: payload.email,
      role: payload.role,
    });
    return { access_token: token };
  }

  async linkOAuthUser(email: string, provider: string, providerId: string) {
    const model = this.usersService['userModel'];
    let user = await model.findOne({ email });
    if (!user) {
      user = await model.create({ email, provider, providerId });
    } else {
      if (!user.providerId) {
        if (user.passwordHash) {
          throw new ConflictException(
            'Email already in use. Sign in and link Google in account settings.',
          );
        }
        user.provider = provider;
        user.providerId = providerId;
        await user.save();
      }
    }
    return {
      id: user._id.toString(),
      email: user.email,
      role: (user.role ?? Role.User) as Role,
    };
  }

  async createLinkState(userId: string) {
    return this.jwtService.signAsync({ sub: userId, purpose: 'link' });
  }

  async linkOAuthUserWithState(
    email: string,
    provider: string,
    providerId: string,
    state?: string,
  ) {
    const secret = process.env.JWT_SECRET ?? 'dev-secret';
    if (state) {
      try {
        const payload: unknown = await this.jwtService.verifyAsync(state, {
          secret,
        });
        const sub = (payload as { sub?: string })?.sub;
        if (sub) {
          const model = this.usersService['userModel'];
          const user = await model.findById(sub);
          if (user) {
            user.provider = provider;
            user.providerId = providerId;
            await user.save();
            return {
              id: user._id.toString(),
              email: user.email,
              role: (user.role ?? Role.User) as Role,
            };
          }
        }
      } catch {
        // ignore invalid state
      }
    }
    return this.linkOAuthUser(email, provider, providerId);
  }
}
