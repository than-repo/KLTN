export type ApiResponse<T> = {
  data: T | null;
  message?: string;
  path: string;
  statusCode: number;
  success: boolean;
  timestamp: string;
};

export type ApiErrorPayload = {
  details?: unknown;
  message: string;
  statusCode: number;
};
