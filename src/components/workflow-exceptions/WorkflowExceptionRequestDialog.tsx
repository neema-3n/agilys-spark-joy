import { useMemo } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { CashRiskBlockedInfo } from '@/lib/cash-risk-ui';
import { useExercice } from '@/contexts/ExerciceContext';
import { useWorkflowExceptions } from '@/hooks/useWorkflowExceptions';
import type { WorkflowExceptionUrgence } from '@/types/workflow-exception.types';

const schema = z.object({
  motif: z.string().trim().min(5, 'Motif trop court').max(120),
  justification: z.string().trim().min(10, 'Justification obligatoire').max(2000),
  urgence: z.enum(['faible', 'normale', 'haute', 'critique']),
  expiresAt: z.string().min(1, 'Date limite obligatoire'),
});

type FormData = z.infer<typeof schema>;

interface WorkflowExceptionRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blockedInfo: CashRiskBlockedInfo | null;
}

const addHoursIso = (hours: number): string => {
  const date = new Date(Date.now() + hours * 60 * 60 * 1000);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hour}:${minute}`;
};

export const WorkflowExceptionRequestDialog = ({
  open,
  onOpenChange,
  blockedInfo,
}: WorkflowExceptionRequestDialogProps) => {
  const { currentExercice } = useExercice();
  const { createWorkflowException } = useWorkflowExceptions();

  const defaultValues = useMemo<FormData>(
    () => ({
      motif: '',
      justification: '',
      urgence: 'normale',
      expiresAt: addHoursIso(24),
    }),
    []
  );

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const onSubmit = form.handleSubmit(async (values) => {
    if (!blockedInfo?.decision || !currentExercice?.id) {
      return;
    }

    const decision = blockedInfo.decision;
    const snapshot = decision.snapshot;

    await createWorkflowException({
      exerciceId: currentExercice.id,
      transition: snapshot.transition,
      sourceType: snapshot.sourceType,
      sourceId: snapshot.sourceId,
      entityId: snapshot.entityId,
      amount: snapshot.projectedAmount,
      motif: values.motif,
      justification: values.justification,
      urgence: values.urgence as WorkflowExceptionUrgence,
      expiresAt: new Date(values.expiresAt).toISOString(),
      correlationId: snapshot.correlationId,
    });

    form.reset(defaultValues);
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Demander une exception gouvernée</DialogTitle>
          <DialogDescription>
            La transition reste bloquée tant que le quorum n&apos;est pas atteint et l&apos;exception validée côté backend.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="motif">Motif</Label>
            <Input id="motif" {...form.register('motif')} />
            {form.formState.errors.motif ? (
              <p className="text-xs text-destructive">{form.formState.errors.motif.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="justification">Justification</Label>
            <Textarea id="justification" rows={4} {...form.register('justification')} />
            {form.formState.errors.justification ? (
              <p className="text-xs text-destructive">{form.formState.errors.justification.message}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="urgence">Urgence</Label>
              <select id="urgence" className="w-full rounded-md border bg-background px-3 py-2 text-sm" {...form.register('urgence')}>
                <option value="faible">Faible</option>
                <option value="normale">Normale</option>
                <option value="haute">Haute</option>
                <option value="critique">Critique</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiresAt">Expire le</Label>
              <Input id="expiresAt" type="datetime-local" {...form.register('expiresAt')} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting || !blockedInfo?.decision}>
              Soumettre la demande
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
