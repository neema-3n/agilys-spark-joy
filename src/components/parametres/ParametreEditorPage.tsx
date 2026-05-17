import { ReactNode, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useFocusedEditorGuard } from '@/components/editors/FocusedEditorGuard';
import { useParametresEditorFocus } from './ParametresEditorFocusContext';

interface ParametreEditorPageProps {
  title: string;
  description: string;
  backLabel: string;
  onBack: () => void;
  dirty: boolean;
  entityLabel: string;
  children: ReactNode;
}

export function ParametreEditorPage({
  title,
  description,
  backLabel,
  onBack,
  dirty,
  entityLabel,
  children,
}: ParametreEditorPageProps) {
  const parametresEditorFocus = useParametresEditorFocus();
  const { guard, handleAttemptExit } = useFocusedEditorGuard({
    active: true,
    dirty,
    onExit: onBack,
    entityLabel,
    overlayAriaLabel: `Quitter ${entityLabel}`,
  });

  useEffect(() => {
    if (!parametresEditorFocus) return;

    parametresEditorFocus.setFocusState({
      active: true,
      onAttemptExit: handleAttemptExit,
    });

    return () => {
      parametresEditorFocus.setFocusState(null);
    };
  }, [handleAttemptExit, parametresEditorFocus]);

  return (
    <>
      {guard}
      <div className="space-y-6">
        <PageHeader
          title={title}
          description={description}
          sticky={false}
          actions={
            <Button variant="outline" onClick={handleAttemptExit}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {backLabel}
            </Button>
          }
        />

        <Card>
          <CardContent className="pt-6">{children}</CardContent>
        </Card>
      </div>
    </>
  );
}
