import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthProviderStrategyService } from './auth-provider.strategy';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshTokenStrategy } from './strategies/refresh-token.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('auth.accessSecret'),
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthProviderStrategyService, JwtStrategy, RefreshTokenStrategy],
  exports: [AuthService, AuthProviderStrategyService],
})
export class AuthModule {}
