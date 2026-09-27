export type HttpStatus = 200 | 201 | 202 | 204 | 400 | 401 | 403 | 404 | 409 | 413 | 422 | 500;

export interface ApiErrorResponse {
  ok: false;
  error: string;
  details?: Record<string, unknown>;
}

export interface ApiSuccessResponse<T> {
  ok: true;
  data: T;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
