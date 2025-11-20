import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, MoreVertical, CheckCircle, FileCheck, Banknote, XCircle, Trash } from 'lucide-react';
import type { Depense } from '@/types/depense.types';

interface DepenseTableProps {
  depenses: Depense[];
  onEdit?: (depense: Depense) => void;
  onValider?: (id: string) => void;
  onOrdonnancer?: (id: string) => void;
  onMarquerPayee?: (id: string) => void;
  onAnnuler?: (id: string) => void;
  onDelete?: (id: string) => void;
  onOpenSnapshot?: (id: string) => void;
}

export const DepenseTable = ({
  depenses,
  onEdit,
  onValider,
  onOrdonnancer,
  onMarquerPayee,
  onAnnuler,
  onDelete,
  onOpenSnapshot,
}: DepenseTableProps) => {
  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState<string>('tous');

  const formatMontant = (montant: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(montant);
  };

  const getStatutBadge = (statut: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      brouillon: { variant: 'outline', label: 'Brouillon' },
      validee: { variant: 'secondary', label: 'Validée' },
      ordonnancee: { variant: 'default', label: 'Ordonnancée' },
      payee: { variant: 'default', label: 'Payée' },
      annulee: { variant: 'destructive', label: 'Annulée' },
    };
    const config = variants[statut] || variants.brouillon;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filteredDepenses = useMemo(() => {
    let filtered = depenses;

    if (filterStatut !== 'tous') {
      filtered = filtered.filter(d => d.statut === filterStatut);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        d =>
          d.numero.toLowerCase().includes(searchLower) ||
          d.objet.toLowerCase().includes(searchLower) ||
          d.beneficiaire?.toLowerCase().includes(searchLower) ||
          d.fournisseur?.nom.toLowerCase().includes(searchLower)
      );
    }

    return filtered.sort((a, b) => 
      new Date(b.dateDepense).getTime() - new Date(a.dateDepense).getTime()
    );
  }, [depenses, search, filterStatut]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Liste des dépenses</CardTitle>
        <div className="flex gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par numéro, objet, bénéficiaire..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                Statut: {filterStatut === 'tous' ? 'Tous' : filterStatut}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setFilterStatut('tous')}>Tous</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatut('brouillon')}>Brouillon</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatut('validee')}>Validée</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatut('ordonnancee')}>Ordonnancée</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatut('payee')}>Payée</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatut('annulee')}>Annulée</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Numéro</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Objet</TableHead>
              <TableHead>Bénéficiaire</TableHead>
              <TableHead className="text-right">Montant</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Imputation</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDepenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  Aucune dépense trouvée
                </TableCell>
              </TableRow>
            ) : (
              filteredDepenses.map((depense) => (
                <TableRow key={depense.id}>
                  <TableCell className="font-medium">{depense.numero}</TableCell>
                  <TableCell>{new Date(depense.dateDepense).toLocaleDateString('fr-FR')}</TableCell>
                  <TableCell className="max-w-xs truncate">{depense.objet}</TableCell>
                  <TableCell>
                    {depense.fournisseur?.nom || depense.beneficiaire || '-'}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatMontant(depense.montant)} €
                  </TableCell>
                  <TableCell>{getStatutBadge(depense.statut)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {depense.engagement && <div>ENG: {depense.engagement.numero}</div>}
                    {depense.reservationCredit && <div>RES: {depense.reservationCredit.numero}</div>}
                    {depense.facture && <div>FAC: {depense.facture.numero}</div>}
                    {!depense.engagement && !depense.reservationCredit && depense.ligneBudgetaire && (
                      <div>Ligne directe</div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {depense.statut === 'brouillon' && (
                          <>
                            {onValider && (
                              <DropdownMenuItem onClick={() => onValider(depense.id)}>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Valider
                              </DropdownMenuItem>
                            )}
                            {onDelete && (
                              <DropdownMenuItem onClick={() => onDelete(depense.id)} className="text-destructive">
                                <Trash className="h-4 w-4 mr-2" />
                                Supprimer
                              </DropdownMenuItem>
                            )}
                          </>
                        )}
                        {depense.statut === 'validee' && onOrdonnancer && (
                          <DropdownMenuItem onClick={() => onOrdonnancer(depense.id)}>
                            <FileCheck className="h-4 w-4 mr-2" />
                            Ordonnancer
                          </DropdownMenuItem>
                        )}
                        {depense.statut === 'ordonnancee' && onMarquerPayee && (
                          <DropdownMenuItem onClick={() => onMarquerPayee(depense.id)}>
                            <Banknote className="h-4 w-4 mr-2" />
                            Marquer payée
                          </DropdownMenuItem>
                        )}
                        {depense.statut !== 'annulee' && depense.statut !== 'payee' && onAnnuler && (
                          <DropdownMenuItem onClick={() => onAnnuler(depense.id)} className="text-destructive">
                            <XCircle className="h-4 w-4 mr-2" />
                            Annuler
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
