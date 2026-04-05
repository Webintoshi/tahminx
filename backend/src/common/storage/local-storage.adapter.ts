import { Injectable } from '@nestjs/common';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { StorageAdapter, StorageDeleteInput, StorageGetInput, StoragePutInput } from './storage.interface';

@Injectable()
export class LocalStorageAdapter implements StorageAdapter {
  constructor(private readonly rootPath: string, private readonly publicBaseUrl?: string) {}

  async put(input: StoragePutInput): Promise<{ bucket: string; key: string; url: string }> {
    const objectPath = this.resolvePath(input.bucket, input.key);
    await fs.mkdir(path.dirname(objectPath), { recursive: true });
    await fs.writeFile(objectPath, input.content);
    return {
      bucket: input.bucket,
      key: input.key,
      url: this.url({ bucket: input.bucket, key: input.key }),
    };
  }

  async get(input: StorageGetInput): Promise<Buffer | null> {
    try {
      return await fs.readFile(this.resolvePath(input.bucket, input.key));
    } catch {
      return null;
    }
  }

  async delete(input: StorageDeleteInput): Promise<void> {
    try {
      await fs.rm(this.resolvePath(input.bucket, input.key), { force: true });
    } catch {
      return;
    }
  }

  url(input: StorageGetInput): string {
    if (this.publicBaseUrl) {
      const base = this.publicBaseUrl.replace(/\/+$/, '');
      return `${base}/${encodeURIComponent(input.bucket)}/${input.key}`;
    }

    const relative = path.join(input.bucket, input.key).replace(/\\/g, '/');
    return `file://${path.resolve(this.rootPath, relative)}`;
  }

  private resolvePath(bucket: string, key: string): string {
    const safeBucket = bucket.replace(/[^a-zA-Z0-9._-]/g, '_');
    const normalizedKey = key.replace(/\.\./g, '').replace(/^\/+/, '');
    return path.resolve(this.rootPath, safeBucket, normalizedKey);
  }
}