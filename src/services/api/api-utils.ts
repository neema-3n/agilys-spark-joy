import { httpClient, RequestOptions } from '@/services/api/http-client';

const extractErrorMessage = (payload: unknown): string | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const candidate = Reflect.get(payload, 'message');

  if (Array.isArray(candidate)) {
    const text = candidate.filter((item): item is string => typeof item === 'string').join(' | ');
    return text.length > 0 ? text : null;
  }

  if (typeof candidate === 'string' && candidate.trim().length > 0) {
    return candidate;
  }

  return null;
};

export const requestJson = async <T>(path: string, options: RequestOptions, fallbackError: string): Promise<T> => {
  const response = await httpClient.request(path, options);
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const serverError = extractErrorMessage(payload);
    throw new Error(serverError ?? fallbackError);
  }

  return payload as T;
};
