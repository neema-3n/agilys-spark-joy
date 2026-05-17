import { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useFocusedEditorGuard } from '@/components/editors/FocusedEditorGuard';

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
  const { guard } = useFocusedEditorGuard({
    active: true,
    dirty,
    onExit: onBack,
    entityLabel,
    overlayAriaLabel: `Quitter ${entityLabel}`,
  });

  return (
    <>
      {guard}
      <div className="space-y-6">
        <PageHeader
          title={title}
          description={description}
          sticky={false}
          actions={
            <Button variant="outline" onClick={onBack}>
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
