import { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Plus } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ListToolbar } from '@/components/lists/ListToolbar';
import { ListTable, ListColumn } from '@/components/lists/ListTable';
import { Badge } from '@/components/ui/badge';
import { useRapprochementsBancaires } from '@/hooks/useRapprochementsBancaires';
import { useNavigate, useMatch } from 'react-router-dom';
import { useFocusedEditorGuard } from '@/components/editors/FocusedEditorGuard';
import { RapprochementBancaireForm } from '@/components/tresorerie/RapprochementBancaireForm';
import type { RapprochementBancaireFormData, RapprochementBancaire } from '@/types/rapprochement-bancaire.types';
import { formatCurrency } from '@/lib/utils';

const TresorerieRapprochements = () => {
  const { rapprochements, createRapprochement, validateRapprochement } = useRapprochementsBancaires();
  const [searchValue, setSearchValue] = useState('');
  const [isRapprochementDirty, setIsRapprochementDirty] = useState(false);
  const navigate = useNavigate();
  const isCreateRoute = !!useMatch('/app/tresorerie/rapprochements/create');

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

  const handleSingleCancel = () => {
    navigate('/app/tresorerie/rapprochements');
  };

  const { guard } = useFocusedEditorGuard({
    active: isCreateRoute,
    dirty: isRapprochementDirty,
    onExit: handleSingleCancel,
    entityLabel: 'ce formulaire de rapprochement bancaire',
    overlayAriaLabel: 'Quitter le formulaire de rapprochement bancaire',
  });

  if (isCreateRoute) {
    return (
      <div className="space-y-6">
        {guard}
        <PageHeader
          title="Nouveau rapprochement bancaire"
          description="Créez un rapprochement bancaire dans un espace de travail dédié."
          sticky={false}
          actions={
            <Button variant="outline" onClick={handleSingleCancel}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour aux rapprochements
            </Button>
          }
        />

        <RapprochementBancaireForm
          onSubmit={async (data: RapprochementBancaireFormData) => {
            await createRapprochement(data);
            navigate('/app/tresorerie/rapprochements');
          }}
          onCancel={handleSingleCancel}
          onDirtyChange={setIsRapprochementDirty}
          submitLabel="Créer le rapprochement"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rapprochements bancaires"
        description="Contrôle des écarts entre relevés bancaires et opérations comptabilisées"
        sticky={false}
        actions={
          <Button onClick={() => navigate('/app/tresorerie/rapprochements/create')}>
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
    </div>
  );
};

export default TresorerieRapprochements;
