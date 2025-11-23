import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PaginatedResponse, PaginationParams } from '@/types/facture.types';

interface UseServerPaginationOptions<T> {
  queryKey: (string | undefined)[];
  queryFn: (params: PaginationParams) => Promise<PaginatedResponse<T>>;
  initialPageSize?: number;
  initialPage?: number;
  enableUrlSync?: boolean;
  enablePrefetch?: boolean;
  storageKey?: string;
  enabled?: boolean;
}

export function useServerPagination<T>({
  queryKey,
  queryFn,
  initialPageSize = 25,
  initialPage = 1,
  enableUrlSync = true,
  enablePrefetch = true,
  storageKey,
  enabled = true,
}: UseServerPaginationOptions<T>) {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // Récupérer pageSize depuis localStorage ou utiliser la valeur par défaut
  const getInitialPageSize = () => {
    if (storageKey) {
      const saved = localStorage.getItem(`${storageKey}-pageSize`);
      if (saved) return parseInt(saved, 10);
    }
    return initialPageSize;
  };

  // État de pagination
  const [page, setPage] = useState<number>(() => {
    if (enableUrlSync) {
      const urlPage = searchParams.get('page');
      return urlPage ? parseInt(urlPage, 10) : initialPage;
    }
    return initialPage;
  });

  const [pageSize, setPageSizeState] = useState<number>(getInitialPageSize);
  const [filters, setFiltersState] = useState<Record<string, any>>(() => {
    if (enableUrlSync) {
      const urlFilters: Record<string, any> = {};
      searchParams.forEach((value, key) => {
        if (key !== 'page' && key !== 'pageSize') {
          urlFilters[key] = value;
        }
      });
      return urlFilters;
    }
    return {};
  });

  const [sortBy, setSortByState] = useState<string>('date_facture');
  const [sortOrder, setSortOrderState] = useState<'asc' | 'desc'>('desc');

  // Construire les paramètres de pagination
  const paginationParams: PaginationParams = {
    page,
    pageSize,
    sortBy,
    sortOrder,
    filters,
  };

  // Query principale
  const {
    data: response,
    isLoading,
    isFetching,
    error,
  } = useQuery<PaginatedResponse<T>>({
    queryKey: [...queryKey, paginationParams],
    queryFn: () => queryFn(paginationParams),
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const data = response?.data || [];
  const totalCount = response?.totalCount || 0;
  const totalPages = response?.totalPages || 0;

  // Prefetch pages adjacentes
  useEffect(() => {
    if (!enablePrefetch || !response) return;

    // Prefetch page suivante
    if (page < totalPages) {
      const nextParams = { ...paginationParams, page: page + 1 };
      queryClient.prefetchQuery({
        queryKey: [...queryKey, nextParams],
        queryFn: () => queryFn(nextParams),
      });
    }

    // Prefetch page précédente
    if (page > 1) {
      const prevParams = { ...paginationParams, page: page - 1 };
      queryClient.prefetchQuery({
        queryKey: [...queryKey, prevParams],
        queryFn: () => queryFn(prevParams),
      });
    }
  }, [page, totalPages, enablePrefetch, queryKey, paginationParams, queryClient, response, queryFn]);

  // Synchroniser avec l'URL
  useEffect(() => {
    if (!enableUrlSync) return;

    const params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('pageSize', pageSize.toString());
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, value.toString());
      }
    });

    setSearchParams(params, { replace: true });
  }, [page, pageSize, filters, enableUrlSync, setSearchParams]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        return;
      }

      switch (e.key) {
        case 'ArrowLeft':
          if (page > 1) {
            e.preventDefault();
            setPage(page - 1);
          }
          break;
        case 'ArrowRight':
          if (page < totalPages) {
            e.preventDefault();
            setPage(page + 1);
          }
          break;
        case 'Home':
          if (e.ctrlKey && page !== 1) {
            e.preventDefault();
            setPage(1);
          }
          break;
        case 'End':
          if (e.ctrlKey && page !== totalPages && totalPages > 0) {
            e.preventDefault();
            setPage(totalPages);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [page, totalPages]);

  // Actions de navigation
  const goToPage = useCallback((newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  }, [totalPages]);

  const nextPage = useCallback(() => {
    if (page < totalPages) {
      setPage(page + 1);
    }
  }, [page, totalPages]);

  const previousPage = useCallback(() => {
    if (page > 1) {
      setPage(page - 1);
    }
  }, [page]);

  const setPageSize = useCallback((newSize: number) => {
    setPageSizeState(newSize);
    setPage(1); // Revenir à la première page
    if (storageKey) {
      localStorage.setItem(`${storageKey}-pageSize`, newSize.toString());
    }
  }, [storageKey]);

  const setFilters = useCallback((newFilters: Record<string, any>) => {
    setFiltersState(newFilters);
    setPage(1); // Revenir à la première page lors du changement de filtres
  }, []);

  const setSorting = useCallback((newSortBy: string, newSortOrder: 'asc' | 'desc') => {
    setSortByState(newSortBy);
    setSortOrderState(newSortOrder);
    setPage(1);
  }, []);

  return {
    // Données
    data,
    totalCount,
    isLoading,
    isFetching,
    error: error as Error | null,

    // État pagination
    currentPage: page,
    pageSize,
    totalPages,

    // Navigation
    goToPage,
    nextPage,
    previousPage,
    setPageSize,

    // Flags
    canGoNext: page < totalPages,
    canGoPrevious: page > 1,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,

    // Filtres/tri
    filters,
    setFilters,
    sortBy,
    sortOrder,
    setSorting,
  };
}
