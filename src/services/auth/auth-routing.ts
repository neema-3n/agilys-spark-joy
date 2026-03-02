const DEFAULT_APP_FALLBACK = '/app/dashboard';

const isSafeAppPath = (value: string): boolean => {
  if (!value.startsWith('/') || value.startsWith('//')) {
    return false;
  }

  return value === '/app' || value.startsWith('/app/') || value.startsWith('/app?') || value.startsWith('/app#');
};

export const normalizeRedirectPath = (
  value: string | null | undefined,
  fallback = DEFAULT_APP_FALLBACK
): string => {
  if (!value) {
    return fallback;
  }

  return isSafeAppPath(value) ? value : fallback;
};

export const buildRequestedPath = (pathname: string, search = '', hash = ''): string => {
  return `${pathname}${search}${hash}`;
};

export interface LoginRedirectInput {
  stateFrom?: string | null;
  search?: string;
  fallback?: string;
}

export const resolveLoginRedirect = ({
  stateFrom,
  search = '',
  fallback = DEFAULT_APP_FALLBACK
}: LoginRedirectInput): string => {
  const searchParams = new URLSearchParams(search);
  const queryFrom = searchParams.get('from');
  return normalizeRedirectPath(stateFrom ?? queryFrom, fallback);
};
