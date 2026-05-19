import { Button } from '@/components/ui/button';

type FooterMode = 'create' | 'edit' | 'readonly';

interface SinglePageFormFooterProps {
  mode?: FooterMode;
  onCancel: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  className?: string;
}

export function SinglePageFormFooter({
  mode = 'create',
  onCancel,
  isSubmitting = false,
  submitLabel,
  cancelLabel,
  className,
}: SinglePageFormFooterProps) {
  const resolvedCancelLabel = cancelLabel || (mode === 'readonly' ? 'Fermer' : 'Annuler');
  const resolvedSubmitLabel = submitLabel || (mode === 'edit' ? 'Enregistrer' : 'Créer');

  return (
    <div className={['flex justify-end gap-3 border-t pt-6', className].filter(Boolean).join(' ')}>
      <Button type="button" variant="outline" onClick={onCancel}>
        {resolvedCancelLabel}
      </Button>
      {mode !== 'readonly' && (
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Enregistrement...' : resolvedSubmitLabel}
        </Button>
      )}
    </div>
  );
}
