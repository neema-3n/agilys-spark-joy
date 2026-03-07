import { PageHeader } from '@/components/PageHeader';
import { WorkflowExceptionsList } from '@/components/workflow-exceptions/WorkflowExceptionsList';
import { useWorkflowExceptions } from '@/hooks/useWorkflowExceptions';
import { useExercice } from '@/contexts/ExerciceContext';
import { useAuth } from '@/contexts/AuthContext';

const ControleInterne = () => {
  const { currentExercice } = useExercice();
  const { hasAnyRole } = useAuth();
  const { exceptions, isLoading, voteWorkflowException } = useWorkflowExceptions();
  const canVote = hasAnyRole(['super_admin', 'admin_client', 'directeur_financier', 'comptable']);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contrôle Interne"
        description="Audits, workflows d'approbation et traçabilité"
      />
      
      <div className="px-8">
        <WorkflowExceptionsList
          exceptions={exceptions}
          isLoading={isLoading}
          onVote={
            currentExercice?.id && canVote
              ? (id, decision) =>
                  voteWorkflowException({
                    id,
                    payload: {
                      exerciceId: currentExercice.id,
                      decision,
                    },
                  }).then(() => undefined)
              : undefined
          }
        />
      </div>
    </div>
  );
};

export default ControleInterne;
