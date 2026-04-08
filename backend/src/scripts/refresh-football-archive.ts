import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from 'src/app.module';
import { ArchiveMaintenanceService, type RefreshFootballArchiveOptions } from 'src/modules/archive/archive-maintenance.service';

const logger = new Logger('RefreshFootballArchiveScript');

async function main() {
  const options = parseArgs(process.argv.slice(2));
  logger.log(`Football archive refresh started ${JSON.stringify(options)}`);

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn'],
  });

  try {
    const service = app.get(ArchiveMaintenanceService);
    const result = await service.refreshFootballArchive(options);
    logger.log(`Football archive refresh finished ${JSON.stringify(result)}`);
  } finally {
    await app.close();
  }
}

function parseArgs(argv: string[]): RefreshFootballArchiveOptions {
  const options: RefreshFootballArchiveOptions = {};

  for (const arg of argv) {
    if (arg.startsWith('--from=')) {
      options.from = arg.slice('--from='.length);
      continue;
    }
    if (arg.startsWith('--to=')) {
      options.to = arg.slice('--to='.length);
      continue;
    }
    if (arg.startsWith('--leagueId=')) {
      options.leagueId = arg.slice('--leagueId='.length);
      continue;
    }
    if (arg.startsWith('--seasonId=')) {
      options.seasonId = arg.slice('--seasonId='.length);
      continue;
    }
    if (arg.startsWith('--limit=')) {
      options.limit = toPositiveInt(arg.slice('--limit='.length));
      continue;
    }
    if (arg.startsWith('--chunkSize=')) {
      options.chunkSize = toPositiveInt(arg.slice('--chunkSize='.length));
      continue;
    }
    if (arg === '--skip-standings') {
      options.skipStandings = true;
      continue;
    }
    if (arg === '--skip-forms') {
      options.skipForms = true;
      continue;
    }
    if (arg === '--skip-predictions') {
      options.skipPredictions = true;
      continue;
    }
    if (arg === '--include-live-provider-matches') {
      options.onlyArchiveMatches = false;
      continue;
    }
    if (arg === '--force-predictions') {
      options.onlyMissingPredictions = false;
      continue;
    }
  }

  return options;
}

function toPositiveInt(value: string): number | undefined {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }
  return Math.trunc(parsed);
}

void main();
