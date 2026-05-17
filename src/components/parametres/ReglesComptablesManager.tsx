import { useEffect, useMemo, useState } from 'react';
import { Plus, Calculator, Info, Trash2, Copy, Pencil } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useReglesComptables } from '@/hooks/useReglesComptables';
import { useLocation, useMatch, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ParametreEditorPage } from './ParametreEditorPage';
import { RegleComptableForm } from './RegleComptableForm';
import {
  NATURE_VENTILATION_LABELS,
  OPERATEUR_LABELS,
  POINT_COMPTABLE_LABELS,
  ROLE_LIGNE_LABELS,
  SOURCE_COMPTE_LABELS,
  SOURCE_MONTANT_LABELS,
  TYPE_OPERATION_LABELS,
} from '@/lib/regles-comptables-fields';
import type { TypeOperation, RegleComptable } from '@/types/regle-comptable.types';

const TYPE_OPERATIONS: TypeOperation[] = ['facture', 'depense', 'paiement'];

export const ReglesComptablesManager = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { itemId } = useParams<{ itemId?: string }>();
  const [searchParams] = useSearchParams();
  const requestedType = searchParams.get('type') as TypeOperation | null;
  const initialType = requestedType && TYPE_OPERATIONS.includes(requestedType) ? requestedType : 'facture';
  const [activeTab, setActiveTab] = useState<TypeOperation>(initialType);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [regleToDelete, setRegleToDelete] = useState<RegleComptable | null>(null);
  const [isRuleDirty, setIsRuleDirty] = useState(false);
  const isCreateRoute = !!useMatch('/app/parametres/regles-comptables/create');
  const isEditRoute = !!useMatch('/app/parametres/regles-comptables/:itemId/edit');
  const isEditorMode = isCreateRoute || isEditRoute;

  const { regles, isLoading, deleteRegle, updateRegle } = useReglesComptables(activeTab);
  const duplicateInitialValues = location.state && typeof location.state === 'object' && 'initialValues' in location.state
    ? (location.state.initialValues as Partial<RegleComptable> | undefined)
    : undefined;
  const editingRegle = useMemo(
    () => regles.find((regle) => regle.id === itemId),
    [regles, itemId],
  );

  useEffect(() => {
    const nextType = requestedType && TYPE_OPERATIONS.includes(requestedType) ? requestedType : 'facture';
    setActiveTab(nextType);
  }, [requestedType]);

  const handleEdit = (regle: RegleComptable) => {
    navigate(`/app/parametres/regles-comptables/${regle.id}/edit?type=${regle.typeOperation}`);
  };

  const handleDuplicate = (regle: RegleComptable) => {
    navigate(`/app/parametres/regles-comptables/create?type=${regle.typeOperation}`, {
      state: {
        initialValues: {
          nom: `${regle.nom} (Copie)`,
          code: `${regle.code}_COPY`,
          description: regle.description,
          permanente: regle.permanente,
          dateDebut: regle.dateDebut,
          dateFin: regle.dateFin,
          typeOperation: regle.typeOperation,
          pointComptable: regle.pointComptable,
          roleLigne: regle.roleLigne,
          sourceMontant: regle.sourceMontant,
          debitSource: regle.debitSource,
          creditSource: regle.creditSource,
          sensVentilation: regle.sensVentilation,
          natureVentilation: regle.natureVentilation,
          conditions: regle.conditions,
          compteDebitId: regle.compteDebitId,
          compteCreditId: regle.compteCreditId,
          actif: regle.actif,
          ordre: regle.ordre,
        },
      },
    });
  };

  const handleDeleteClick = (regle: RegleComptable) => {
    setRegleToDelete(regle);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (regleToDelete) {
      await deleteRegle(regleToDelete.id);
      setDeleteDialogOpen(false);
      setRegleToDelete(null);
    }
  };

  const handleToggleActif = async (regle: RegleComptable) => {
    await updateRegle({
      id: regle.id,
      input: { actif: !regle.actif }
    });
  };

  if (isEditorMode) {
    if (isLoading) {
      return <div className="py-8 text-center text-muted-foreground">Chargement...</div>;
    }

    if (isEditRoute && !editingRegle) {
      return (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          Cette regle est introuvable.
        </div>
      );
    }

    return (
      <ParametreEditorPage
        title={editingRegle ? 'Modifier une regle comptable' : 'Nouvelle regle comptable'}
        description="Configurez les regles automatiques de generation des ecritures comptables."
        backLabel="Retour aux regles comptables"
        onBack={() => navigate(`/app/parametres/regles-comptables?type=${activeTab}`)}
        dirty={isRuleDirty}
        entityLabel="cette regle comptable"
      >
        <RegleComptableForm
          regle={editingRegle}
          defaultTypeOperation={activeTab}
          initialValues={duplicateInitialValues}
          onCancel={() => navigate(`/app/parametres/regles-comptables?type=${activeTab}`)}
          onSuccess={() => navigate(`/app/parametres/regles-comptables?type=${activeTab}`)}
          onDirtyChange={setIsRuleDirty}
        />
      </ParametreEditorPage>
    );
  }

  return (
    <Card>
      <CardHeader className="space-y-4 sm:space-y-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Règles d'Écriture Comptable
            </CardTitle>
            <CardDescription>
              Configurez les règles automatiques de génération des écritures comptables
            </CardDescription>
          </div>
          <Button
            onClick={() => navigate(`/app/parametres/regles-comptables/create?type=${activeTab}`)}
            className="w-full justify-center sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle règle
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => navigate(`/app/parametres/regles-comptables?type=${v}`)}>
          <div className="-mx-4 pb-2 sm:mx-0 sm:pb-0">
            <TabsList className="flex min-w-max gap-2 overflow-x-auto px-4 sm:min-w-0 sm:w-full sm:px-0">
              {TYPE_OPERATIONS.map((type) => (
                <TabsTrigger key={type} value={type} className="whitespace-nowrap">
                  {TYPE_OPERATION_LABELS[type]}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {TYPE_OPERATIONS.map((type) => (
            <TabsContent key={type} value={type} className="mt-6">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Chargement...
                </div>
              ) : regles.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calculator className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Aucune règle définie pour {TYPE_OPERATION_LABELS[type]}</p>
                  <p className="text-sm mt-2">
                    Cliquez sur "Nouvelle règle" pour en créer une
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {regles.map((regle) => (
                    <Card key={regle.id}>
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 min-w-0">
                              <h4 className="font-semibold">{regle.nom}</h4>
                              <Badge variant="outline">{regle.code}</Badge>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={regle.actif}
                                  onCheckedChange={() => handleToggleActif(regle)}
                                />
                                <span className="text-sm text-muted-foreground">
                                  {regle.actif ? 'Actif' : 'Inactif'}
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2 justify-start lg:justify-end shrink-0">
                              <div className="flex items-center gap-2 sm:hidden">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleEdit(regle)}
                                  aria-label="Modifier la règle"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleDuplicate(regle)}
                                  aria-label="Dupliquer la règle"
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleDeleteClick(regle)}
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  aria-label="Supprimer la règle"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>

                              <div className="hidden sm:flex flex-wrap gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEdit(regle)}
                                >
                                  Modifier
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDuplicate(regle)}
                                >
                                  <Copy className="h-4 w-4 mr-2" />
                                  Dupliquer
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteClick(regle)}
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Supprimer
                                </Button>
                              </div>
                            </div>
                          </div>

                          {regle.description && (
                            <p className="text-sm text-muted-foreground">
                              {regle.description}
                            </p>
                          )}

                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm items-start">
                            <div className="flex flex-wrap items-center gap-1">
                              <span className="font-medium">Moteur:</span>
                              <span className="text-muted-foreground">
                                {POINT_COMPTABLE_LABELS[regle.pointComptable]} / {ROLE_LIGNE_LABELS[regle.roleLigne]}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-1">
                              <span className="font-medium">Période:</span>
                              <span className="text-muted-foreground">
                                {regle.permanente ? 'Permanente' : `${regle.dateDebut} → ${regle.dateFin}`}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-1">
                              <span className="font-medium">Conditions:</span>
                              {regle.conditions.length === 0 ? (
                                <span className="text-muted-foreground">Aucune</span>
                              ) : (
                                <HoverCard>
                                  <HoverCardTrigger asChild>
                                    <button className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
                                      {regle.conditions.length} condition(s)
                                      <Info className="h-3 w-3" />
                                    </button>
                                  </HoverCardTrigger>
                                  <HoverCardContent side="top" className="max-w-md">
                                    <div className="space-y-2">
                                      <p className="font-semibold text-xs">Conditions:</p>
                                      {regle.conditions.map((condition, idx) => (
                                        <div key={idx} className="text-xs">
                                          <Badge variant="outline" className="font-mono text-xs">
                                            {condition.champ}
                                          </Badge>
                                          {' '}
                                          <span className="text-muted-foreground">
                                            {OPERATEUR_LABELS[condition.operateur]}
                                          </span>
                                          {' '}
                                          <span className="font-medium">
                                            {String(condition.valeur)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </HoverCardContent>
                                </HoverCard>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-1">
                              <span className="font-medium">Montant:</span>
                              <span className="text-muted-foreground">
                                {SOURCE_MONTANT_LABELS[regle.sourceMontant]}
                                {regle.roleLigne === 'ventilation' && regle.natureVentilation
                                  ? ` / ${NATURE_VENTILATION_LABELS[regle.natureVentilation]}`
                                  : ''}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-1">
                              <span className="font-medium">Comptes:</span>
                              <HoverCard>
                                <HoverCardTrigger asChild>
                                  <button className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
                                    {regle.debitSource === 'compte_fixe'
                                      ? regle.compteDebit?.numero || '...'
                                      : SOURCE_COMPTE_LABELS[regle.debitSource]}
                                    {' → '}
                                    {regle.creditSource === 'compte_fixe'
                                      ? regle.compteCredit?.numero || '...'
                                      : SOURCE_COMPTE_LABELS[regle.creditSource]}
                                    <Info className="h-3 w-3" />
                                  </button>
                                </HoverCardTrigger>
                                <HoverCardContent side="top" className="max-w-md">
                                  <div className="space-y-1">
                                    <p className="text-xs">
                                      <span className="font-semibold">Débit:</span>{' '}
                                      {regle.debitSource === 'compte_fixe'
                                        ? `${regle.compteDebit?.numero || '-'} - ${regle.compteDebit?.libelle || 'Compte fixe à paramétrer'}`
                                        : SOURCE_COMPTE_LABELS[regle.debitSource]}
                                    </p>
                                    <p className="text-xs">
                                      <span className="font-semibold">Crédit:</span>{' '}
                                      {regle.creditSource === 'compte_fixe'
                                        ? `${regle.compteCredit?.numero || '-'} - ${regle.compteCredit?.libelle || 'Compte fixe à paramétrer'}`
                                        : SOURCE_COMPTE_LABELS[regle.creditSource]}
                                    </p>
                                  </div>
                                </HoverCardContent>
                              </HoverCard>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer la règle comptable <span className="font-semibold">{regleToDelete?.nom}</span> ?
              <br />
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
