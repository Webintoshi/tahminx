import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as compression from 'compression';
import helmet from 'helmet';
import * as Sentry from '@sentry/node';
import { AppModule } from './app.module';
import { PrismaService } from './database/prisma.service';
import { initOpenTelemetry } from './common/logger/otel.bootstrap';

async function bootstrap() {
  await initOpenTelemetry();

  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.enableShutdownHooks();

  const configService = app.get(ConfigService);
  const trustProxy = configService.get<boolean | number | string>('app.trustProxy');
  const httpAdapter = app.getHttpAdapter().getInstance();
  if (typeof httpAdapter?.set === 'function') {
    httpAdapter.set('trust proxy', trustProxy);
  }

  const sentryDsn = configService.get<string>('observability.sentryDsn');
  if (sentryDsn) {
    Sentry.init({ dsn: sentryDsn, tracesSampleRate: 0.2 });
  }

  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: configService.get<string>('app.nodeEnv') === 'production',
      hsts:
        configService.get<string>('app.nodeEnv') === 'production'
          ? { maxAge: 15552000, includeSubDomains: true }
          : false,
      referrerPolicy: { policy: 'no-referrer' },
      frameguard: { action: 'deny' },
      noSniff: true,
    }),
  );

  if (Boolean(configService.get<boolean>('app.responseCompression'))) {
    app.use(compression());
  }

  app.enableCors({
    origin: configService.get<string[] | true>('app.corsAllowlist') || true,
    methods: String(configService.get<string>('app.corsMethods') || 'GET,POST,PATCH,PUT,DELETE,OPTIONS').split(','),
    allowedHeaders: String(configService.get<string>('app.corsHeaders') || 'Content-Type,Authorization,X-Correlation-Id').split(','),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('TahminX Backend API')
    .setDescription('Sports analytics and prediction platform backend API')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const prismaService = app.get(PrismaService);
  await prismaService.enableShutdownHooks(app);

  const port = Number(configService.get<number>('app.port') || 3000);
  await app.listen(port, '0.0.0.0');
}

void bootstrap();