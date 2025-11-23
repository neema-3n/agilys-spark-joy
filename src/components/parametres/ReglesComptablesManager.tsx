import { useState } from 'react';
import { Plus, Calculator, Info, Trash2, Copy } from 'lucide-react';
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
import { RegleComptableDialog } from './RegleComptableDialog';
import { TYPE_OPERATION_LABELS, OPERATEUR_LABELS } from '@/lib/regles-comptables-fields';
import type { TypeOperation, RegleComptable } from '@/types/regle-comptable.types';

const TYPE_OPERATIONS: TypeOperation[] = [
  'reservation',
  'engagement',
  'bon_commande',
  'facture',
  'depense',
  'paiement'
];

export const ReglesComptablesManager = () => {
  const [activeTab, setActiveTab] = useState<TypeOperation>('reservation');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRegle, setEditingRegle] = useState<RegleComptable | undefined>();
  const [initialValuesForDuplicate, setInitialValuesForDuplicate] = useState<Partial<RegleComptable> | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [regleToDelete, setRegleToDelete] = useState<RegleComptable | null>(null);

  const { regles, isLoading, deleteRegle, updateRegle } = useReglesComptables(activeTab);

  const handleEdit = (regle: RegleComptable) => {
    setEditingRegle(regle);
    setDialogOpen(true);
  };

  const handleDuplicate = (regle: RegleComptable) => {
    setEditingRegle(undefined);
    setInitialValuesForDuplicate({
      nom: `${regle.nom} (Copie)`,
      code: `${regle.code}_COPY`,
      description: regle.description,
      permanente: regle.permanente,
      dateDebut: regle.dateDebut,
      dateFin: regle.dateFin,
      typeOperation: regle.typeOperation,
      conditions: regle.conditions,
      compteDebitId: regle.compteDebitId,
      compteCreditId: regle.compteCreditId,
      actif: regle.actif,
      ordre: regle.ordre,
    });
    setDialogOpen(true);
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

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingRegle(undefined);
    setInitialValuesForDuplicate(undefined);
  };

  const handleToggleActif = async (regle: RegleComptable) => {
    await updateRegle({
      id: regle.id,
      input: { actif: !regle.actif }
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Règles d'Écriture Comptable
            </CardTitle>
            <CardDescription>
              Configurez les règles automatiques de génération des écritures comptables
            </CardDescription>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle règle
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TypeOperation)}>
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
            {TYPE_OPERATIONS.map((type) => (
              <TabsTrigger key={type} value={type}>
                {TYPE_OPERATION_LABELS[type]}
              </TabsTrigger>
            ))}
          </TabsList>

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

                          {regle.description && (
                            <p className="text-sm text-muted-foreground">
                              {regle.description}
                            </p>
                          )}

                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm items-start">
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
                              <span className="font-medium">Comptes:</span>
                              <HoverCard>
                                <HoverCardTrigger asChild>
                                  <button className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
                                    {regle.compteDebit?.numero} → {regle.compteCredit?.numero}
                                    <Info className="h-3 w-3" />
                                  </button>
                                </HoverCardTrigger>
                                <HoverCardContent side="top" className="max-w-md">
                                  <div className="space-y-1">
                                    <p className="text-xs">
                                      <span className="font-semibold">Débit:</span> {regle.compteDebit?.numero} - {regle.compteDebit?.libelle}
                                    </p>
                                    <p className="text-xs">
                                      <span className="font-semibold">Crédit:</span> {regle.compteCredit?.numero} - {regle.compteCredit?.libelle}
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

      <RegleComptableDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        regle={editingRegle}
        defaultTypeOperation={activeTab}
        initialValues={initialValuesForDuplicate}
      />

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
