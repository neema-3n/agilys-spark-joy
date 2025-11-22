import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useFactures } from '@/hooks/useFactures';
import { useDepenses } from '@/hooks/useDepenses';
import { CheckCircle2, Clock, Euro, FileText, AlertCircle } from 'lucide-react';
import { formatMontant, formatDate } from '@/lib/snapshot-utils';
import { toast } from 'sonner';

const Paiements = () => {
  const { factures, marquerPayee } = useFactures();
  const { depenses, validerDepense, ordonnancerDepense, payerDepense } = useDepenses();
  
  const [loadingFacture, setLoadingFacture] = useState<string | null>(null);
  const [loadingDepense, setLoadingDepense] = useState<string | null>(null);

  // Factures validées non encore payées
  const facturesAPayer = factures.filter(f => f.statut === 'validee');
  
  // Dépenses à ordonnancer (validées)
  const depensesAOrdonnancer = depenses.filter(d => d.statut === 'validee');
  
  // Dépenses ordonnancées à payer
  const depensesAPayer = depenses.filter(d => d.statut === 'ordonnancee');

  const handlePayerFacture = async (id: string) => {
    try {
      setLoadingFacture(id);
      await marquerPayee(id);
      toast.success('Facture marquée comme payée');
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingFacture(null);
    }
  };

  const handleOrdonnancerDepense = async (id: string) => {
    try {
      setLoadingDepense(id);
      await ordonnancerDepense(id);
      toast.success('Dépense ordonnancée');
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingDepense(null);
    }
  };

  const handlePayerDepense = async (id: string) => {
    try {
      setLoadingDepense(id);
      await payerDepense(id);
      toast.success('Dépense marquée comme payée');
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingDepense(null);
    }
  };

  const totalFacturesAPayer = facturesAPayer.reduce((sum, f) => sum + f.montantTTC, 0);
  const totalDepensesAOrdonnancer = depensesAOrdonnancer.reduce((sum, d) => sum + d.montant, 0);
  const totalDepensesAPayer = depensesAPayer.reduce((sum, d) => sum + d.montant, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestion des Paiements"
        description="Exécution des paiements et suivi des ordonnances"
      />
      
      <div className="px-8 space-y-6">
        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Factures à payer</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{facturesAPayer.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Total: {formatMontant(totalFacturesAPayer)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">À ordonnancer</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{depensesAOrdonnancer.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Total: {formatMontant(totalDepensesAOrdonnancer)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ordonnancées</CardTitle>
              <Euro className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{depensesAPayer.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Total: {formatMontant(totalDepensesAPayer)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Factures à payer */}
        {facturesAPayer.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Factures validées à payer ({facturesAPayer.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {facturesAPayer.map((facture) => (
                  <div
                    key={facture.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{facture.numero}</span>
                        <Badge variant="secondary">Validée</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {facture.objet}
                      </div>
                      {facture.fournisseur && (
                        <div className="text-sm text-muted-foreground">
                          Fournisseur: {facture.fournisseur.nom}
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-sm">
                        <span>Date: {formatDate(facture.dateFacture)}</span>
                        {facture.dateEcheance && (
                          <span className="text-orange-600 dark:text-orange-400">
                            Échéance: {formatDate(facture.dateEcheance)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-semibold text-lg">{formatMontant(facture.montantTTC)}</div>
                        {facture.montantLiquide > 0 && (
                          <div className="text-sm text-muted-foreground">
                            Liquidé: {formatMontant(facture.montantLiquide)}
                          </div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handlePayerFacture(facture.id)}
                        disabled={loadingFacture === facture.id}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Marquer payée
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dépenses à ordonnancer */}
        {depensesAOrdonnancer.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Dépenses à ordonnancer ({depensesAOrdonnancer.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {depensesAOrdonnancer.map((depense) => (
                  <div
                    key={depense.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{depense.numero}</span>
                        <Badge variant="secondary">Validée</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {depense.objet}
                      </div>
                      {depense.beneficiaire && (
                        <div className="text-sm text-muted-foreground">
                          Bénéficiaire: {depense.beneficiaire}
                        </div>
                      )}
                      {depense.fournisseur && (
                        <div className="text-sm text-muted-foreground">
                          Fournisseur: {depense.fournisseur.nom}
                        </div>
                      )}
                      <div className="text-sm">
                        Date: {formatDate(depense.dateDepense)}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-semibold text-lg">{formatMontant(depense.montant)}</div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleOrdonnancerDepense(depense.id)}
                        disabled={loadingDepense === depense.id}
                      >
                        <Clock className="h-4 w-4 mr-2" />
                        Ordonnancer
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dépenses ordonnancées à payer */}
        {depensesAPayer.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Euro className="h-5 w-5" />
                Dépenses ordonnancées à payer ({depensesAPayer.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {depensesAPayer.map((depense) => (
                  <div
                    key={depense.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{depense.numero}</span>
                        <Badge>Ordonnancée</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {depense.objet}
                      </div>
                      {depense.beneficiaire && (
                        <div className="text-sm text-muted-foreground">
                          Bénéficiaire: {depense.beneficiaire}
                        </div>
                      )}
                      {depense.fournisseur && (
                        <div className="text-sm text-muted-foreground">
                          Fournisseur: {depense.fournisseur.nom}
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-sm">
                        <span>Date: {formatDate(depense.dateDepense)}</span>
                        {depense.dateOrdonnancement && (
                          <span className="text-blue-600 dark:text-blue-400">
                            Ordonnancée le: {formatDate(depense.dateOrdonnancement)}
                          </span>
                        )}
                      </div>
                      {depense.modePaiement && (
                        <div className="text-sm text-muted-foreground">
                          Mode: {depense.modePaiement}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-semibold text-lg">{formatMontant(depense.montant)}</div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handlePayerDepense(depense.id)}
                        disabled={loadingDepense === depense.id}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Marquer payée
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* État vide */}
        {facturesAPayer.length === 0 && 
         depensesAOrdonnancer.length === 0 && 
         depensesAPayer.length === 0 && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center space-y-4">
                <CheckCircle2 className="h-16 w-16 mx-auto text-green-500" />
                <div>
                  <h3 className="text-lg font-semibold mb-2">Aucun paiement en attente</h3>
                  <p className="text-muted-foreground">
                    Toutes les factures et dépenses sont à jour.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Paiements;
