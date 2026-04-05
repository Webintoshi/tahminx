export const buildPaginationMeta = (page: number, pageSize: number, total: number): { page: number; pageSize: number; total: number } => ({
  page,
  pageSize,
  total,
});
