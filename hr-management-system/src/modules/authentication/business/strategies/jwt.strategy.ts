import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '@shared/types';
import { UnauthorizedException } from '@nestjs/common';
import { UserService } from '../services/user.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly userService: UserService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not defined');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload): Promise<any> {
    const user = await this.userService.findById(payload.sub);
    
    if (!user || !user.isActive) {
      throw new UnauthorizedException();
    }

    return {
      id: payload.sub,
      email: payload.email,
      username: payload.username,
      role: payload.role,
      permissions: payload.permissions,
    };
  }
}