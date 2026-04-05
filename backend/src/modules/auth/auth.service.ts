import { HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { CacheKeys } from 'src/common/utils/cache-key.util';
import { CacheService } from 'src/common/utils/cache.service';
import { PrismaService } from 'src/database/prisma.service';
import { AuthProviderStrategyService } from './auth-provider.strategy';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
    private readonly authProviderStrategy: AuthProviderStrategyService,
  ) {
    this.authProviderStrategy.assertSupported();
  }

  async login(
    dto: LoginDto,
    context?: { ip?: string; userAgent?: string | string[] },
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const protection = (this.configService.get('auth.loginProtection') || {}) as {
      maxAttempts?: number;
      windowSeconds?: number;
      blockSeconds?: number;
    };
    const maxAttempts = Number(protection.maxAttempts || 6);
    const windowSeconds = Number(protection.windowSeconds || 900);
    const blockSeconds = Number(protection.blockSeconds || 1800);
    const fingerprint = `${dto.email.toLowerCase()}:${String(context?.ip || 'unknown').slice(0, 64)}`;
    const failKey = CacheKeys.authLoginAttempt(`fail:${fingerprint}`);
    const blockKey = CacheKeys.authLoginAttempt(`block:${fingerprint}`);

    const blocked = await this.cacheService.get<{ blocked: boolean }>(blockKey);
    if (blocked?.blocked) {
      throw new HttpException('Too many login attempts. Please try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { role: true },
    });

    if (!user || !user.isActive) {
      await this.bumpLoginFailure(failKey, blockKey, maxAttempts, windowSeconds, blockSeconds);
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) {
      await this.bumpLoginFailure(failKey, blockKey, maxAttempts, windowSeconds, blockSeconds);
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.cacheService.del([failKey, blockKey]);
    const tokens = await this.createTokens(user.id, user.email, user.role.name);
    const refreshTokenHash = await argon2.hash(tokens.refreshToken);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash },
    });

    return tokens;
  }

  async refresh(userId: string, refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { role: true } });
    if (!user?.refreshTokenHash) {
      throw new UnauthorizedException('Refresh token is invalid');
    }

    const tokenMatch = await argon2.verify(user.refreshTokenHash, refreshToken);
    if (!tokenMatch) {
      throw new UnauthorizedException('Refresh token mismatch');
    }

    const tokens = await this.createTokens(user.id, user.email, user.role.name);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: await argon2.hash(tokens.refreshToken) },
    });

    return tokens;
  }

  async logout(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });
  }

  async me(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });
  }

  private async createTokens(userId: string, email: string, role: string): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = { sub: userId, email, role };
    const accessSecret = this.configService.get<string>('auth.accessSecret') || process.env.JWT_ACCESS_SECRET || 'fallback_access_secret';
    const refreshSecret = this.configService.get<string>('auth.refreshSecret') || process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret';
    const accessExpiresIn = (this.configService.get<string>('auth.accessExpiresIn') || '15m') as any;
    const refreshExpiresIn = (this.configService.get<string>('auth.refreshExpiresIn') || '7d') as any;

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: accessSecret,
        expiresIn: accessExpiresIn,
      }),
      this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: refreshExpiresIn,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async bumpLoginFailure(
    failKey: string,
    blockKey: string,
    maxAttempts: number,
    windowSeconds: number,
    blockSeconds: number,
  ): Promise<void> {
    const attempts = await this.cacheService.incr(failKey, windowSeconds);
    if (attempts >= maxAttempts) {
      await this.cacheService.set(blockKey, { blocked: true }, blockSeconds);
      throw new HttpException('Too many login attempts. Please try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }
  }
}
