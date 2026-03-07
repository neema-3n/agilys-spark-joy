import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { WorkflowException } from '@/types/workflow-exception.types';

interface WorkflowExceptionsListProps {
  exceptions: WorkflowException[];
  isLoading: boolean;
  onVote?: (exceptionId: string, decision: 'approuver' | 'rejeter') => Promise<void>;
}

const statusLabel: Record<WorkflowException['status'], string> = {
  soumise: 'Soumise',
  approuvee: 'Approuvée',
  rejetee: 'Rejetée',
  expiree: 'Expirée',
  consommee: 'Consommée',
};

export const WorkflowExceptionsList = ({ exceptions, isLoading, onVote }: WorkflowExceptionsListProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Demandes d&apos;exception</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? <p className="text-sm text-muted-foreground">Chargement...</p> : null}
        {!isLoading && exceptions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune demande d&apos;exception trouvée pour cet exercice.</p>
        ) : null}
        {!isLoading && exceptions.length > 0 ? (
          <div className="space-y-3">
            {exceptions.map((item) => (
              <div key={item.id} className="rounded-md border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{item.transition}</p>
                  <Badge variant={item.status === 'approuvee' ? 'default' : 'outline'}>{statusLabel[item.status]}</Badge>
                </div>
                <p className="mt-2 text-sm">{item.motif}</p>
                <div className="mt-2 text-xs text-muted-foreground">
                  Quorum: {item.votes.filter((vote) => vote.decision === 'approuver').length}/{item.quorumRequired} - Expire le{' '}
                  {new Date(item.expiresAt).toLocaleString('fr-FR')}
                </div>
                {item.status === 'soumise' && onVote ? (
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => void onVote(item.id, 'approuver')}>
                      Approuver
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => void onVote(item.id, 'rejeter')}>
                      Rejeter
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};
