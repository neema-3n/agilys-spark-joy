import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { PaiementStats } from '@/components/paiements/PaiementStats';
import { PaiementTable } from '@/components/paiements/PaiementTable';
import { usePaiements } from '@/hooks/usePaiements';
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
import { Input } from '@/components/ui/input';

export default function Paiements() {
  const { paiements, isLoading, annulerPaiement } = usePaiements();
  const [search, setSearch] = useState('');
  const [annulerDialogOpen, setAnnulerDialogOpen] = useState(false);
  const [selectedPaiementId, setSelectedPaiementId] = useState<string | null>(null);
  const [motifAnnulation, setMotifAnnulation] = useState('');

  const filteredPaiements = useMemo(() => {
    if (!search) return paiements;
    
    const searchLower = search.toLowerCase();
    return paiements.filter(
      (p) =>
        p.numero.toLowerCase().includes(searchLower) ||
        p.depense?.numero.toLowerCase().includes(searchLower) ||
        p.referencePaiement?.toLowerCase().includes(searchLower)
    );
  }, [paiements, search]);

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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Historique des Paiements"
        description="Consultation de tous les paiements effectués"
      />

      <div className="px-8 space-y-6">
        <PaiementStats paiements={paiements} />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Input
              placeholder="Rechercher par numéro, référence..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <PaiementTable
            paiements={filteredPaiements}
            onView={handleView}
            onAnnuler={handleAnnuler}
          />
        </div>
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
