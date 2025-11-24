import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { BookOpen, Filter, Download, X } from 'lucide-react';
import { useEcrituresComptables } from '@/hooks/useEcrituresComptables';
import { EcritureComptableStats } from '@/components/ecritures/EcritureComptableStats';
import { EcritureComptableTable } from '@/components/ecritures/EcritureComptableTable';
import type { EcrituresFilters } from '@/types/ecriture-comptable.types';
import type { TypeOperation } from '@/types/regle-comptable.types';

const TYPE_OPERATIONS: { value: TypeOperation; label: string }[] = [
  { value: 'reservation', label: 'Réservation' },
  { value: 'engagement', label: 'Engagement' },
  { value: 'bon_commande', label: 'Bon de Commande' },
  { value: 'facture', label: 'Facture' },
  { value: 'depense', label: 'Dépense' },
  { value: 'paiement', label: 'Paiement' },
];

export default function JournalComptable() {
  const [filters, setFilters] = useState<EcrituresFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  const { ecritures, stats, isLoading } = useEcrituresComptables(filters);

  const handleFilterChange = (key: keyof EcrituresFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== undefined && v !== '');

  const exportToCsv = () => {
    const headers = ['Date', 'N° Pièce', 'Ligne', 'Compte Débit', 'Compte Crédit', 'Libellé', 'Montant', 'Type'];
    const rows = ecritures.map(e => [
      e.dateEcriture,
      e.numeroPiece,
      e.numeroLigne,
      `${e.compteDebit?.numero} - ${e.compteDebit?.libelle}`,
      `${e.compteCredit?.numero} - ${e.compteCredit?.libelle}`,
      e.libelle,
      e.montant,
      e.typeOperation
    ]);

    const csv = [
      headers.join(';'),
      ...rows.map(row => row.join(';'))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `journal-comptable-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Journal Comptable"
        description="Registre chronologique de toutes les écritures comptables"
      />

      <EcritureComptableStats stats={stats} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Écritures Comptables</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtres
              {hasActiveFilters && (
                <span className="ml-2 bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">
                  {Object.values(filters).filter(v => v).length}
                </span>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportToCsv}
              disabled={ecritures.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Exporter CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showFilters && (
            <Card className="border-dashed">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Date Début</Label>
                    <Input
                      type="date"
                      value={filters.dateDebut || ''}
                      onChange={(e) => handleFilterChange('dateDebut', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Date Fin</Label>
                    <Input
                      type="date"
                      value={filters.dateFin || ''}
                      onChange={(e) => handleFilterChange('dateFin', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Type d'Opération</Label>
                    <Select
                      value={filters.typeOperation || undefined}
                      onValueChange={(value) => handleFilterChange('typeOperation', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Tous" />
                      </SelectTrigger>
                      <SelectContent>
                        {TYPE_OPERATIONS.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>N° Pièce</Label>
                    <Input
                      placeholder="Rechercher..."
                      value={filters.numeroPiece || ''}
                      onChange={(e) => handleFilterChange('numeroPiece', e.target.value)}
                    />
                  </div>
                </div>
                {hasActiveFilters && (
                  <div className="mt-4 flex justify-end">
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      <X className="h-4 w-4 mr-2" />
                      Réinitialiser les filtres
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Chargement des écritures...
            </div>
          ) : (
            <EcritureComptableTable ecritures={ecritures} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
