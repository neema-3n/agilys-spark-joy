import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Scenario } from '@/types/prevision.types';
import { MoreVertical, Edit, Copy, Archive, Check, Trash2, FileSpreadsheet } from 'lucide-react';
import { useLignesPrevision } from '@/hooks/usePrevisions';

interface ScenarioCardProps {
  scenario: Scenario;
  onEdit: (scenario: Scenario) => void;
  onDuplicate: (scenario: Scenario) => void;
  onValidate: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onViewDetails: (scenario: Scenario) => void;
}

export function ScenarioCard({
  scenario,
  onEdit,
  onDuplicate,
  onValidate,
  onArchive,
  onDelete,
  onViewDetails,
}: ScenarioCardProps) {
  const { lignes } = useLignesPrevision(scenario.id);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'optimiste':
        return 'bg-green-500/10 text-green-700 dark:text-green-400';
      case 'pessimiste':
        return 'bg-red-500/10 text-red-700 dark:text-red-400';
      case 'realiste':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-400';
      default:
        return 'bg-purple-500/10 text-purple-700 dark:text-purple-400';
    }
  };

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'valide':
        return 'bg-green-500/10 text-green-700 dark:text-green-400';
      case 'archive':
        return 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
      default:
        return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400';
    }
  };

  const montantTotal = lignes?.reduce((sum, ligne) => sum + ligne.montantPrevu, 0) || 0;
  const nombreAnnees = new Set(lignes?.map(l => l.annee)).size;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{scenario.nom}</CardTitle>
            <p className="text-sm text-muted-foreground">{scenario.code}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(scenario)}>
                <Edit className="h-4 w-4 mr-2" />
                Modifier
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate(scenario)}>
                <Copy className="h-4 w-4 mr-2" />
                Dupliquer
              </DropdownMenuItem>
              {scenario.statut === 'brouillon' && (
                <DropdownMenuItem onClick={() => onValidate(scenario.id)}>
                  <Check className="h-4 w-4 mr-2" />
                  Valider
                </DropdownMenuItem>
              )}
              {scenario.statut === 'valide' && (
                <DropdownMenuItem onClick={() => onArchive(scenario.id)}>
                  <Archive className="h-4 w-4 mr-2" />
                  Archiver
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onDelete(scenario.id)} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Badge className={getTypeColor(scenario.typeScenario)}>
            {scenario.typeScenario}
          </Badge>
          <Badge className={getStatutColor(scenario.statut)}>
            {scenario.statut}
          </Badge>
        </div>

        {scenario.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {scenario.description}
          </p>
        )}

        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          <div>
            <p className="text-xs text-muted-foreground">Année de référence</p>
            <p className="text-lg font-semibold">{scenario.anneeReference}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Années projetées</p>
            <p className="text-lg font-semibold">{nombreAnnees || 0}</p>
          </div>
        </div>

        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">Montant total prévu</p>
          <p className="text-xl font-bold">
            {montantTotal.toLocaleString('fr-FR')}
          </p>
        </div>

        <Button
          onClick={() => onViewDetails(scenario)}
          className="w-full"
          variant="outline"
        >
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Voir les détails
        </Button>
      </CardContent>
    </Card>
  );
}
