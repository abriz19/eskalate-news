export interface BaseResponse {
  Success: boolean;
  Message: string;
  Object: object | null;
  Errors: string[] | null;
}

export interface PaginatedResponse<T> {
  Success: boolean;
  Message: string;
  Object: T[];
  PageNumber: number;
  PageSize: number;
  TotalSize: number;
  Errors: null;
}

export function baseResponse(
  success: boolean,
  message: string,
  object: object | null = null,
  errors: string[] | null = null
): BaseResponse {
  return {
    Success: success,
    Message: message,
    Object: object,
    Errors: success ? null : errors ?? [message],
  };
}

export function paginatedResponse<T>(
  message: string,
  list: T[],
  pageNumber: number,
  pageSize: number,
  totalSize: number
): PaginatedResponse<T> {
  return {
    Success: true,
    Message: message,
    Object: list,
    PageNumber: pageNumber,
    PageSize: pageSize,
    TotalSize: totalSize,
    Errors: null,
  };
}
