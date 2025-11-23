import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { PaiementStats } from '@/components/paiements/PaiementStats';
import { PaiementTable } from '@/components/paiements/PaiementTable';
import { usePaiements } from '@/hooks/usePaiements';
import { Button } from '@/components/ui/button';
import { ListLayout } from '@/components/lists/ListLayout';
import { ListToolbar } from '@/components/lists/ListToolbar';
import { ListPageLoading } from '@/components/lists/ListPageLoading';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Textarea } from '@/components/ui/textarea';

export default function Paiements() {
  const { paiements, isLoading, annulerPaiement } = usePaiements();
  const [search, setSearch] = useState('');
  const [statutFilter, setStatutFilter] = useState<'tous' | 'valide' | 'annule'>('tous');
  const [annulerDialogOpen, setAnnulerDialogOpen] = useState(false);
  const [selectedPaiementId, setSelectedPaiementId] = useState<string | null>(null);
  const [motifAnnulation, setMotifAnnulation] = useState('');

  const filteredPaiements = useMemo(() => {
    const searchLower = search.toLowerCase();
    return paiements
      .filter((p) => (statutFilter === 'tous' ? true : p.statut === statutFilter))
      .filter(
        (p) =>
          !search ||
          p.numero.toLowerCase().includes(searchLower) ||
          p.depense?.numero.toLowerCase().includes(searchLower) ||
          p.referencePaiement?.toLowerCase().includes(searchLower) ||
          p.depense?.fournisseur?.nom?.toLowerCase().includes(searchLower)
      )
      .sort((a, b) => new Date(b.datePaiement).getTime() - new Date(a.datePaiement).getTime());
  }, [paiements, search, statutFilter]);

  const handleAnnuler = (id: string) => {
    setSelectedPaiementId(id);
    setAnnulerDialogOpen(true);
  };

  const handleConfirmAnnuler = async () => {
    if (!selectedPaiementId || !motifAnnulation.trim()) return;
    
    await annulerPaiement({ id: selectedPaiementId, motif: motifAnnulation });
    setAnnulerDialogOpen(false);
    setSelectedPaiementId(null);
    setMotifAnnulation('');
  };

  const handleView = (id: string) => {
    console.log('View paiement:', id);
  };

  if (isLoading) {
    return (
      <ListPageLoading
        title="Historique des Paiements"
        description="Consultation de tous les paiements effectués"
        stickyHeader={false}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Historique des Paiements"
        description="Consultation de tous les paiements effectués"
      />

      <div className="px-8 space-y-6">
        <ListLayout
          title="Liste des paiements"
          description="Recherche et filtres sur l'historique des paiements"
          toolbar={
            <ListToolbar
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Rechercher par numéro, dépense ou référence..."
              filters={[
                <DropdownMenu key="statut">
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      Statut: {statutFilter === 'tous' ? 'Tous' : statutFilter}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {[
                      { value: 'tous', label: 'Tous' },
                      { value: 'valide', label: 'Validé' },
                      { value: 'annule', label: 'Annulé' },
                    ].map((option) => (
                      <DropdownMenuItem key={option.value} onClick={() => setStatutFilter(option.value as any)}>
                        {option.label}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setStatutFilter('tous')}>
                      Réinitialiser
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>,
              ]}
            />
          }
        >
          <div className="space-y-6 p-6 pt-2">
            <PaiementStats paiements={paiements} />

            <PaiementTable
              paiements={filteredPaiements}
              onView={handleView}
              onAnnuler={handleAnnuler}
            />
          </div>
        </ListLayout>
      </div>

      <AlertDialog open={annulerDialogOpen} onOpenChange={setAnnulerDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler ce paiement</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action annulera le paiement. Le montant payé de la dépense sera recalculé automatiquement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Motif d'annulation *</label>
              <Textarea
                value={motifAnnulation}
                onChange={(e) => setMotifAnnulation(e.target.value)}
                placeholder="Indiquez le motif de l'annulation..."
                rows={3}
                className="mt-1"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAnnuler}
              disabled={!motifAnnulation.trim()}
            >
              Confirmer l'annulation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
