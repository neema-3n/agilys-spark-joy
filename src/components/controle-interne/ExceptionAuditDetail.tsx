import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TresorerieRiskBadge } from '@/components/tresorerie/TresorerieRiskBadge';
import { formatCurrency } from '@/lib/utils';
import type { TresorerieAuditDetail } from '@/types/tresorerie.types';

interface ExceptionAuditDetailProps {
  detail?: TresorerieAuditDetail;
  isLoading: boolean;
}

export const ExceptionAuditDetail = ({ detail, isLoading }: ExceptionAuditDetailProps) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Détail de l&apos;exception</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Chargement du détail...</p>
        </CardContent>
      </Card>
    );
  }

  if (!detail) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Détail de l&apos;exception</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Sélectionnez une ligne du journal pour afficher le snapshot de risque et la trace d&apos;audit.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Détail d&apos;audit
          <Badge variant="secondary">{detail.status}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <TresorerieRiskBadge severity={detail.severity} />
          <Badge variant="outline">{detail.transition}</Badge>
          <Badge variant="outline">{detail.correlationId}</Badge>
        </div>

        <div className="grid gap-3 text-sm md:grid-cols-2">
          <div>
            <div className="text-muted-foreground">Position disponible</div>
            <div className="font-medium">{formatCurrency(detail.snapshot.availableCash)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Gap projeté</div>
            <div className="font-medium">{formatCurrency(detail.snapshot.projectedGap)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Exposition projetée</div>
            <div className="font-medium">{formatCurrency(detail.snapshot.projectedExposure)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Opérations non rapprochées</div>
            <div className="font-medium">{detail.snapshot.nonReconciledOperations}</div>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <p className="text-sm font-medium">Raisons du blocage</p>
          {detail.reasons.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune raison explicite enregistrée.</p>
          ) : (
            <ul className="list-disc pl-5 text-sm text-muted-foreground">
              {detail.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          )}
        </div>

        <Separator />

        <div className="space-y-2">
          <p className="text-sm font-medium">Approbateurs ({detail.approvers.length})</p>
          {detail.approvers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun approbateur enregistré.</p>
          ) : (
            <div className="space-y-2">
              {detail.approvers.map((approver, index) => (
                <div key={`${approver.actorUserId}-${approver.createdAt}-${index}`} className="rounded border p-2 text-xs">
                  <div className="font-medium">{approver.actorUserId}</div>
                  <div className="text-muted-foreground">
                    {approver.decision} - {new Date(approver.createdAt).toLocaleString('fr-FR')}
                  </div>
                  {approver.commentaire ? <div className="text-muted-foreground">{approver.commentaire}</div> : null}
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator />

        <div className="space-y-2">
          <p className="text-sm font-medium">Événements ({detail.events.length})</p>
          <div className="space-y-2">
            {detail.events.map((event) => (
              <div key={event.id} className="rounded border p-2 text-xs">
                <div className="font-medium">{event.eventType}</div>
                <div className="text-muted-foreground">
                  {new Date(event.createdAt).toLocaleString('fr-FR')} - {event.actorUserId}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
