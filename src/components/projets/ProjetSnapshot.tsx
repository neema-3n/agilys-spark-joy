import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Calendar, Edit2, Trash2, User, Wallet } from 'lucide-react';
import { format } from 'date-fns';
import type { Projet } from '@/types/projet.types';

interface ProjetSnapshotProps {
  projet: Projet;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
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

export const ProjetSnapshot = ({ projet, onClose, onEdit, onDelete }: ProjetSnapshotProps) => {
  const budgetDisponible = projet.budgetAlloue - projet.budgetConsomme;
  const tauxConsommation = projet.budgetAlloue > 0 ? (projet.budgetConsomme / projet.budgetAlloue) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{projet.code}</Badge>
            <Badge className={getStatutColor(projet.statut)}>{projet.statut.replace('_', ' ')}</Badge>
            {projet.priorite && <Badge className={getPrioriteColor(projet.priorite)}>{projet.priorite}</Badge>}
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{projet.nom}</h1>
            <p className="text-muted-foreground">Suivi budgétaire et analytique du projet.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>Retour aux projets</Button>
          {onEdit && <Button variant="outline" onClick={onEdit}><Edit2 className="mr-2 h-4 w-4" />Modifier</Button>}
          {onDelete && <Button variant="outline" onClick={onDelete}><Trash2 className="mr-2 h-4 w-4" />Supprimer</Button>}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Budget alloué</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">{projet.budgetAlloue.toLocaleString()} €</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Budget consommé</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">{projet.budgetConsomme.toLocaleString()} €</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Budget disponible</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">{budgetDisponible.toLocaleString()} €</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Avancement</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">{projet.tauxAvancement}%</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Suivi d'exécution</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Progress value={projet.tauxAvancement} className="h-3" />
          <p className="text-sm text-muted-foreground">Consommation budgétaire estimée: {tauxConsommation.toFixed(0)}%</p>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Informations générales</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground"><User className="h-4 w-4" /><span>Responsable</span></div>
            <p className="font-medium">{projet.responsable || '-'}</p>
            <div className="flex items-center gap-2 text-muted-foreground"><Calendar className="h-4 w-4" /><span>Période</span></div>
            <p className="font-medium">{format(new Date(projet.dateDebut), 'dd/MM/yyyy')} - {format(new Date(projet.dateFin), 'dd/MM/yyyy')}</p>
            <div className="flex items-center gap-2 text-muted-foreground"><Wallet className="h-4 w-4" /><span>Type / Priorité</span></div>
            <p className="font-medium">{projet.typeProjet || '-'} / {projet.priorite || '-'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Description</CardTitle></CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{projet.description || 'Aucune description fournie.'}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
