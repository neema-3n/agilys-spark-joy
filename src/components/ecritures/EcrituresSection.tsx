import { BookOpen, Plus, AlertCircle, XCircle } from 'lucide-react';
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

// Grouper les écritures avec leurs contrepassations
function groupEcritures(ecritures: EcritureComptable[]) {
  const grouped: Array<{
    origine: EcritureComptable;
    contrepassation?: EcritureComptable;
  }> = [];

  // Identifier les écritures d'origine (validée sans ecritureOrigineId)
  const origines = ecritures.filter(
    e => e.statutEcriture === 'validee' && !e.ecritureOrigineId
  );

  origines.forEach(origine => {
    // Trouver sa contrepassation
    const contrepassation = ecritures.find(
      e => e.statutEcriture === 'contrepassation' && e.ecritureOrigineId === origine.id
    );

    grouped.push({ origine, contrepassation });
  });

  return grouped;
}

export const EcrituresSection = ({
  ecritures,
  isLoading,
  onGenerate,
  isGenerating
}: EcrituresSectionProps) => {
  const groupedEcritures = groupEcritures(ecritures);

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
          <div className="space-y-3">
            {groupedEcritures.map(({ origine, contrepassation }) => (
              <div key={origine.id} className="space-y-2">
                {/* Écriture d'origine */}
                <div className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          Validée
                        </Badge>
                        <span className="text-sm font-medium">
                          Ligne {origine.numeroLigne}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(origine.dateEcriture)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {origine.libelle}
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Débit: </span>
                          <span className="font-medium">
                            {origine.compteDebit?.numero} {origine.compteDebit?.libelle}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Crédit: </span>
                          <span className="font-medium">
                            {origine.compteCredit?.numero} {origine.compteCredit?.libelle}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">
                        {formatMontant(origine.montant)}
                      </p>
                      {origine.regleComptable && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {origine.regleComptable.nom}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Écriture de contrepassation */}
                {contrepassation && (
                  <div className="pl-6 border-l-2 border-destructive">
                    <div className="p-3 rounded-lg border border-destructive/50 bg-destructive/5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="destructive" className="text-xs">
                              <XCircle className="h-3 w-3 mr-1" />
                              Annulation
                            </Badge>
                            <span className="text-sm font-medium">
                              Ligne {contrepassation.numeroLigne}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(contrepassation.dateEcriture)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {contrepassation.libelle}
                          </p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">Débit: </span>
                              <span className="font-medium">
                                {contrepassation.compteDebit?.numero} {contrepassation.compteDebit?.libelle}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Crédit: </span>
                              <span className="font-medium">
                                {contrepassation.compteCredit?.numero} {contrepassation.compteCredit?.libelle}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-destructive">
                            {formatMontant(contrepassation.montant)}
                          </p>
                          {contrepassation.regleComptable && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {contrepassation.regleComptable.nom}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};