import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Public } from 'src/common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';

@ApiTags('auth')
@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'User login' })
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    return {
      data: await this.authService.login(dto, {
        ip: req.ip,
        userAgent: req.headers['user-agent'] || '',
      }),
    };
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh tokens' })
  async refresh(@Body() dto: RefreshTokenDto, @Req() req: { user?: { id: string } }) {
    const userId = req.user?.id;
    return { data: await this.authService.refresh(userId || '', dto.refreshToken) };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @ApiBearerAuth()
  async logout(@Req() req: { user: { id: string } }) {
    await this.authService.logout(req.user.id);
    return { data: { loggedOut: true } };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  async me(@Req() req: { user: { id: string } }) {
    return { data: await this.authService.me(req.user.id) };
  }
}
