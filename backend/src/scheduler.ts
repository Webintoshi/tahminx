import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { initOpenTelemetry } from './common/logger/otel.bootstrap';

async function bootstrapScheduler() {
  process.env.APP_ROLE = process.env.APP_ROLE || 'scheduler';
  await initOpenTelemetry();

  const logger = new Logger('SchedulerBootstrap');
  const app = await NestFactory.createApplicationContext(AppModule, { bufferLogs: true });

  const shutdown = async (signal: string) => {
    logger.log(`Received ${signal}, shutting down scheduler...`);
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });

  logger.log('Scheduler context started.');
}

void bootstrapScheduler();