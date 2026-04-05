export interface StoragePutInput {
  bucket: string;
  key: string;
  content: Buffer | string;
  contentType?: string;
}

export interface StorageGetInput {
  bucket: string;
  key: string;
}

export interface StorageDeleteInput {
  bucket: string;
  key: string;
}

export interface StorageAdapter {
  put(input: StoragePutInput): Promise<{ bucket: string; key: string; url: string }>;
  get(input: StorageGetInput): Promise<Buffer | null>;
  delete(input: StorageDeleteInput): Promise<void>;
  url(input: StorageGetInput): string;
}