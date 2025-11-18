import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { LigneBudgetaire } from '@/types/budget.types';

interface DepensesTableProps {
  lignesBudgetaires: LigneBudgetaire[];
}

type FilterStatus = 'all' | 'alert' | 'depassement' | 'ok';

export const DepensesTable = ({ lignesBudgetaires }: DepensesTableProps) => {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  const formatMontant = (montant: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(montant);
  };

  const getStatut = (ligne: LigneBudgetaire): 'depassement' | 'alert' | 'ok' => {
    if (ligne.disponible < 0) return 'depassement';
    const budget = ligne.montantModifie || ligne.montantInitial;
    if (budget > 0 && (ligne.disponible / budget) < 0.1) return 'alert';
    return 'ok';
  };

  const getStatutBadge = (statut: 'depassement' | 'alert' | 'ok') => {
    switch (statut) {
      case 'depassement':
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" />Dépassement</Badge>;
      case 'alert':
        return <Badge variant="warning" className="gap-1"><TrendingUp className="h-3 w-3" />Alerte</Badge>;
      default:
        return <Badge variant="success">Normal</Badge>;
    }
  };

  const getTauxConsommation = (ligne: LigneBudgetaire) => {
    const budget = ligne.montantModifie || ligne.montantInitial;
    if (budget === 0) return 0;
    return Math.min(((ligne.montantEngage + ligne.montantReserve) / budget) * 100, 100);
  };

  const filteredLignes = useMemo(() => {
    let filtered = lignesBudgetaires;

    // Filtrer par recherche
    if (search) {
      filtered = filtered.filter(ligne =>
        ligne.libelle.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Filtrer par statut
    if (filterStatus !== 'all') {
      filtered = filtered.filter(ligne => getStatut(ligne) === filterStatus);
    }

    // Trier : dépassements en premier, puis alertes
    return filtered.sort((a, b) => {
      const statutA = getStatut(a);
      const statutB = getStatut(b);
      if (statutA === 'depassement' && statutB !== 'depassement') return -1;
      if (statutA !== 'depassement' && statutB === 'depassement') return 1;
      if (statutA === 'alert' && statutB !== 'alert') return -1;
      if (statutA !== 'alert' && statutB === 'alert') return 1;
      return 0;
    });
  }, [lignesBudgetaires, search, filterStatus]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <CardTitle>Suivi des Lignes Budgétaires</CardTitle>
          <div className="flex gap-2">
            <Input
              placeholder="Rechercher une ligne..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64"
            />
            <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as FilterStatus)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="depassement">Dépassements</SelectItem>
                <SelectItem value="alert">Alertes</SelectItem>
                <SelectItem value="ok">Normales</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ligne budgétaire</TableHead>
                <TableHead className="text-right">Budget</TableHead>
                <TableHead className="text-right">Engagé</TableHead>
                <TableHead className="text-right">Payé</TableHead>
                <TableHead className="text-right">Disponible</TableHead>
                <TableHead className="text-center">Consommation</TableHead>
                <TableHead className="text-center">Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLignes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Aucune ligne budgétaire trouvée
                  </TableCell>
                </TableRow>
              ) : (
                filteredLignes.map((ligne) => {
                  const budget = ligne.montantModifie || ligne.montantInitial;
                  const statut = getStatut(ligne);
                  const tauxConsommation = getTauxConsommation(ligne);

                  return (
                    <TableRow key={ligne.id}>
                      <TableCell className="font-medium max-w-xs">
                        <div className="truncate" title={ligne.libelle}>
                          {ligne.libelle}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{formatMontant(budget)}</TableCell>
                      <TableCell className="text-right">{formatMontant(ligne.montantEngage)}</TableCell>
                      <TableCell className="text-right">{formatMontant(ligne.montantPaye)}</TableCell>
                      <TableCell className="text-right">
                        <span className={ligne.disponible < 0 ? 'text-destructive font-bold' : ''}>
                          {formatMontant(ligne.disponible)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary/20">
                            <div
                              className={cn(
                                "h-full transition-all",
                                statut === 'depassement' 
                                  ? 'bg-destructive' 
                                  : statut === 'alert' 
                                  ? 'bg-orange-500' 
                                  : 'bg-secondary'
                              )}
                              style={{ width: `${tauxConsommation}%` }}
                            />
                          </div>
                          <div className="text-xs text-center text-muted-foreground">
                            {tauxConsommation.toFixed(0)}%
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatutBadge(statut)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
