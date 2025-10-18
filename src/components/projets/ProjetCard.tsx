import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Edit2, Trash2, Calendar, User, Wallet } from 'lucide-react';
import { Projet } from '@/types/projet.types';
import { format } from 'date-fns';

interface ProjetCardProps {
  projet: Projet;
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

export const ProjetCard = ({ projet, onEdit, onDelete, canEdit = true }: ProjetCardProps) => {
  const budgetDisponible = projet.budgetAlloue - projet.budgetConsomme;
  const tauxConsommation = projet.budgetAlloue > 0 
    ? (projet.budgetConsomme / projet.budgetAlloue) * 100 
    : 0;

  return (
    <Card className="hover:shadow-primary transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs">
                {projet.code}
              </Badge>
              <Badge className={getStatutColor(projet.statut)}>
                {projet.statut.replace('_', ' ')}
              </Badge>
              {projet.priorite && (
                <Badge className={getPrioriteColor(projet.priorite)}>
                  {projet.priorite}
                </Badge>
              )}
            </div>
            <CardTitle className="text-lg">{projet.nom}</CardTitle>
          </div>
          {canEdit && (
            <div className="flex gap-1">
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
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {projet.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {projet.description}
          </p>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Avancement</span>
            <span className="font-medium">{projet.tauxAvancement}%</span>
          </div>
          <Progress value={projet.tauxAvancement} className="h-2" />
        </div>

        <div className="grid grid-cols-3 gap-2 pt-2 border-t">
          <div>
            <div className="text-xs text-muted-foreground">Budget alloué</div>
            <div className="text-sm font-medium">
              {projet.budgetAlloue.toLocaleString()} €
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Consommé</div>
            <div className="text-sm font-medium">
              {projet.budgetConsomme.toLocaleString()} €
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Disponible</div>
            <div className="text-sm font-medium">
              {budgetDisponible.toLocaleString()} €
            </div>
          </div>
        </div>

        <div className="space-y-1 pt-2 border-t text-sm">
          {projet.responsable && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-3 w-3" />
              <span>{projet.responsable}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>
              {format(new Date(projet.dateDebut), 'dd/MM/yyyy')} - {format(new Date(projet.dateFin), 'dd/MM/yyyy')}
            </span>
          </div>
        </div>

        {tauxConsommation > 90 && (
          <Badge variant="destructive" className="w-full justify-center">
            ⚠️ Budget presque épuisé ({tauxConsommation.toFixed(0)}%)
          </Badge>
        )}
      </CardContent>
    </Card>
  );
};
