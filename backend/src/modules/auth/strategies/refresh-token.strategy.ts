import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('auth.refreshSecret') || process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret',
      passReqToCallback: true,
    } as any);
  }

  validate(req: { body?: { refreshToken?: string } }, payload: { sub: string; email: string; role: string }) {
    if (!payload?.sub || !req.body?.refreshToken) {
      throw new UnauthorizedException('Invalid refresh token payload');
    }

    return {
      id: payload.sub,
      email: payload.email,
      role: { name: payload.role },
      refreshToken: req.body.refreshToken,
    };
  }
}
