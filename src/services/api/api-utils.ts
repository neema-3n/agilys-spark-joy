import { httpClient, RequestOptions } from '@/services/api/http-client';
import type { CashRiskDecision } from '@/types/cash-risk.types';

interface ApiErrorPayload {
  statusCode?: unknown;
  code?: unknown;
  error?: unknown;
  message?: unknown;
  riskDecision?: unknown;
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

export class ApiError extends Error {
  public readonly statusCode?: number;
  public readonly code?: string;
  public readonly riskDecision?: CashRiskDecision;
  public readonly payload: unknown;

  constructor(message: string, options: { statusCode?: number; code?: string; riskDecision?: CashRiskDecision; payload: unknown }) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = options.statusCode;
    this.code = options.code;
    this.riskDecision = options.riskDecision;
    this.payload = options.payload;
  }
}

const extractErrorMessage = (payload: unknown): string | null => {
  if (!isRecord(payload)) {
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

const extractStatusCode = (payload: ApiErrorPayload, fallbackStatusCode: number): number => {
  if (typeof payload.statusCode === 'number') {
    return payload.statusCode;
  }
  return fallbackStatusCode;
};

const extractCode = (payload: ApiErrorPayload): string | undefined => {
  return typeof payload.code === 'string' ? payload.code : undefined;
};

const extractRiskDecision = (payload: ApiErrorPayload): CashRiskDecision | undefined => {
  if (!isRecord(payload.riskDecision)) {
    return undefined;
  }
  return payload.riskDecision as unknown as CashRiskDecision;
};

const buildApiError = (payload: unknown, fallbackError: string, responseStatusCode: number): ApiError => {
  if (!isRecord(payload)) {
    return new ApiError(fallbackError, { statusCode: responseStatusCode, payload });
  }

  const normalizedPayload = payload as ApiErrorPayload;
  const message = extractErrorMessage(normalizedPayload) ?? fallbackError;

  return new ApiError(message, {
    statusCode: extractStatusCode(normalizedPayload, responseStatusCode),
    code: extractCode(normalizedPayload),
    riskDecision: extractRiskDecision(normalizedPayload),
    payload,
  });
};

export const isApiError = (error: unknown): error is ApiError => {
  return error instanceof ApiError;
};

export const isCashRiskBlockedError = (
  error: unknown
): error is ApiError & { code: 'CASH_RISK_BLOCKED'; riskDecision: CashRiskDecision } => {
  return isApiError(error) && error.code === 'CASH_RISK_BLOCKED' && Boolean(error.riskDecision);
};

export const requestJson = async <T>(path: string, options: RequestOptions, fallbackError: string): Promise<T> => {
  const response = await httpClient.request(path, options);
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw buildApiError(payload, fallbackError, response.status);
  }

  return payload as T;
};
