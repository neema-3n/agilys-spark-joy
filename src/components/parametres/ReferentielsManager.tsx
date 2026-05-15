import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Database, Check, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { useClient } from '@/contexts/ClientContext';
import { useReferentiels } from '@/hooks/useReferentiels';
import { useNaturesCompte } from '@/hooks/useNaturesCompte';
import { useTaxesFiscales } from '@/hooks/useTaxesFiscales';
import { useModelesFiscaux } from '@/hooks/useModelesFiscaux';
import { useComptes } from '@/hooks/useComptes';
import { referentielsService } from '@/services/api/referentiels.service';
import { naturesCompteService } from '@/services/api/natures-compte.service';
import { taxesFiscalesService } from '@/services/api/taxes-fiscales.service';
import { modelesFiscauxService } from '@/services/api/modeles-fiscaux.service';
import { ReferentielDialog } from './ReferentielDialog';
import { NatureCompteDialog } from './NatureCompteDialog';
import { TaxeFiscaleDialog } from './TaxeFiscaleDialog';
import { ModeleFiscalDialog } from './ModeleFiscalDialog';
import type { ParametreReferentiel, ReferentielCategorie } from '@/types/referentiel.types';
import type { ModeleFiscal, TaxeFiscale } from '@/types/fiscalite.types';
import type { NatureCompte } from '@/types/nature-compte.types';
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

type ManagerTab = ReferentielCategorie | 'nature_compte' | 'taxe_fiscale' | 'modele_fiscal';

type CategorieConfig = {
  value: ManagerTab;
  label: string;
  description: string;
};

const categories: CategorieConfig[] = [
  {
    value: 'compte_type',
    label: 'Types de comptes',
    description: 'Types de comptes comptables (actif, passif, charge, produit...)',
  },
  {
    value: 'compte_categorie',
    label: 'Catégories de comptes',
    description: 'Catégories de comptes (immobilisation, stock, créance...)',
  },
  {
    value: 'nature_compte',
    label: 'Natures de compte',
    description: 'Natures métier utilisées pour la charge principale en mode standard',
  },
  {
    value: 'taxe_fiscale',
    label: 'Référentiel fiscal',
    description: 'Taxes, retenues, redevances et frais réutilisables dans les pièces',
  },
  {
    value: 'modele_fiscal',
    label: 'Modèles fiscaux',
    description: 'Combinaisons prêtes à l’emploi pour préremplir le bloc 2',
  },
  {
    value: 'structure_type',
    label: 'Types de structures',
    description: 'Types de structures organisationnelles (entité, service, direction...)',
  },
  {
    value: 'source_financement',
    label: 'Sources de financement',
    description: 'Sources de financement des enveloppes budgétaires',
  },
  {
    value: 'statut_general',
    label: 'Statuts généraux',
    description: 'Statuts généraux (actif, inactif, clôturé...)',
  },
  {
    value: 'type_projet',
    label: 'Types de projet',
    description: 'Types de projets (infrastructure, formation, équipement...)',
  },
  {
    value: 'statut_projet',
    label: 'Statuts de projet',
    description: 'Statuts des projets (planifié, en cours, terminé...)',
  },
  {
    value: 'priorite_projet',
    label: 'Priorités de projet',
    description: 'Priorités des projets (haute, moyenne, basse)',
  },
];

export const ReferentielsManager = () => {
  const { currentClient } = useClient();
  const clientId = currentClient?.id || '';
  const queryClient = useQueryClient();
  const { comptes } = useComptes();
  const comptesCharge = useMemo(
    () => comptes.filter((compte) => compte.type === 'charge' && compte.statut === 'actif'),
    [comptes]
  );

  const [activeCategorie, setActiveCategorie] = useState<ManagerTab>('compte_type');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedReferentiel, setSelectedReferentiel] = useState<ParametreReferentiel | undefined>();
  const [selectedNatureCompte, setSelectedNatureCompte] = useState<NatureCompte | undefined>();
  const [selectedTaxeFiscale, setSelectedTaxeFiscale] = useState<TaxeFiscale | undefined>();
  const [selectedModeleFiscal, setSelectedModeleFiscal] = useState<ModeleFiscal | undefined>();
  const [referentielToDelete, setReferentielToDelete] = useState<ParametreReferentiel | undefined>();
  const [natureCompteToDelete, setNatureCompteToDelete] = useState<NatureCompte | undefined>();
  const [taxeFiscaleToDelete, setTaxeFiscaleToDelete] = useState<TaxeFiscale | undefined>();
  const [modeleFiscalToDelete, setModeleFiscalToDelete] = useState<ModeleFiscal | undefined>();

  const referentielCategorie = activeCategorie === 'nature_compte' || activeCategorie === 'taxe_fiscale' || activeCategorie === 'modele_fiscal'
    ? null
    : activeCategorie;
  const { data: referentiels = [], isLoading } = useReferentiels(referentielCategorie || 'compte_type', false);
  const { naturesCompte, isLoading: isLoadingNatures } = useNaturesCompte({
    actifOnly: false,
    includeFallback: false,
  });
  const { taxesFiscales, isLoading: isLoadingTaxes } = useTaxesFiscales(false);
  const { modelesFiscaux, isLoading: isLoadingModeles } = useModelesFiscaux(false);

  const activeCategorieConfig = categories.find((category) => category.value === activeCategorie);

  const handleCreate = () => {
    setSelectedReferentiel(undefined);
    setSelectedNatureCompte(undefined);
    setSelectedTaxeFiscale(undefined);
    setSelectedModeleFiscal(undefined);
    setDialogOpen(true);
  };

  const handleEditReferentiel = (referentiel: ParametreReferentiel) => {
    setSelectedReferentiel(referentiel);
    setSelectedNatureCompte(undefined);
    setSelectedTaxeFiscale(undefined);
    setSelectedModeleFiscal(undefined);
    setDialogOpen(true);
  };

  const handleEditNatureCompte = (natureCompte: NatureCompte) => {
    setSelectedNatureCompte(natureCompte);
    setSelectedReferentiel(undefined);
    setSelectedTaxeFiscale(undefined);
    setSelectedModeleFiscal(undefined);
    setDialogOpen(true);
  };

  const handleEditTaxeFiscale = (taxeFiscale: TaxeFiscale) => {
    setSelectedTaxeFiscale(taxeFiscale);
    setSelectedReferentiel(undefined);
    setSelectedNatureCompte(undefined);
    setSelectedModeleFiscal(undefined);
    setDialogOpen(true);
  };

  const handleEditModeleFiscal = (modeleFiscal: ModeleFiscal) => {
    setSelectedModeleFiscal(modeleFiscal);
    setSelectedReferentiel(undefined);
    setSelectedNatureCompte(undefined);
    setSelectedTaxeFiscale(undefined);
    setDialogOpen(true);
  };

  const handleDeleteReferentielClick = (referentiel: ParametreReferentiel) => {
    setReferentielToDelete(referentiel);
    setNatureCompteToDelete(undefined);
    setTaxeFiscaleToDelete(undefined);
    setModeleFiscalToDelete(undefined);
    setDeleteDialogOpen(true);
  };

  const handleDeleteNatureCompteClick = (natureCompte: NatureCompte) => {
    setNatureCompteToDelete(natureCompte);
    setReferentielToDelete(undefined);
    setTaxeFiscaleToDelete(undefined);
    setModeleFiscalToDelete(undefined);
    setDeleteDialogOpen(true);
  };

  const handleDeleteTaxeFiscaleClick = (taxeFiscale: TaxeFiscale) => {
    setTaxeFiscaleToDelete(taxeFiscale);
    setNatureCompteToDelete(undefined);
    setReferentielToDelete(undefined);
    setModeleFiscalToDelete(undefined);
    setDeleteDialogOpen(true);
  };

  const handleDeleteModeleFiscalClick = (modeleFiscal: ModeleFiscal) => {
    setModeleFiscalToDelete(modeleFiscal);
    setTaxeFiscaleToDelete(undefined);
    setNatureCompteToDelete(undefined);
    setReferentielToDelete(undefined);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async (data: Record<string, unknown>) => {
    try {
      if (activeCategorie === 'nature_compte') {
        if (selectedNatureCompte) {
          await naturesCompteService.update(selectedNatureCompte.id, data);
          toast({ title: 'Nature de compte mise à jour', description: 'La nature de compte a été mise à jour avec succès.' });
        } else {
          await naturesCompteService.create({
            clientId,
            code: String(data.code || ''),
            libelle: String(data.libelle || ''),
            description: data.description ? String(data.description) : undefined,
            compteDefautId: typeof data.compteDefautId === 'string' && data.compteDefautId.length > 0 ? data.compteDefautId : undefined,
            ordre: Number(data.ordre || 0),
            actif: Boolean(data.actif),
          });
          toast({ title: 'Nature de compte créée', description: 'La nature de compte a été créée avec succès.' });
        }
        queryClient.invalidateQueries({ queryKey: ['natures-compte'] });
        setDialogOpen(false);
        return;
      }

      if (activeCategorie === 'taxe_fiscale') {
        const payload = {
          code: String(data.code || ''),
          libelle: String(data.libelle || ''),
          description: data.description ? String(data.description) : undefined,
          nature: data.nature as TaxeFiscale['nature'],
          sensDefaut: data.sensDefaut as TaxeFiscale['sensDefaut'],
          tauxDefaut: typeof data.tauxDefaut === 'number' ? data.tauxDefaut : undefined,
          montantFixeDefaut: typeof data.montantFixeDefaut === 'number' ? data.montantFixeDefaut : undefined,
          compteComptableId: typeof data.compteComptableId === 'string' && data.compteComptableId.length > 0 ? data.compteComptableId : undefined,
          ordre: Number(data.ordre || 0),
          actif: Boolean(data.actif),
          dateDebutValidite: data.dateDebutValidite ? String(data.dateDebutValidite) : undefined,
          dateFinValidite: data.dateFinValidite ? String(data.dateFinValidite) : undefined,
        };

        if (selectedTaxeFiscale) {
          await taxesFiscalesService.update(selectedTaxeFiscale.id, payload);
          toast({ title: 'Taxe fiscale mise à jour', description: 'La taxe fiscale a été mise à jour avec succès.' });
        } else {
          await taxesFiscalesService.create({ clientId, ...payload });
          toast({ title: 'Taxe fiscale créée', description: 'La taxe fiscale a été créée avec succès.' });
        }

        queryClient.invalidateQueries({ queryKey: ['taxes-fiscales'] });
        setDialogOpen(false);
        return;
      }

      if (activeCategorie === 'modele_fiscal') {
        const lignes = Array.isArray(data.lignes)
          ? data.lignes.map((ligne, index) => ({
              taxeFiscaleId: String((ligne as Record<string, unknown>).taxeFiscaleId || ''),
              ordre: index,
              tauxDefautOverride:
                typeof (ligne as Record<string, unknown>).tauxDefautOverride === 'number'
                  ? ((ligne as Record<string, unknown>).tauxDefautOverride as number)
                  : undefined,
              montantDefautOverride:
                typeof (ligne as Record<string, unknown>).montantDefautOverride === 'number'
                  ? ((ligne as Record<string, unknown>).montantDefautOverride as number)
                  : undefined,
            }))
          : [];

        const payload = {
          code: String(data.code || ''),
          libelle: String(data.libelle || ''),
          description: data.description ? String(data.description) : undefined,
          ordre: Number(data.ordre || 0),
          actif: Boolean(data.actif),
          lignes,
        };

        if (selectedModeleFiscal) {
          await modelesFiscauxService.update(selectedModeleFiscal.id, payload);
          toast({ title: 'Modèle fiscal mis à jour', description: 'Le modèle fiscal a été mis à jour avec succès.' });
        } else {
          await modelesFiscauxService.create({ clientId, ...payload });
          toast({ title: 'Modèle fiscal créé', description: 'Le modèle fiscal a été créé avec succès.' });
        }

        queryClient.invalidateQueries({ queryKey: ['modeles-fiscaux'] });
        setDialogOpen(false);
        return;
      }

      if (selectedReferentiel) {
        await referentielsService.update(selectedReferentiel.id, data);
        toast({ title: 'Référentiel mis à jour', description: 'Le référentiel a été mis à jour avec succès.' });
      } else {
        await referentielsService.create({
          clientId,
          categorie: activeCategorie as ReferentielCategorie,
          ...data,
          modifiable: true,
        });
        toast({ title: 'Référentiel créé', description: 'Le référentiel a été créé avec succès.' });
      }

      queryClient.invalidateQueries({ queryKey: ['referentiels'] });
      setDialogOpen(false);
    } catch (error) {
      console.error('Error saving referentiel:', error);
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    try {
      if (activeCategorie === 'nature_compte') {
        if (!natureCompteToDelete) return;
        await naturesCompteService.delete(natureCompteToDelete.id);
        toast({ title: 'Nature de compte supprimée', description: 'La nature de compte a été supprimée avec succès.' });
        queryClient.invalidateQueries({ queryKey: ['natures-compte'] });
      } else if (activeCategorie === 'taxe_fiscale') {
        if (!taxeFiscaleToDelete) return;
        await taxesFiscalesService.delete(taxeFiscaleToDelete.id);
        toast({ title: 'Taxe fiscale supprimée', description: 'La taxe fiscale a été supprimée avec succès.' });
        queryClient.invalidateQueries({ queryKey: ['taxes-fiscales'] });
      } else if (activeCategorie === 'modele_fiscal') {
        if (!modeleFiscalToDelete) return;
        await modelesFiscauxService.delete(modeleFiscalToDelete.id);
        toast({ title: 'Modèle fiscal supprimé', description: 'Le modèle fiscal a été supprimé avec succès.' });
        queryClient.invalidateQueries({ queryKey: ['modeles-fiscaux'] });
      } else {
        if (!referentielToDelete) return;
        await referentielsService.delete(referentielToDelete.id);
        toast({ title: 'Référentiel supprimé', description: 'Le référentiel a été supprimé avec succès.' });
        queryClient.invalidateQueries({ queryKey: ['referentiels'] });
      }

      setDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Impossible de supprimer cet élément',
        variant: 'destructive',
      });
    }
  };

  const deleteLabel = activeCategorie === 'nature_compte'
    ? natureCompteToDelete?.libelle
    : activeCategorie === 'taxe_fiscale'
      ? taxeFiscaleToDelete?.libelle
      : activeCategorie === 'modele_fiscal'
        ? modeleFiscalToDelete?.libelle
        : referentielToDelete?.libelle;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Référentiels
          </CardTitle>
          <CardDescription>Gérez les listes de valeurs utilisées dans l'application</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeCategorie} onValueChange={(value) => setActiveCategorie(value as ManagerTab)}>
            <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 p-1">
              {categories.map((category) => (
                <TabsTrigger key={category.value} value={category.value} className="whitespace-nowrap">
                  {category.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {categories.map((category) => (
              <TabsContent key={category.value} value={category.value} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">{category.label}</h3>
                    <p className="text-sm text-muted-foreground">{category.description}</p>
                  </div>
                  <Button onClick={handleCreate} size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Ajouter
                  </Button>
                </div>

                {category.value === 'nature_compte' ? (
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code</TableHead>
                          <TableHead>Libellé</TableHead>
                          <TableHead>Compte par défaut</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-center">Ordre</TableHead>
                          <TableHead className="text-center">Actif</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoadingNatures ? (
                          <TableRow><TableCell colSpan={7} className="text-center">Chargement...</TableCell></TableRow>
                        ) : naturesCompte.length === 0 ? (
                          <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Aucune nature de compte renseignée</TableCell></TableRow>
                        ) : (
                          naturesCompte.map((natureCompte) => (
                            <TableRow key={natureCompte.id}>
                              <TableCell className="font-mono text-sm">{natureCompte.code}</TableCell>
                              <TableCell className="font-medium">{natureCompte.libelle}</TableCell>
                              <TableCell className="text-sm">
                                {natureCompte.compteDefaut ? `${natureCompte.compteDefaut.numero} - ${natureCompte.compteDefaut.libelle}` : '-'}
                              </TableCell>
                              <TableCell className="max-w-xs truncate text-sm text-muted-foreground">{natureCompte.description || '-'}</TableCell>
                              <TableCell className="text-center">{natureCompte.ordre}</TableCell>
                              <TableCell className="text-center">
                                {natureCompte.actif ? <Check className="mx-auto h-4 w-4 text-green-600" /> : <X className="mx-auto h-4 w-4 text-red-600" />}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button variant="ghost" size="sm" onClick={() => handleEditNatureCompte(natureCompte)}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => handleDeleteNatureCompteClick(natureCompte)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                ) : category.value === 'taxe_fiscale' ? (
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code</TableHead>
                          <TableHead>Libellé</TableHead>
                          <TableHead>Nature</TableHead>
                          <TableHead>Sens</TableHead>
                          <TableHead>Compte</TableHead>
                          <TableHead className="text-center">Actif</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoadingTaxes ? (
                          <TableRow><TableCell colSpan={7} className="text-center">Chargement...</TableCell></TableRow>
                        ) : taxesFiscales.length === 0 ? (
                          <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Aucune taxe fiscale renseignée</TableCell></TableRow>
                        ) : (
                          taxesFiscales.map((taxe) => (
                            <TableRow key={taxe.id}>
                              <TableCell className="font-mono text-sm">{taxe.code}</TableCell>
                              <TableCell className="font-medium">{taxe.libelle}</TableCell>
                              <TableCell>{taxe.nature}</TableCell>
                              <TableCell>{taxe.sensDefaut}</TableCell>
                              <TableCell className="text-sm">
                                {taxe.compteComptable ? `${taxe.compteComptable.numero} - ${taxe.compteComptable.libelle}` : '-'}
                              </TableCell>
                              <TableCell className="text-center">
                                {taxe.actif ? <Check className="mx-auto h-4 w-4 text-green-600" /> : <X className="mx-auto h-4 w-4 text-red-600" />}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button variant="ghost" size="sm" onClick={() => handleEditTaxeFiscale(taxe)}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => handleDeleteTaxeFiscaleClick(taxe)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                ) : category.value === 'modele_fiscal' ? (
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code</TableHead>
                          <TableHead>Libellé</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-center">Lignes</TableHead>
                          <TableHead className="text-center">Actif</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoadingModeles ? (
                          <TableRow><TableCell colSpan={6} className="text-center">Chargement...</TableCell></TableRow>
                        ) : modelesFiscaux.length === 0 ? (
                          <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Aucun modèle fiscal renseigné</TableCell></TableRow>
                        ) : (
                          modelesFiscaux.map((modele) => (
                            <TableRow key={modele.id}>
                              <TableCell className="font-mono text-sm">{modele.code}</TableCell>
                              <TableCell className="font-medium">{modele.libelle}</TableCell>
                              <TableCell className="max-w-xs truncate text-sm text-muted-foreground">{modele.description || '-'}</TableCell>
                              <TableCell className="text-center">{modele.lignes.length}</TableCell>
                              <TableCell className="text-center">
                                {modele.actif ? <Check className="mx-auto h-4 w-4 text-green-600" /> : <X className="mx-auto h-4 w-4 text-red-600" />}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button variant="ghost" size="sm" onClick={() => handleEditModeleFiscal(modele)}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => handleDeleteModeleFiscalClick(modele)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code</TableHead>
                          <TableHead>Libellé</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-center">Ordre</TableHead>
                          <TableHead className="text-center">Actif</TableHead>
                          <TableHead className="text-center">Type</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoading ? (
                          <TableRow><TableCell colSpan={7} className="text-center">Chargement...</TableCell></TableRow>
                        ) : referentiels.length === 0 ? (
                          <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Aucun référentiel trouvé</TableCell></TableRow>
                        ) : (
                          referentiels.map((referentiel) => (
                            <TableRow key={referentiel.id}>
                              <TableCell className="font-mono text-sm">{referentiel.code}</TableCell>
                              <TableCell className="font-medium">{referentiel.libelle}</TableCell>
                              <TableCell className="max-w-xs truncate text-sm text-muted-foreground">{referentiel.description || '-'}</TableCell>
                              <TableCell className="text-center">{referentiel.ordre}</TableCell>
                              <TableCell className="text-center">
                                {referentiel.actif ? <Check className="mx-auto h-4 w-4 text-green-600" /> : <X className="mx-auto h-4 w-4 text-red-600" />}
                              </TableCell>
                              <TableCell className="text-center">
                                {!referentiel.modifiable ? <Badge variant="secondary" className="text-xs">Système</Badge> : null}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button variant="ghost" size="sm" onClick={() => handleEditReferentiel(referentiel)}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => handleDeleteReferentielClick(referentiel)} disabled={!referentiel.modifiable}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {activeCategorie === 'nature_compte' ? (
        <NatureCompteDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          natureCompte={selectedNatureCompte}
          comptesCharge={comptesCharge}
        />
      ) : activeCategorie === 'taxe_fiscale' ? (
        <TaxeFiscaleDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          taxeFiscale={selectedTaxeFiscale}
          comptes={comptes}
        />
      ) : activeCategorie === 'modele_fiscal' ? (
        <ModeleFiscalDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          modeleFiscal={selectedModeleFiscal}
          taxesFiscales={taxesFiscales}
        />
      ) : (
        <ReferentielDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          referentiel={selectedReferentiel}
          categorieLabel={activeCategorieConfig?.label || ''}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer {activeCategorie === 'nature_compte'
                ? 'la nature de compte'
                : activeCategorie === 'taxe_fiscale'
                  ? 'la taxe fiscale'
                  : activeCategorie === 'modele_fiscal'
                    ? 'le modèle fiscal'
                    : 'le référentiel'} "{deleteLabel}" ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
