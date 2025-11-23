import { useState } from 'react';
import { Plus, Calculator, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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

  const { regles, isLoading, deleteRegle, updateRegle } = useReglesComptables(activeTab);

  const handleEdit = (regle: RegleComptable) => {
    setEditingRegle(regle);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette règle ?')) {
      await deleteRegle(id);
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingRegle(undefined);
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
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
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
                            
                            {regle.description && (
                              <p className="text-sm text-muted-foreground mb-3">
                                {regle.description}
                              </p>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="font-medium">Période:</span>{' '}
                                {regle.permanente ? (
                                  <span className="text-muted-foreground">Permanente</span>
                                ) : (
                                  <span className="text-muted-foreground">
                                    {regle.dateDebut} → {regle.dateFin}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1">
                                <span className="font-medium">Conditions:</span>{' '}
                                {regle.conditions.length === 0 ? (
                                  <span className="text-muted-foreground">Aucune</span>
                                ) : (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
                                        {regle.conditions.length} condition(s)
                                        <Info className="h-3 w-3" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-md">
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
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>

                              <div>
                                <span className="font-medium">Comptes:</span>{' '}
                                <span className="text-muted-foreground">
                                  {regle.compteDebit?.numero} → {regle.compteCredit?.numero}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2 ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(regle)}
                            >
                              Modifier
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(regle.id)}
                            >
                              Supprimer
                            </Button>
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
      />
    </Card>
  );
};
