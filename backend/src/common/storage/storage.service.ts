import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LocalStorageAdapter } from './local-storage.adapter';
import { S3CompatibleStorageAdapter } from './s3-compatible-storage.adapter';
import { StorageAdapter, StorageDeleteInput, StorageGetInput, StoragePutInput } from './storage.interface';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly adapter: StorageAdapter;

  constructor(private readonly configService: ConfigService) {
    const driver = String(this.configService.get<string>('storage.driver') || 'local').toLowerCase();

    if (driver === 's3') {
      this.adapter = new S3CompatibleStorageAdapter({
        endpoint: String(this.configService.get<string>('storage.endpoint') || ''),
        region: String(this.configService.get<string>('storage.region') || 'us-east-1'),
        accessKeyId: String(this.configService.get<string>('storage.accessKeyId') || ''),
        secretAccessKey: String(this.configService.get<string>('storage.secretAccessKey') || ''),
        forcePathStyle: Boolean(this.configService.get<boolean>('storage.forcePathStyle')),
        publicBaseUrl: this.configService.get<string>('storage.publicBaseUrl'),
      });
      this.logger.log('Storage driver initialized: s3-compatible');
      return;
    }

    this.adapter = new LocalStorageAdapter(
      String(this.configService.get<string>('storage.localPath') || './storage'),
      this.configService.get<string>('storage.publicBaseUrl'),
    );
    this.logger.log('Storage driver initialized: local');
  }

  defaultBucket(): string {
    return String(this.configService.get<string>('storage.bucket') || 'tahminx-artifacts');
  }

  async putObject(input: Omit<StoragePutInput, 'bucket'> & { bucket?: string }) {
    const bucket = input.bucket || this.defaultBucket();
    return this.adapter.put({
      bucket,
      key: input.key,
      content: input.content,
      contentType: input.contentType,
    });
  }

  async getObject(input: Omit<StorageGetInput, 'bucket'> & { bucket?: string }) {
    const bucket = input.bucket || this.defaultBucket();
    return this.adapter.get({ bucket, key: input.key });
  }

  async deleteObject(input: Omit<StorageDeleteInput, 'bucket'> & { bucket?: string }) {
    const bucket = input.bucket || this.defaultBucket();
    return this.adapter.delete({ bucket, key: input.key });
  }

  objectUrl(input: Omit<StorageGetInput, 'bucket'> & { bucket?: string }) {
    const bucket = input.bucket || this.defaultBucket();
    return this.adapter.url({ bucket, key: input.key });
  }
}