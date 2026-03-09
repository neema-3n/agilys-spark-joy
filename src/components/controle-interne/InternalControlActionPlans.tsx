import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type {
  CreateInternalControlActionPlanInput,
  InternalControlActionPlan,
  InternalControlActionPlanEvent,
  InternalControlActionPlanStatus,
} from '@/types/controle-interne.types';

interface InternalControlActionPlansProps {
  actionPlans: InternalControlActionPlan[];
  isLoading: boolean;
  isMutating: boolean;
  selectedPlanId?: string;
  events: InternalControlActionPlanEvent[];
  isEventsLoading: boolean;
  onSelectPlan: (id: string) => void;
  onCreate: (input: Omit<CreateInternalControlActionPlanInput, 'exerciceId'>) => Promise<void>;
  onStatusUpdate: (
    id: string,
    status: InternalControlActionPlanStatus,
    extra?: { rejectionReason?: string; reason?: string }
  ) => Promise<void>;
}

const statusLabel: Record<InternalControlActionPlanStatus, string> = {
  a_traiter: 'À traiter',
  en_cours: 'En cours',
  resolu: 'Résolu',
  rejete: 'Rejeté',
  cloture: 'Clôturé',
};

const statusVariant: Record<InternalControlActionPlanStatus, 'outline' | 'default' | 'destructive' | 'secondary'> = {
  a_traiter: 'outline',
  en_cours: 'secondary',
  resolu: 'default',
  rejete: 'destructive',
  cloture: 'secondary',
};

export const InternalControlActionPlans = ({
  actionPlans,
  isLoading,
  isMutating,
  selectedPlanId,
  events,
  isEventsLoading,
  onSelectPlan,
  onCreate,
  onStatusUpdate,
}: InternalControlActionPlansProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ownerUserId, setOwnerUserId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<'basse' | 'moyenne' | 'haute' | 'critique'>('moyenne');
  const [sourceType, setSourceType] = useState('workflow_exception');
  const [sourceId, setSourceId] = useState('');
  const [correlationId, setCorrelationId] = useState('');
  const [rejectionReasonByPlan, setRejectionReasonByPlan] = useState<Record<string, string>>({});

  const canSubmit = useMemo(() => {
    return Boolean(title.trim() && ownerUserId.trim() && dueDate && sourceType.trim() && sourceId.trim());
  }, [title, ownerUserId, dueDate, sourceType, sourceId]);

  const submit = async () => {
    if (!canSubmit) {
      return;
    }
    await onCreate({
      title: title.trim(),
      description: description.trim() || undefined,
      ownerUserId: ownerUserId.trim(),
      dueDate: new Date(dueDate).toISOString(),
      priority,
      status: 'a_traiter',
      sourceType: sourceType.trim(),
      sourceId: sourceId.trim(),
      correlationId: correlationId.trim() || undefined,
    });

    setTitle('');
    setDescription('');
    setOwnerUserId('');
    setDueDate('');
    setPriority('moyenne');
    setSourceType('workflow_exception');
    setSourceId('');
    setCorrelationId('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plans d action</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="plan-title">Titre</Label>
            <Input id="plan-title" value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="plan-description">Description</Label>
            <Textarea
              id="plan-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="plan-owner">Responsable</Label>
            <Input id="plan-owner" value={ownerUserId} onChange={(event) => setOwnerUserId(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="plan-due-date">Échéance</Label>
            <Input id="plan-due-date" type="datetime-local" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="plan-priority">Priorité</Label>
            <select
              id="plan-priority"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={priority}
              onChange={(event) =>
                setPriority(event.target.value as 'basse' | 'moyenne' | 'haute' | 'critique')
              }
            >
              <option value="basse">Basse</option>
              <option value="moyenne">Moyenne</option>
              <option value="haute">Haute</option>
              <option value="critique">Critique</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="plan-source-type">Source type</Label>
            <Input id="plan-source-type" value={sourceType} onChange={(event) => setSourceType(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="plan-source-id">Source ID</Label>
            <Input id="plan-source-id" value={sourceId} onChange={(event) => setSourceId(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="plan-correlation-id">Correlation ID</Label>
            <Input
              id="plan-correlation-id"
              value={correlationId}
              onChange={(event) => setCorrelationId(event.target.value)}
            />
          </div>
        </div>

        <Button disabled={!canSubmit || isMutating} onClick={() => void submit()}>
          Créer le plan d action
        </Button>

        {isLoading ? <p className="text-sm text-muted-foreground">Chargement des plans...</p> : null}

        {!isLoading && actionPlans.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun plan d action pour cet exercice.</p>
        ) : null}

        {!isLoading && actionPlans.length > 0 ? (
          <div className="space-y-3">
            {actionPlans.map((plan) => (
              <div key={plan.id} className="rounded-md border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{plan.title}</p>
                    <p className="text-sm text-muted-foreground">{plan.description ?? 'Aucune description'}</p>
                    <p className="text-xs text-muted-foreground">
                      Responsable: {plan.ownerUserId} · Échéance: {new Date(plan.dueDate).toLocaleString('fr-FR')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Source: {plan.sourceType}/{plan.sourceId}
                    </p>
                  </div>
                  <Badge variant={statusVariant[plan.status]}>{statusLabel[plan.status]}</Badge>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => onSelectPlan(plan.id)}>
                    Historique
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void onStatusUpdate(plan.id, 'en_cours')}>
                    Démarrer
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void onStatusUpdate(plan.id, 'resolu')}>
                    Marquer résolu
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!rejectionReasonByPlan[plan.id]?.trim()}
                    onClick={() =>
                      void onStatusUpdate(plan.id, 'rejete', {
                        rejectionReason: rejectionReasonByPlan[plan.id]?.trim(),
                        reason: rejectionReasonByPlan[plan.id]?.trim(),
                      })
                    }
                  >
                    Rejeter
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void onStatusUpdate(plan.id, 'cloture')}>
                    Clôturer
                  </Button>
                </div>
                <div className="mt-2 space-y-2">
                  <Label htmlFor={`plan-reject-reason-${plan.id}`}>Motif de rejet (obligatoire pour rejeter)</Label>
                  <Textarea
                    id={`plan-reject-reason-${plan.id}`}
                    value={rejectionReasonByPlan[plan.id] ?? ''}
                    onChange={(event) =>
                      setRejectionReasonByPlan((previous) => ({
                        ...previous,
                        [plan.id]: event.target.value,
                      }))
                    }
                    rows={2}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {selectedPlanId ? (
          <Card>
            <CardHeader>
              <CardTitle>Historique du plan sélectionné</CardTitle>
            </CardHeader>
            <CardContent>
              {isEventsLoading ? (
                <p className="text-sm text-muted-foreground">Chargement de l historique...</p>
              ) : events.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun événement historisé.</p>
              ) : (
                <div className="space-y-2">
                  {events.map((event) => (
                    <div key={event.id} className="rounded-md border p-2">
                      <p className="text-sm font-medium">{event.eventType}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(event.createdAt).toLocaleString('fr-FR')} · {event.changedBy}
                      </p>
                      {event.reason ? <p className="text-sm text-muted-foreground">{event.reason}</p> : null}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}
      </CardContent>
    </Card>
  );
};
