import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type AuthProviderType = 'jwt' | 'supabase-adapter';

@Injectable()
export class AuthProviderStrategyService {
  private readonly logger = new Logger(AuthProviderStrategyService.name);

  constructor(private readonly configService: ConfigService) {}

  provider(): AuthProviderType {
    return (this.configService.get<AuthProviderType>('auth.provider') || 'jwt') as AuthProviderType;
  }

  assertSupported(): void {
    const provider = this.provider();
    if (provider === 'supabase-adapter') {
      this.logger.warn('AUTH_PROVIDER=supabase-adapter configured. Running JWT compatibility mode until Supabase Auth adapter is enabled.');
    }
  }
}