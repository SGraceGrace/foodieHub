
export interface ApiResponse<T> {
  successMessage: string;
  data: T;
  httpCode: number;
  errorMsg: string[];
}