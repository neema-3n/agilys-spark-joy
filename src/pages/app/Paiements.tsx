import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { PaiementDialog } from '@/components/paiements/PaiementDialog';
import { PaiementTable } from '@/components/paiements/PaiementTable';
import { ListLayout } from '@/components/lists/ListLayout';
import { ListToolbar } from '@/components/lists/ListToolbar';
import { useFactures } from '@/hooks/useFactures';
import { Paiement, PaiementInput, ModePaiement } from '@/types/paiement.types';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const Paiements = () => {
  const { factures, isLoading } = useFactures();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [paiements, setPaiements] = useState<Paiement[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [modeFilter, setModeFilter] = useState<ModePaiement | 'tous'>('tous');
  const MAX_DEMO_PAYMENTS = 30;

  const makeId = () =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `pay-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  useEffect(() => {
    if (!isLoading && paiements.length === 0 && factures.length > 0) {
      const seed = factures.slice(0, 3).map((facture, index) => ({
        id: makeId(),
        factureId: facture.id,
        factureNumero: facture.numero,
        fournisseurNom: facture.fournisseur?.nom,
        montant: Math.max(50, Math.min(facture.montantTTC, 150 + index * 50)),
        date: new Date().toISOString().slice(0, 10),
        mode: (['virement', 'carte', 'cheque'] as ModePaiement[])[index % 3],
        reference: `DEMO-${facture.numero}`,
        note: 'Paiement de démonstration',
      }));
      setPaiements(seed);
    }
  }, [isLoading, factures, paiements.length, makeId]);

  const handleSave = (data: PaiementInput) => {
    const facture = factures.find((f) => f.id === data.factureId);
    const paiement: Paiement = {
      id: makeId(),
      ...data,
      factureNumero: facture?.numero || 'Facture',
      fournisseurNom: facture?.fournisseur?.nom,
    };
    setPaiements((prev) => [paiement, ...prev]);
  };

  const handleDelete = (id: string) => {
    setPaiements((prev) => prev.filter((p) => p.id !== id));
  };

  const handleGenerateDemo = (count: number) => {
    if (!factures.length) return;
    const remaining = MAX_DEMO_PAYMENTS - paiements.length;
    if (remaining <= 0) return;
    const target = Math.min(count, remaining);

    const modes: ModePaiement[] = ['virement', 'carte', 'cheque', 'espece'];
    const today = new Date();

    const newItems: Paiement[] = Array.from({ length: target }).map((_, idx) => {
      const facture = factures[(paiements.length + idx) % factures.length];
      const montantBase = Math.max(50, Math.min(facture.montantTTC, 150 + (idx % 5) * 40));
      const dayOffset = idx % 7;
      const date = new Date(today);
      date.setDate(today.getDate() - dayOffset);
      const dateIso = date.toISOString().slice(0, 10);

      return {
        id: makeId(),
        factureId: facture.id,
        factureNumero: facture.numero,
        fournisseurNom: facture.fournisseur?.nom,
        montant: montantBase,
        date: dateIso,
        mode: modes[idx % modes.length],
        reference: `DEMO-${facture.numero}-${idx + 1}`,
        note: 'Paiement généré automatiquement',
      };
    });

    setPaiements((prev) => [...newItems, ...prev].slice(0, MAX_DEMO_PAYMENTS));
  };

  const filteredPaiements = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return paiements
      .filter((p) => (modeFilter === 'tous' ? true : p.mode === modeFilter))
      .filter((p) => {
        if (!search) return true;
        return (
          p.factureNumero.toLowerCase().includes(search) ||
          (p.fournisseurNom || '').toLowerCase().includes(search) ||
          (p.reference || '').toLowerCase().includes(search) ||
          (p.note || '').toLowerCase().includes(search)
        );
      });
  }, [paiements, modeFilter, searchTerm]);

  const stats = useMemo(() => {
    const total = paiements.reduce((sum, p) => sum + p.montant, 0);
    const today = filteredPaiements.filter((p) => p.date === new Date().toISOString().slice(0, 10)).length;
    return { total, count: paiements.length, today };
  }, [paiements, filteredPaiements]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Gestion des Paiements" description="Exécution des paiements" />
        <p className="text-center text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestion des Paiements"
        description="Enregistrez et suivez les paiements liés aux factures fournisseurs"
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Enregistrer un paiement
          </Button>
        }
      />

      <div className="px-8 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Paiements enregistrés</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{stats.count}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Montant total</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(stats.total)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Paiements du jour</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{stats.today}</CardContent>
          </Card>
        </div>

        <ListLayout
          title="Liste des paiements"
          description="Rapprochez et historisez les paiements effectués"
          toolbar={
            <ListToolbar
              searchValue={searchTerm}
              onSearchChange={setSearchTerm}
              searchPlaceholder="Rechercher par facture, fournisseur, référence..."
              filters={[
                <DropdownMenu key="mode">
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      Mode: {modeFilter === 'tous' ? 'Tous' : modeFilter}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setModeFilter('tous')}>Tous</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setModeFilter('virement')}>Virement</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setModeFilter('cheque')}>Chèque</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setModeFilter('carte')}>Carte</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setModeFilter('espece')}>Espèces</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setModeFilter('autre')}>Autre</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>,
              ]}
              rightSlot={
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => handleGenerateDemo(10)}>
                    Générer 10 paiements (max {MAX_DEMO_PAYMENTS})
                  </Button>
                  <Button variant="secondary" onClick={() => setDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nouveau paiement
                  </Button>
                </div>
              }
            />
          }
        >
          <PaiementTable paiements={filteredPaiements} onDelete={handleDelete} />
        </ListLayout>
      </div>

      <PaiementDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        factures={factures}
        onSave={handleSave}
      />
    </div>
  );
};

export default Paiements;
