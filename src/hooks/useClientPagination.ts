import { useEffect, useMemo, useState } from 'react';

interface UseClientPaginationOptions {
  initialPageSize?: number;
  resetKey?: string;
}

export function useClientPagination<T>(
  items: T[],
  { initialPageSize = 25, resetKey }: UseClientPaginationOptions = {}
) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [resetKey]);

  const totalCount = items.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [currentPage, items, pageSize]);

  return {
    currentPage,
    pageSize,
    totalCount,
    totalPages,
    paginatedItems,
    goToPage: setCurrentPage,
    setPageSize,
  };
}
