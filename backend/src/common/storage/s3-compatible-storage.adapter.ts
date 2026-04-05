import { Injectable } from '@nestjs/common';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { StorageAdapter, StorageDeleteInput, StorageGetInput, StoragePutInput } from './storage.interface';

@Injectable()
export class S3CompatibleStorageAdapter implements StorageAdapter {
  private readonly client: S3Client;
  private readonly publicBaseUrl?: string;
  private readonly endpoint: string;

  constructor(input: {
    endpoint: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    forcePathStyle: boolean;
    publicBaseUrl?: string;
  }) {
    this.endpoint = input.endpoint;
    this.publicBaseUrl = input.publicBaseUrl;
    this.client = new S3Client({
      endpoint: input.endpoint,
      region: input.region,
      forcePathStyle: input.forcePathStyle,
      credentials: {
        accessKeyId: input.accessKeyId,
        secretAccessKey: input.secretAccessKey,
      },
    });
  }

  async put(input: StoragePutInput): Promise<{ bucket: string; key: string; url: string }> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: input.bucket,
        Key: input.key,
        Body: input.content,
        ContentType: input.contentType,
      }),
    );

    return {
      bucket: input.bucket,
      key: input.key,
      url: this.url({ bucket: input.bucket, key: input.key }),
    };
  }

  async get(input: StorageGetInput): Promise<Buffer | null> {
    try {
      const result = await this.client.send(
        new GetObjectCommand({
          Bucket: input.bucket,
          Key: input.key,
        }),
      );

      if (!result.Body) {
        return null;
      }

      const byteArray = await result.Body.transformToByteArray();
      return Buffer.from(byteArray);
    } catch {
      return null;
    }
  }

  async delete(input: StorageDeleteInput): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: input.bucket,
        Key: input.key,
      }),
    );
  }

  url(input: StorageGetInput): string {
    if (this.publicBaseUrl) {
      const normalized = this.publicBaseUrl.replace(/\/+$/, '');
      return `${normalized}/${encodeURIComponent(input.bucket)}/${input.key}`;
    }

    const normalizedEndpoint = this.endpoint.replace(/\/+$/, '');
    return `${normalizedEndpoint}/${encodeURIComponent(input.bucket)}/${input.key}`;
  }
}