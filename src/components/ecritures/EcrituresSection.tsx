import { BookOpen, Plus, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatMontant, formatDate } from '@/lib/snapshot-utils';
import type { EcritureComptable } from '@/types/ecriture-comptable.types';

interface EcrituresSectionProps {
  ecritures: EcritureComptable[];
  isLoading: boolean;
  onGenerate?: () => void;
  isGenerating?: boolean;
}

export const EcrituresSection = ({
  ecritures,
  isLoading,
  onGenerate,
  isGenerating
}: EcrituresSectionProps) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Écritures comptables
            <Badge variant="secondary">{ecritures.length}</Badge>
          </CardTitle>
          {ecritures.length === 0 && onGenerate && (
            <Button
              size="sm"
              variant="outline"
              onClick={onGenerate}
              disabled={isGenerating}
            >
              <Plus className="h-4 w-4 mr-2" />
              {isGenerating ? 'Génération...' : 'Générer les écritures'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement...</p>
        ) : ecritures.length === 0 ? (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>
              Aucune écriture comptable générée pour cette opération.
              {onGenerate && ' Cliquez sur le bouton ci-dessus pour les générer.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {ecritures.map((ecriture) => (
              <div
                key={ecriture.id}
                className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        Ligne {ecriture.numeroLigne}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(ecriture.dateEcriture)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {ecriture.libelle}
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Débit: </span>
                        <span className="font-medium">
                          {ecriture.compteDebit?.numero} {ecriture.compteDebit?.libelle}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Crédit: </span>
                        <span className="font-medium">
                          {ecriture.compteCredit?.numero} {ecriture.compteCredit?.libelle}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">
                      {formatMontant(ecriture.montant)}
                    </p>
                    {ecriture.regleComptable && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {ecriture.regleComptable.nom}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
