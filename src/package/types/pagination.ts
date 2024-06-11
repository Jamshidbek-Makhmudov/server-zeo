export type PaginatedRequest = {
  perPage: number;
  page: number;
  search?: string;
};

export type PaginatedResponse<T> = {
  data: T[];
  perPage: number;
  page: number;
  total: number;
  lastPage: number;
};
