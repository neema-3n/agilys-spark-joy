import { requestJson } from '@/services/api/api-utils';
import type {
  CreateWorkflowExceptionInput,
  VoteWorkflowExceptionInput,
  WorkflowException,
  WorkflowExceptionStatus,
} from '@/types/workflow-exception.types';

export const listWorkflowExceptions = async (
  exerciceId: string,
  status?: WorkflowExceptionStatus
): Promise<WorkflowException[]> => {
  const params = new URLSearchParams({ exerciceId });
  if (status) {
    params.set('status', status);
  }

  return requestJson<WorkflowException[]>(
    `/workflow-exceptions?${params.toString()}`,
    { method: 'GET' },
    'Erreur lors du chargement des demandes d\'exception'
  );
};

export const createWorkflowException = async (payload: CreateWorkflowExceptionInput): Promise<WorkflowException> => {
  return requestJson<WorkflowException>(
    '/workflow-exceptions',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    'Erreur lors de la création de la demande d\'exception'
  );
};

export const voteWorkflowException = async (
  exceptionId: string,
  payload: VoteWorkflowExceptionInput
): Promise<WorkflowException> => {
  return requestJson<WorkflowException>(
    `/workflow-exceptions/${encodeURIComponent(exceptionId)}/votes`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    'Erreur lors de l\'enregistrement du vote'
  );
};
