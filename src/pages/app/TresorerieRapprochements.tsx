import { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Plus } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { ListLayout } from '@/components/lists/ListLayout';
import { ListToolbar } from '@/components/lists/ListToolbar';
import { ListTable, ListColumn } from '@/components/lists/ListTable';
import { PaginationControls } from '@/components/lists/PaginationControls';
import {
  AdvancedFiltersPanel,
  AdvancedFiltersToggleButton,
} from '@/components/lists/AdvancedFiltersPanel';
import { Badge } from '@/components/ui/badge';
import { useRapprochementsBancaires } from '@/hooks/useRapprochementsBancaires';
import { useNavigate, useMatch } from 'react-router-dom';
import { useFocusedEditorGuard } from '@/components/editors/FocusedEditorGuard';
import { RapprochementBancaireForm } from '@/components/tresorerie/RapprochementBancaireForm';
import type { RapprochementBancaireFormData, RapprochementBancaire } from '@/types/rapprochement-bancaire.types';
import { formatCurrency } from '@/lib/utils';
import { useClientPagination } from '@/hooks/useClientPagination';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const TresorerieRapprochements = () => {
  const { rapprochements, createRapprochement, validateRapprochement } = useRapprochementsBancaires();
  const [searchValue, setSearchValue] = useState('');
  const [statutFilter, setStatutFilter] = useState<'tous' | 'en_cours' | 'valide' | 'annule'>('tous');
  const [isRapprochementDirty, setIsRapprochementDirty] = useState(false);
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);
  const [dateDebutFilter, setDateDebutFilter] = useState('');
  const [dateFinFilter, setDateFinFilter] = useState('');
  const [ecartMin, setEcartMin] = useState('');
  const [ecartMax, setEcartMax] = useState('');
  const navigate = useNavigate();
  const isCreateRoute = !!useMatch('/app/tresorerie/rapprochements/create');

  const filteredItems = useMemo(() => {
    const term = searchValue.trim().toLowerCase();
    if (!term) return rapprochements;

    return rapprochements
      .filter((item) => (statutFilter === 'tous' ? true : item.statut === statutFilter))
      .filter((item) => (!dateDebutFilter ? true : item.dateDebut >= dateDebutFilter))
      .filter((item) => (!dateFinFilter ? true : item.dateFin <= dateFinFilter))
      .filter((item) => (!ecartMin ? true : item.ecart >= Number(ecartMin)))
      .filter((item) => (!ecartMax ? true : item.ecart <= Number(ecartMax)))
      .filter((item) =>
        [item.numero, item.compte?.code, item.compte?.libelle, item.statut]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(term)),
      );
  }, [dateDebutFilter, dateFinFilter, ecartMax, ecartMin, rapprochements, searchValue, statutFilter]);

  const activeAdvancedFiltersCount = [
    !!dateDebutFilter,
    !!dateFinFilter,
    !!ecartMin,
    !!ecartMax,
  ].filter(Boolean).length;

  const {
    currentPage,
    pageSize,
    totalCount,
    totalPages,
    paginatedItems,
    goToPage,
    setPageSize,
  } = useClientPagination(filteredItems, {
    initialPageSize: 25,
    resetKey: [searchValue, statutFilter, dateDebutFilter, dateFinFilter, ecartMin, ecartMax].join('|'),
  });

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
        />
      </div>
    );
  }

  const resetAdvancedFilters = () => {
    setDateDebutFilter('');
    setDateFinFilter('');
    setEcartMin('');
    setEcartMax('');
  };

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

      <ListLayout
        title="Historique des rapprochements"
        description="Contrôle des écarts et validation des rapprochements bancaires"
        toolbar={
          <ListToolbar
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            searchPlaceholder="Rechercher par numéro ou compte..."
            filters={[
              <Select key="statut" value={statutFilter} onValueChange={(value) => setStatutFilter(value as typeof statutFilter)}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Statut: Tous</SelectItem>
                  <SelectItem value="en_cours">Statut: En cours</SelectItem>
                  <SelectItem value="valide">Statut: Validé</SelectItem>
                  <SelectItem value="annule">Statut: Annulé</SelectItem>
                </SelectContent>
              </Select>,
              <AdvancedFiltersToggleButton
                key="advanced-filters"
                open={isAdvancedFiltersOpen}
                onToggle={() => setIsAdvancedFiltersOpen((open) => !open)}
                activeCount={activeAdvancedFiltersCount}
              />,
            ]}
          />
        }
        advancedFilters={
          <AdvancedFiltersPanel
            open={isAdvancedFiltersOpen}
            onReset={resetAdvancedFilters}
            resetDisabled={activeAdvancedFiltersCount === 0}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="rappro-date-debut">Date début</Label>
                <Input id="rappro-date-debut" type="date" value={dateDebutFilter} onChange={(event) => setDateDebutFilter(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rappro-date-fin">Date fin</Label>
                <Input id="rappro-date-fin" type="date" value={dateFinFilter} onChange={(event) => setDateFinFilter(event.target.value)} />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Écart</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input type="number" placeholder="Min" value={ecartMin} onChange={(event) => setEcartMin(event.target.value)} />
                  <Input type="number" placeholder="Max" value={ecartMax} onChange={(event) => setEcartMax(event.target.value)} />
                </div>
              </div>
            </div>
          </AdvancedFiltersPanel>
        }
      >
        <ListTable
          columns={columns}
          items={paginatedItems}
          getRowId={(item) => item.id}
          footer={
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={pageSize}
              onPageChange={goToPage}
              onPageSizeChange={setPageSize}
              itemLabel="rapprochements"
              showKeyboardHint
            />
          }
        />
      </ListLayout>
    </div>
  );
};

export default TresorerieRapprochements;
