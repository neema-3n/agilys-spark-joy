import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { PaiementStats } from '@/components/paiements/PaiementStats';
import { PaiementTable } from '@/components/paiements/PaiementTable';
import { usePaiements } from '@/hooks/usePaiements';
import { Button } from '@/components/ui/button';
import { ListLayout } from '@/components/lists/ListLayout';
import { ListToolbar } from '@/components/lists/ListToolbar';
import { ListPageLoading } from '@/components/lists/ListPageLoading';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import type { StatutPaiement } from '@/types/paiement.types';
import {
  buildPaiementMotifSubmission,
  filterPaiements,
  getPaiementFilterOptions,
  getPaiementMotifDialogCopy,
  openPaiementMotifDialog,
  resetPaiementMotifDialog,
} from '@/lib/paiement-page';
import { paiementStatusLabels } from '@/lib/paiement-workflow';
import { CashRiskBlockedPanel } from '@/components/shared/CashRiskBlockedPanel';
import { WorkflowExceptionRequestDialog } from '@/components/workflow-exceptions/WorkflowExceptionRequestDialog';

export default function Paiements() {
  const {
    paiements,
    isLoading,
    accepterPaiement,
    executerPaiement,
    reconcilierPaiement,
    rejeterPaiement,
    annulerPaiement,
    reprendrePaiement,
    cashRiskBlocked,
    clearCashRiskBlocked,
  } = usePaiements();
  const [search, setSearch] = useState('');
  const [statutFilter, setStatutFilter] = useState<'tous' | StatutPaiement>('tous');
  const [motifDialogState, setMotifDialogState] = useState(resetPaiementMotifDialog);
  const [exceptionDialogOpen, setExceptionDialogOpen] = useState(false);

  const filteredPaiements = useMemo(
    () => filterPaiements(paiements, search, statutFilter),
    [paiements, search, statutFilter]
  );
  const motifDialogCopy = getPaiementMotifDialogCopy(motifDialogState.pendingAction);

  const openMotifDialog = (id: string, action: 'annuler' | 'rejeter') => {
    setMotifDialogState(openPaiementMotifDialog(id, action));
  };

  const resetMotifDialog = () => {
    setMotifDialogState(resetPaiementMotifDialog());
  };

  const handleConfirmMotif = async () => {
    const submission = buildPaiementMotifSubmission(motifDialogState);
    if (!submission) return;

    try {
      if (submission.action === 'annuler') {
        await annulerPaiement({ id: submission.id, payload: submission.payload });
      } else {
        await rejeterPaiement({ id: submission.id, payload: submission.payload });
      }
      resetMotifDialog();
    } catch {
      // L'erreur est déjà gérée dans le hook via toast + état de blocage cash.
    }
  };

  const handleView = (id: string) => {
    console.log('View paiement:', id);
  };

  if (isLoading) {
    return (
      <ListPageLoading
        title="Historique des Paiements"
        description="Consultation de tous les paiements effectués"
        stickyHeader={false}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Historique des Paiements" description="Consultation de tous les paiements effectués" sticky={false} />

      <div className="px-8 space-y-6">
        {cashRiskBlocked ? (
          <CashRiskBlockedPanel
            info={cashRiskBlocked}
            onDismiss={clearCashRiskBlocked}
            onRequestException={() => setExceptionDialogOpen(true)}
          />
        ) : null}

        <PaiementStats paiements={paiements} />

        <ListLayout
          title="Liste des paiements"
          description="Recherche et filtres sur l'historique des paiements"
          toolbar={
            <ListToolbar
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Rechercher par numéro, dépense ou référence..."
              filters={[
                <DropdownMenu key="statut">
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      Statut: {statutFilter === 'tous' ? 'Tous' : paiementStatusLabels[statutFilter]}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {getPaiementFilterOptions().map((option) => (
                      <DropdownMenuItem
                        key={option.value}
                        onClick={() => setStatutFilter(option.value as 'tous' | StatutPaiement)}
                      >
                        {option.label}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setStatutFilter('tous')}>Réinitialiser</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>,
              ]}
            />
          }
        >
          <PaiementTable
            paiements={filteredPaiements}
            onView={handleView}
            onAccepter={(id) => void accepterPaiement(id).catch(() => undefined)}
            onExecuter={(id) => void executerPaiement(id).catch(() => undefined)}
            onReconcilier={(id) => void reconcilierPaiement(id).catch(() => undefined)}
            onRejeter={(id) => openMotifDialog(id, 'rejeter')}
            onAnnuler={(id) => openMotifDialog(id, 'annuler')}
            onReprendre={(id) => void reprendrePaiement({ id }).catch(() => undefined)}
            stickyHeader
            stickyHeaderOffset={0}
            scrollContainerClassName="max-h-[calc(100vh-240px)] overflow-auto"
          />
        </ListLayout>
      </div>

      <AlertDialog
        open={motifDialogState.open}
        onOpenChange={(open) => {
          if (!open) {
            resetMotifDialog();
            return;
          }
          setMotifDialogState((current) => ({ ...current, open }));
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{motifDialogCopy.title}</AlertDialogTitle>
            <AlertDialogDescription>{motifDialogCopy.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{motifDialogCopy.label}</label>
              <Textarea
                value={motifDialogState.motif}
                onChange={(e) =>
                  setMotifDialogState((current) => ({
                    ...current,
                    motif: e.target.value,
                  }))
                }
                placeholder={motifDialogCopy.placeholder}
                rows={3}
                className="mt-1"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={resetMotifDialog}>Fermer</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmMotif} disabled={!motifDialogState.motif.trim()}>
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <WorkflowExceptionRequestDialog
        open={exceptionDialogOpen}
        onOpenChange={setExceptionDialogOpen}
        blockedInfo={cashRiskBlocked}
      />
    </div>
  );
}
