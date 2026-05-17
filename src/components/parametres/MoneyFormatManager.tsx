import { useMemo, useState } from 'react';
import { useMatch, useNavigate, useParams } from 'react-router-dom';
import { Calculator, Edit } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useClient } from '@/contexts/ClientContext';
import { clientsService } from '@/services/api/clients.service';
import { ParametreEditorPage } from './ParametreEditorPage';
import { MoneyFormatForm, MoneyFormatFormValues } from './MoneyFormatForm';
import { formatMontantWithSettings } from '@/lib/utils';

const thousandsSeparatorLabel: Record<string, string> = {
  space: 'Espace',
  dot: 'Point',
  comma: 'Virgule',
  apostrophe: 'Apostrophe',
  none: 'Aucun',
};

const decimalSeparatorLabel: Record<string, string> = {
  comma: 'Virgule',
  dot: 'Point',
};

export function MoneyFormatManager() {
  const { currentClient, setCurrentClient } = useClient();
  const navigate = useNavigate();
  const { itemId } = useParams<{ itemId?: string }>();
  const isEditRoute = !!useMatch('/app/parametres/format-monetaire/:itemId/edit');
  const [isDirty, setIsDirty] = useState(false);

  const moneyFormat = useMemo(
    () => ({
      locale: currentClient?.moneyFormat?.locale || 'fr-FR',
      thousandsSeparator: currentClient?.moneyFormat?.thousandsSeparator || 'space',
      decimalSeparator: currentClient?.moneyFormat?.decimalSeparator || 'comma',
      minimumFractionDigits: currentClient?.moneyFormat?.minimumFractionDigits ?? 0,
      maximumFractionDigits: currentClient?.moneyFormat?.maximumFractionDigits ?? 0,
    }),
    [currentClient],
  );

  const handleBack = () => {
    navigate('/app/parametres/format-monetaire');
  };

  const handleEdit = () => {
    if (!currentClient) return;
    navigate(`/app/parametres/format-monetaire/${currentClient.id}/edit`);
  };

  const handleSubmit = async (values: MoneyFormatFormValues) => {
    if (!currentClient) return;

    const updatedClient = await clientsService.update(currentClient.id, {
      moneyFormat: values,
    });

    setCurrentClient(updatedClient);
    navigate('/app/parametres/format-monetaire');
  };

  if (!currentClient) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            Veuillez sélectionner un client pour configurer le format monétaire.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isEditRoute) {
    const isWrongItem = itemId && itemId !== currentClient.id;

    return (
      <ParametreEditorPage
        title="Format monétaire"
        description="Définissez la présentation des montants pour ce client."
        backLabel="Retour au format monétaire"
        onBack={handleBack}
        dirty={isDirty}
        entityLabel="ce formulaire de format monétaire"
      >
        {isWrongItem ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            La configuration demandée ne correspond pas au client courant.
          </div>
        ) : (
          <MoneyFormatForm
            value={moneyFormat}
            onSubmit={handleSubmit}
            onCancel={handleBack}
            onDirtyChange={setIsDirty}
          />
        )}
      </ParametreEditorPage>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Format monétaire
            </CardTitle>
            <CardDescription>
              Définissez comment les montants s&apos;affichent pour le client courant.
            </CardDescription>
          </div>
          <Button onClick={handleEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Modifier
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border p-4">
            <p className="text-sm text-muted-foreground">Locale</p>
            <p className="mt-1 font-medium">{moneyFormat.locale}</p>
          </div>
          <div className="rounded-xl border p-4">
            <p className="text-sm text-muted-foreground">Séparateur de milliers</p>
            <p className="mt-1 font-medium">
              {thousandsSeparatorLabel[moneyFormat.thousandsSeparator]}
            </p>
          </div>
          <div className="rounded-xl border p-4">
            <p className="text-sm text-muted-foreground">Séparateur décimal</p>
            <p className="mt-1 font-medium">
              {decimalSeparatorLabel[moneyFormat.decimalSeparator]}
            </p>
          </div>
          <div className="rounded-xl border p-4">
            <p className="text-sm text-muted-foreground">Décimales</p>
            <p className="mt-1 font-medium">
              {moneyFormat.minimumFractionDigits} à {moneyFormat.maximumFractionDigits}
            </p>
          </div>
        </div>

        <div className="rounded-xl border bg-muted/30 p-5">
          <p className="text-sm font-medium text-foreground">Aperçu appliqué</p>
          <p className="mt-2 text-3xl font-semibold">
            {formatMontantWithSettings(123456789.45, moneyFormat)}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Ce format s&apos;applique aux écrans, exports CSV, impressions et PDF.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
