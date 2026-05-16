import { useMemo, useState } from 'react';
import { CheckCircle2, Plus } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ListToolbar } from '@/components/lists/ListToolbar';
import { ListTable, ListColumn } from '@/components/lists/ListTable';
import { Badge } from '@/components/ui/badge';
import { useRapprochementsBancaires } from '@/hooks/useRapprochementsBancaires';
import { useComptesTresorerie } from '@/hooks/useComptesTresorerie';
import type { RapprochementBancaireFormData, RapprochementBancaire } from '@/types/rapprochement-bancaire.types';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
  }).format(value);

const defaultForm: RapprochementBancaireFormData = {
  compteId: '',
  dateDebut: '',
  dateFin: '',
  soldeReleve: 0,
  observations: '',
};

const TresorerieRapprochements = () => {
  const { rapprochements, createRapprochement, validateRapprochement } = useRapprochementsBancaires();
  const { comptes } = useComptesTresorerie();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [formData, setFormData] = useState<RapprochementBancaireFormData>(defaultForm);

  const filteredItems = useMemo(() => {
    const term = searchValue.trim().toLowerCase();
    if (!term) return rapprochements;

    return rapprochements.filter((item) =>
      [item.numero, item.compte?.code, item.compte?.libelle, item.statut]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term)),
    );
  }, [rapprochements, searchValue]);

  const columns: ListColumn<RapprochementBancaire>[] = [
    { id: 'numero', header: 'Numéro', render: (item) => <span className="font-medium">{item.numero}</span> },
    {
      id: 'compte',
      header: 'Compte',
      render: (item) => (item.compte ? `${item.compte.code} - ${item.compte.libelle}` : '-'),
    },
    { id: 'periode', header: 'Période', render: (item) => `${item.dateDebut} -> ${item.dateFin}` },
    { id: 'soldeReleve', header: 'Solde relevé', align: 'right', render: (item) => formatCurrency(item.soldeReleve) },
    { id: 'soldeComptable', header: 'Solde comptable', align: 'right', render: (item) => formatCurrency(item.soldeComptable) },
    {
      id: 'ecart',
      header: 'Écart',
      align: 'right',
      render: (item) => (
        <span className={item.ecart === 0 ? 'text-green-600 font-medium' : 'text-amber-600 font-medium'}>
          {formatCurrency(item.ecart)}
        </span>
      ),
    },
    {
      id: 'statut',
      header: 'Statut',
      render: (item) => (
        <Badge variant={item.statut === 'valide' ? 'success' : 'secondary'}>
          {item.statut === 'valide' ? 'Validé' : 'En cours'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      render: (item) =>
        item.statut !== 'valide' ? (
          <Button variant="outline" size="sm" onClick={() => validateRapprochement(item.id)}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Valider
          </Button>
        ) : (
          <span className="text-sm text-muted-foreground">Audit clos</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rapprochements bancaires"
        description="Contrôle des écarts entre relevés bancaires et opérations comptabilisées"
        sticky={false}
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau rapprochement
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Historique des rapprochements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ListToolbar
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            searchPlaceholder="Rechercher par numéro ou compte..."
          />
          <ListTable columns={columns} items={filteredItems} getRowId={(item) => item.id} />
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau rapprochement bancaire</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              await createRapprochement(formData);
              setFormData(defaultForm);
              setDialogOpen(false);
            }}
          >
            <div className="space-y-2">
              <label className="text-sm font-medium">Compte</label>
              <select
                className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm"
                value={formData.compteId}
                onChange={(event) => setFormData((current) => ({ ...current, compteId: event.target.value }))}
                required
              >
                <option value="">Sélectionner un compte</option>
                {comptes
                  .filter((compte) => compte.type === 'banque')
                  .map((compte) => (
                    <option key={compte.id} value={compte.id}>
                      {compte.code} - {compte.libelle}
                    </option>
                  ))}
              </select>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Date début</label>
                <Input
                  type="date"
                  value={formData.dateDebut}
                  onChange={(event) => setFormData((current) => ({ ...current, dateDebut: event.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Date fin</label>
                <Input
                  type="date"
                  value={formData.dateFin}
                  onChange={(event) => setFormData((current) => ({ ...current, dateFin: event.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Solde relevé</label>
              <Input
                type="number"
                value={formData.soldeReleve}
                onChange={(event) =>
                  setFormData((current) => ({ ...current, soldeReleve: Number(event.target.value) || 0 }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Observations</label>
              <textarea
                className="min-h-[96px] w-full rounded-xl border border-input bg-background px-4 py-3 text-sm"
                value={formData.observations || ''}
                onChange={(event) => setFormData((current) => ({ ...current, observations: event.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit">Créer</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TresorerieRapprochements;
