import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Edit2, Trash2, Search } from 'lucide-react';
import { Projet } from '@/types/projet.types';
import { format } from 'date-fns';

interface ProjetsTableProps {
  projets: Projet[];
  onEdit: (projet: Projet) => void;
  onDelete: (projet: Projet) => void;
  canEdit?: boolean;
}

const getStatutColor = (statut: string) => {
  const colors: Record<string, string> = {
    planifie: 'bg-muted text-muted-foreground',
    en_cours: 'bg-primary text-primary-foreground',
    en_attente: 'bg-accent text-accent-foreground',
    termine: 'bg-secondary text-secondary-foreground',
    annule: 'bg-destructive text-destructive-foreground',
  };
  return colors[statut] || 'bg-muted';
};

const getPrioriteColor = (priorite?: string) => {
  const colors: Record<string, string> = {
    haute: 'bg-destructive text-destructive-foreground',
    moyenne: 'bg-accent text-accent-foreground',
    basse: 'bg-muted text-muted-foreground',
  };
  return colors[priorite || 'moyenne'] || 'bg-muted';
};

export const ProjetsTable = ({ projets, onEdit, onDelete, canEdit = true }: ProjetsTableProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatut, setFilterStatut] = useState<string>('all');
  const [filterPriorite, setFilterPriorite] = useState<string>('all');

  const filteredProjets = projets.filter((projet) => {
    const matchesSearch =
      projet.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      projet.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatut = filterStatut === 'all' || projet.statut === filterStatut;
    const matchesPriorite = filterPriorite === 'all' || projet.priorite === filterPriorite;

    return matchesSearch && matchesStatut && matchesPriorite;
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom ou code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterStatut} onValueChange={setFilterStatut}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tous les statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="planifie">Planifié</SelectItem>
            <SelectItem value="en_cours">En cours</SelectItem>
            <SelectItem value="en_attente">En attente</SelectItem>
            <SelectItem value="termine">Terminé</SelectItem>
            <SelectItem value="annule">Annulé</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPriorite} onValueChange={setFilterPriorite}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Toutes priorités" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes priorités</SelectItem>
            <SelectItem value="haute">Haute</SelectItem>
            <SelectItem value="moyenne">Moyenne</SelectItem>
            <SelectItem value="basse">Basse</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border max-h-[600px] overflow-auto">
        <div className="[&>div]:max-h-none [&>div]:overflow-visible">
          <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Nom</TableHead>
              <TableHead>Responsable</TableHead>
              <TableHead>Budget</TableHead>
              <TableHead>Avancement</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Priorité</TableHead>
              <TableHead>Dates</TableHead>
              {canEdit && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProjets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canEdit ? 9 : 8} className="text-center text-muted-foreground">
                  Aucun projet trouvé
                </TableCell>
              </TableRow>
            ) : (
              filteredProjets.map((projet) => {
                const budgetDisponible = projet.budgetAlloue - projet.budgetConsomme;
                return (
                  <TableRow key={projet.id}>
                    <TableCell className="font-mono text-sm">{projet.code}</TableCell>
                    <TableCell className="font-medium">{projet.nom}</TableCell>
                    <TableCell className="text-sm">{projet.responsable || '-'}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{projet.budgetAlloue.toLocaleString()} €</div>
                        <div className="text-xs text-muted-foreground">
                          Consommé: {projet.budgetConsomme.toLocaleString()} €
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Dispo: {budgetDisponible.toLocaleString()} €
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="w-24 space-y-1">
                        <Progress value={projet.tauxAvancement} className="h-2" />
                        <div className="text-xs text-muted-foreground text-center">
                          {projet.tauxAvancement}%
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatutColor(projet.statut)}>
                        {projet.statut.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {projet.priorite && (
                        <Badge className={getPrioriteColor(projet.priorite)}>
                          {projet.priorite}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div>{format(new Date(projet.dateDebut), 'dd/MM/yyyy')}</div>
                      <div>{format(new Date(projet.dateFin), 'dd/MM/yyyy')}</div>
                    </TableCell>
                    {canEdit && (
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEdit(projet)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDelete(projet)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        </div>
      </div>
    </div>
  );
};
