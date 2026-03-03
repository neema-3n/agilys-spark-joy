import { useEffect, useMemo, useState } from 'react';
import { BudgetDecisionComparison, BudgetDecisionVersion } from '@/types/budget.types';
import { budgetModificationsService } from '@/services/api/budget-modifications.service';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface BudgetDecisionCompareDialogProps {
  open: boolean;
  allocationId: string | null;
  exerciceId: string;
  onClose: () => void;
}

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString('fr-FR');
};

const formatStatus = (status: BudgetDecisionVersion['statutDecision']) =>
  status === 'validated' ? 'Validée' : 'Rejetée';

export const BudgetDecisionCompareDialog = ({
  open,
  allocationId,
  exerciceId,
  onClose
}: BudgetDecisionCompareDialogProps) => {
  const [history, setHistory] = useState<BudgetDecisionVersion[]>([]);
  const [comparison, setComparison] = useState<BudgetDecisionComparison | null>(null);
  const [selectedLeftVersion, setSelectedLeftVersion] = useState<string>('');
  const [selectedRightVersion, setSelectedRightVersion] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !allocationId) {
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const historyPayload = await budgetModificationsService.getDecisionHistory(allocationId, exerciceId);
        setHistory(historyPayload);
        if (historyPayload.length >= 2) {
          const right = historyPayload[historyPayload.length - 1];
          const left = historyPayload[historyPayload.length - 2];
          setSelectedLeftVersion(String(left.version));
          setSelectedRightVersion(String(right.version));
          const comparisonPayload = await budgetModificationsService.compareDecisionVersions(
            allocationId,
            exerciceId,
            left.version,
            right.version
          );
          setComparison(comparisonPayload);
        } else {
          setComparison(null);
          setSelectedLeftVersion('');
          setSelectedRightVersion('');
        }
      } catch (loadError) {
        const message =
          loadError instanceof Error && loadError.message.trim().length > 0
            ? loadError.message
            : "Impossible de charger l'historique des décisions";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [allocationId, exerciceId, open]);

  const runComparison = async (leftVersion: string, rightVersion: string) => {
    if (!allocationId || !leftVersion || !rightVersion) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const payload = await budgetModificationsService.compareDecisionVersions(
        allocationId,
        exerciceId,
        Number(leftVersion),
        Number(rightVersion)
      );
      setComparison(payload);
    } catch (compareError) {
      const message =
        compareError instanceof Error && compareError.message.trim().length > 0
          ? compareError.message
          : 'Comparaison impossible';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const differences = useMemo(() => {
    if (!comparison) {
      return [];
    }

    return Object.entries(comparison.differences).map(([field, values]) => ({ field, ...values }));
  }, [comparison]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Historique et comparaison des décisions</DialogTitle>
        </DialogHeader>

        {loading && <div className="text-sm text-muted-foreground">Chargement…</div>}
        {error && <div className="text-sm text-destructive">{error}</div>}

        {!loading && !error && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm font-medium">Version source</p>
                <Select
                  value={selectedLeftVersion}
                  onValueChange={(value) => {
                    setSelectedLeftVersion(value);
                    void runComparison(value, selectedRightVersion);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une version" />
                  </SelectTrigger>
                  <SelectContent>
                    {history.map((entry) => (
                      <SelectItem key={`left-${entry.id}`} value={String(entry.version)}>
                        V{entry.version} · {formatStatus(entry.statutDecision)} · {formatDate(entry.horodatage)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Version cible</p>
                <Select
                  value={selectedRightVersion}
                  onValueChange={(value) => {
                    setSelectedRightVersion(value);
                    void runComparison(selectedLeftVersion, value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une version" />
                  </SelectTrigger>
                  <SelectContent>
                    {history.map((entry) => (
                      <SelectItem key={`right-${entry.id}`} value={String(entry.version)}>
                        V{entry.version} · {formatStatus(entry.statutDecision)} · {formatDate(entry.horodatage)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Historique chronologique</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Version</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Motif</TableHead>
                    <TableHead>Auteur</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>V{entry.version}</TableCell>
                      <TableCell>
                        <Badge variant={entry.statutDecision === 'validated' ? 'success' : 'destructive'}>
                          {formatStatus(entry.statutDecision)}
                        </Badge>
                      </TableCell>
                      <TableCell>{entry.motif}</TableCell>
                      <TableCell>{entry.auteur}</TableCell>
                      <TableCell>{formatDate(entry.horodatage)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Différences clés</p>
              {differences.length === 0 ? (
                <div className="text-sm text-muted-foreground">Aucune différence détectée.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Champ</TableHead>
                      <TableHead>Avant</TableHead>
                      <TableHead>Après</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {differences.map((entry) => (
                      <TableRow key={entry.field}>
                        <TableCell>{entry.field}</TableCell>
                        <TableCell>{String(entry.from)}</TableCell>
                        <TableCell>{String(entry.to)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
