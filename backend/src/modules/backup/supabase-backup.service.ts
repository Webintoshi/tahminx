import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { Client } from 'pg';

type BackupRunOptions = {
  source?: string;
};

type TableSummary = {
  table: string;
  rowsCopied: number;
};

type TableColumn = {
  name: string;
  dataType: string;
};

@Injectable()
export class SupabaseBackupService {
  private readonly logger = new Logger(SupabaseBackupService.name);
  private readonly metadataTables = ['tahminx_backup_migrations', 'tahminx_backup_sync_runs'];

  constructor(private readonly configService: ConfigService) {}

  isEnabled(): boolean {
    return Boolean(this.configService.get<boolean>('backup.enabled'));
  }

  async runFullSync(options: BackupRunOptions = {}): Promise<{
    status: 'completed' | 'skipped';
    source: string;
    tablesCopied: number;
    rowsCopied: number;
    summary: TableSummary[];
  }> {
    const source = options.source || 'manual';
    const sourceDatabaseUrl = this.configService.get<string>('db.directUrl') || this.configService.get<string>('db.url');
    const targetDatabaseUrl =
      this.configService.get<string>('backup.directDatabaseUrl') || this.configService.get<string>('backup.databaseUrl');

    if (!this.isEnabled() || !targetDatabaseUrl) {
      this.logger.log(`supabase_backup_sync_skipped source=${source} reason=disabled`);
      return { status: 'skipped', source, tablesCopied: 0, rowsCopied: 0, summary: [] };
    }

    if (!sourceDatabaseUrl) {
      throw new Error('Primary database URL is not configured');
    }

    if (sourceDatabaseUrl === targetDatabaseUrl) {
      throw new Error('Primary and Supabase backup database URLs must be different');
    }

    const batchSize = Math.max(10, Number(this.configService.get<number>('backup.batchSize') || 200));
    const sourceClient = new Client({ connectionString: sourceDatabaseUrl });
    const targetClient = new Client({ connectionString: targetDatabaseUrl });
    const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    await sourceClient.connect();
    await targetClient.connect();

    try {
      await sourceClient.query("SET statement_timeout = '0'");
      await targetClient.query("SET statement_timeout = '0'");

      await this.ensureMetadataTables(targetClient);
      await this.recordRunStart(targetClient, runId, source);
      await this.applyMigrations(targetClient);

      const tables = await this.loadSourceTables(sourceClient);
      if (!tables.length) {
        await this.recordRunFinish(targetClient, runId, 'completed', [], null);
        this.logger.log(`supabase_backup_sync_completed source=${source} tables=0 rows=0`);
        return { status: 'completed', source, tablesCopied: 0, rowsCopied: 0, summary: [] };
      }

      const summaries: TableSummary[] = [];

      await targetClient.query('BEGIN');
      await targetClient.query("SET session_replication_role = 'replica'");
      await targetClient.query(`TRUNCATE ${tables.map((table) => this.quoteIdentifier(table)).join(', ')} RESTART IDENTITY CASCADE`);

      for (const table of tables) {
        const rowsCopied = await this.copyTable(sourceClient, targetClient, table, batchSize);
        summaries.push({ table, rowsCopied });
        this.logger.log(`supabase_backup_table_synced table=${table} rows=${rowsCopied}`);
      }

      await targetClient.query("SET session_replication_role = 'origin'");
      await targetClient.query('COMMIT');

      const rowsCopied = summaries.reduce((total, item) => total + item.rowsCopied, 0);
      await this.recordRunFinish(targetClient, runId, 'completed', summaries, null);
      this.logger.log(`supabase_backup_sync_completed source=${source} tables=${summaries.length} rows=${rowsCopied}`);

      return {
        status: 'completed',
        source,
        tablesCopied: summaries.length,
        rowsCopied,
        summary: summaries,
      };
    } catch (error) {
      try {
        await targetClient.query("SET session_replication_role = 'origin'");
      } catch {}

      try {
        await targetClient.query('ROLLBACK');
      } catch {}

      const message = (error as Error).message;
      await this.recordRunFinish(targetClient, runId, 'failed', [], message);
      this.logger.error(`supabase_backup_sync_failed source=${source} reason=${message}`);
      throw error;
    } finally {
      await Promise.allSettled([sourceClient.end(), targetClient.end()]);
    }
  }

  private async ensureMetadataTables(targetClient: Client): Promise<void> {
    await targetClient.query(`
      CREATE TABLE IF NOT EXISTS "tahminx_backup_migrations" (
        "name" TEXT PRIMARY KEY,
        "appliedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await targetClient.query(`
      CREATE TABLE IF NOT EXISTS "tahminx_backup_sync_runs" (
        "id" TEXT PRIMARY KEY,
        "source" TEXT NOT NULL,
        "status" TEXT NOT NULL,
        "startedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "finishedAt" TIMESTAMPTZ,
        "summary" JSONB,
        "error" TEXT
      )
    `);
  }

  private async recordRunStart(targetClient: Client, runId: string, source: string): Promise<void> {
    await targetClient.query(
      `INSERT INTO "tahminx_backup_sync_runs" ("id", "source", "status") VALUES ($1, $2, 'running')
       ON CONFLICT ("id") DO UPDATE SET "source" = EXCLUDED."source", "status" = EXCLUDED."status", "startedAt" = NOW()`,
      [runId, source],
    );
  }

  private async recordRunFinish(
    targetClient: Client,
    runId: string,
    status: 'completed' | 'failed',
    summary: TableSummary[],
    errorMessage: string | null,
  ): Promise<void> {
    await targetClient.query(
      `UPDATE "tahminx_backup_sync_runs"
       SET "status" = $2, "finishedAt" = NOW(), "summary" = $3::jsonb, "error" = $4
       WHERE "id" = $1`,
      [runId, status, JSON.stringify(summary), errorMessage],
    );
  }

  private async applyMigrations(targetClient: Client): Promise<void> {
    const migrationsDir = path.join(process.cwd(), 'prisma', 'migrations');
    const entries = await fs.readdir(migrationsDir, { withFileTypes: true });
    const directories = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();

    for (const migrationName of directories) {
      const exists = await targetClient.query(`SELECT 1 FROM "tahminx_backup_migrations" WHERE "name" = $1 LIMIT 1`, [migrationName]);
      if (exists.rowCount) {
        continue;
      }

      const migrationSqlPath = path.join(migrationsDir, migrationName, 'migration.sql');
      const migrationSql = await fs.readFile(migrationSqlPath, 'utf8');
      if (!migrationSql.trim()) {
        await targetClient.query(`INSERT INTO "tahminx_backup_migrations" ("name") VALUES ($1)`, [migrationName]);
        continue;
      }

      await targetClient.query(migrationSql);
      await targetClient.query(`INSERT INTO "tahminx_backup_migrations" ("name") VALUES ($1)`, [migrationName]);
      this.logger.log(`supabase_backup_migration_applied migration=${migrationName}`);
    }
  }

  private async loadSourceTables(sourceClient: Client): Promise<string[]> {
    const result = await sourceClient.query<{ tablename: string }>(
      `
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename <> '_prisma_migrations'
          AND tablename <> ALL($1::text[])
        ORDER BY tablename ASC
      `,
      [this.metadataTables],
    );

    return result.rows.map((row) => row.tablename);
  }

  private async copyTable(sourceClient: Client, targetClient: Client, table: string, batchSize: number): Promise<number> {
    const columns = await this.loadColumns(sourceClient, table);
    if (!columns.length) {
      return 0;
    }

    const quotedColumns = columns.map((column) => this.quoteIdentifier(column.name)).join(', ');
    const tableIdentifier = this.quoteIdentifier(table);
    const rows = await sourceClient.query<Record<string, unknown>>(`SELECT ${quotedColumns} FROM ${tableIdentifier}`);
    let copied = 0;

    for (let start = 0; start < rows.rows.length; start += batchSize) {
      const chunk = rows.rows.slice(start, start + batchSize);
      if (!chunk.length) {
        continue;
      }

      const values: unknown[] = [];
      const placeholders = chunk
        .map((row, rowIndex) => {
          const rowPlaceholders = columns.map((column, columnIndex) => {
            values.push(this.normalizeValue(row[column.name], column.dataType));
            return `$${rowIndex * columns.length + columnIndex + 1}`;
          });
          return `(${rowPlaceholders.join(', ')})`;
        })
        .join(', ');

      await targetClient.query(`INSERT INTO ${tableIdentifier} (${quotedColumns}) VALUES ${placeholders}`, values);
      copied += chunk.length;
    }

    return copied;
  }

  private async loadColumns(client: Client, table: string): Promise<TableColumn[]> {
    const result = await client.query<{ column_name: string; data_type: string; udt_name: string }>(
      `
        SELECT column_name, data_type, udt_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = $1
        ORDER BY ordinal_position ASC
      `,
      [table],
    );

    return result.rows.map((row) => ({
      name: row.column_name,
      dataType: row.data_type === 'USER-DEFINED' ? row.udt_name : row.data_type,
    }));
  }

  private normalizeValue(value: unknown, dataType: string): unknown {
    if (value === null || value === undefined) {
      return null;
    }

    if (dataType === 'json' || dataType === 'jsonb') {
      return JSON.stringify(value);
    }

    return value;
  }

  private quoteIdentifier(value: string): string {
    return `"${value.replace(/"/g, '""')}"`;
  }
}
