// src/types/apiTypes.ts

/**
 * @interface ApiResponse
 * @description Generic structure for API responses.
 * @template T - The type of the data payload.
 */
export interface ApiResponse<T> {
  $id: string;
  data: T;
  message?: string; // Optional, as not all responses have it
}

/**
 * @interface ApiErrorResponse
 * @description Structure for API error responses.
 * (Assuming a potential error structure, adjust if different)
 */
export interface ApiErrorResponse {
  $id: string;
  message: string;
  errors?: Record<string, string[]>; // Optional detailed errors
}