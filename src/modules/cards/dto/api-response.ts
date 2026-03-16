export interface PageMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  data: T;
  meta?: PageMeta;
}

export function ok<T>(data: T): ApiResponse<T> {
  return { data };
}

export function paginated<T>(
  data: T,
  total: number,
  page: number,
  pageSize: number,
): ApiResponse<T> {
  return {
    data,
    meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
  };
}
