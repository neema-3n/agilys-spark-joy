import { toast } from 'sonner';

export const normalizeMutationErrorMessage = (
  error: unknown,
  fallbackMessage: string
): string => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallbackMessage;
};

export const showMutationErrorToast = (
  error: unknown,
  fallbackMessage: string
): void => {
  toast.error(normalizeMutationErrorMessage(error, fallbackMessage), {
    duration: 8000,
    style: { whiteSpace: 'pre-line', maxWidth: '500px' }
  });
};
