export interface ApiResponseMeta {
  page?: number;
  pageSize?: number;
  total?: number;
  [key: string]: unknown;
}

export interface ApiError {
  code: string;
  message: string;
  details: unknown[];
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  meta: ApiResponseMeta | null;
  error: ApiError | null;
}
