import { Logger } from '@nestjs/common';

const logger = new Logger('OpenTelemetry');

export const initOpenTelemetry = async (): Promise<void> => {
  try {
    const sdkPkg = (await import('@opentelemetry/sdk-node')) as any;
    const autoPkg = (await import('@opentelemetry/auto-instrumentations-node')) as any;

    const sdk = new sdkPkg.NodeSDK({
      instrumentations: [autoPkg.getNodeAutoInstrumentations()],
    });

    await sdk.start();
    logger.log('OpenTelemetry SDK started');
  } catch (error) {
    logger.warn(`OpenTelemetry SDK not started: ${(error as Error).message}`);
  }
};
