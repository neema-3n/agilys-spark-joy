import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, CheckSquare, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useRapprochementBancaireDetail,
  useRapprochementsBancaires,
} from '@/hooks/useRapprochementsBancaires';
import { RapprochementBancaireDialog } from './RapprochementBancaireDialog';
import type {
  CategorieEcartRapprochement,
  ManualRapprochementDecisionInput,
  RapprochementBancaireCandidate,
  RapprochementBancaireLine,
  StatutLigneRapprochement,
} from '@/types/rapprochement-bancaire.types';
import { formatCurrency } from '@/lib/utils';

const ECART_OPTIONS: Array<{ value: CategorieEcartRapprochement; label: string }> = [
  { value: 'timing', label: 'Décalage temporel' },
  { value: 'montant', label: 'Écart de montant' },
  { value: 'reference', label: 'Référence incohérente' },
  { value: 'operation_manquante', label: 'Opération manquante' },
  { value: 'anomalie_externe', label: 'Anomalie externe' },
];

type LineDecisionState = {
  candidateId?: string;
  justification: string;
  category?: CategorieEcartRapprochement;
};

const statusLabel = (status: StatutLigneRapprochement): string => {
  switch (status) {
    case 'proposition_unique':
      return 'Proposition auto';
    case 'ambigu':
      return 'Ambigu';
    case 'sans_match':
      return 'Sans match';
    case 'rapprochee_auto':
      return 'Rapproché auto';
    case 'rapprochee_manuelle':
      return 'Rapproché manuel';
    case 'ecart_qualifie':
      return 'Écart qualifié';
    default:
      return status;
  }
};

const summaryBadgeVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (status === 'valide') {
    return 'default';
  }
  if (status === 'en_attente_validation') {
    return 'secondary';
  }
  if (status === 'a_traiter') {
    return 'outline';
  }
  return 'destructive';
};

const buildDefaultState = (line: RapprochementBancaireLine): LineDecisionState => ({
  candidateId: line.candidates.find((candidate) => candidate.statut !== 'rejete')?.id,
  justification: line.motifQualification ?? '',
  category: line.categorieEcart,
});

const CandidateSummary = ({ candidate }: { candidate: RapprochementBancaireCandidate }) => {
  const numero = typeof candidate.metadata.numero === 'string' ? candidate.metadata.numero : candidate.operationTresorerieId;
  const libelle = typeof candidate.metadata.libelle === 'string' ? candidate.metadata.libelle : 'Sans libellé';
  const dateOperation = typeof candidate.metadata.dateOperation === 'string' ? candidate.metadata.dateOperation : '-';

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="font-medium">{numero}</span>
        <Badge variant={candidate.statut === 'selectionne' ? 'default' : candidate.statut === 'rejete' ? 'outline' : 'secondary'}>
          {candidate.statut}
        </Badge>
      </div>
      <div className="text-sm text-muted-foreground">{libelle}</div>
      <div className="text-xs text-muted-foreground">
        {dateOperation} • Score {candidate.score}
      </div>
      {candidate.raisons.length > 0 ? (
        <div className="text-xs text-muted-foreground">{candidate.raisons.join(' · ')}</div>
      ) : null}
    </div>
  );
};

export const RapprochementBancaireWorkspace = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string>();
  const [lineStates, setLineStates] = useState<Record<string, LineDecisionState>>({});
  const {
    rapprochements,
    isLoading,
    createRapprochement,
    createPending,
    validerRapprochement,
    validerPending,
    appliquerDecisionRapprochement,
    decisionPending,
  } = useRapprochementsBancaires();
  const detailQuery = useRapprochementBancaireDetail(selectedId);

  useEffect(() => {
    if (!selectedId && rapprochements[0]?.id) {
      setSelectedId(rapprochements[0].id);
    }
  }, [rapprochements, selectedId]);

  useEffect(() => {
    if (!detailQuery.data) {
      return;
    }

    const nextState = detailQuery.data.lines.reduce<Record<string, LineDecisionState>>((accumulator, line) => {
      accumulator[line.id] = lineStates[line.id] ?? buildDefaultState(line);
      return accumulator;
    }, {});
    setLineStates(nextState);
  }, [detailQuery.data]);

  const unresolvedCount = useMemo(() => {
    if (!detailQuery.data) {
      return 0;
    }

    return detailQuery.data.lines.filter((line) => line.statut === 'ambigu' || line.statut === 'sans_match').length;
  }, [detailQuery.data]);

  const patchLineState = (lineId: string, patch: Partial<LineDecisionState>) => {
    setLineStates((current) => ({
      ...current,
      [lineId]: {
        ...(current[lineId] ?? { justification: '' }),
        ...patch,
      },
    }));
  };

  const submitDecision = async (id: string, input: ManualRapprochementDecisionInput) => {
    await appliquerDecisionRapprochement({ id, input });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Rapprochement bancaire assisté</h3>
          <p className="text-sm text-muted-foreground">
            Propositions déterministes côté backend, arbitrage manuel audité, écarts qualifiés et supervision exploitable.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau rapprochement
        </Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Workflows de rapprochement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? <p className="text-sm text-muted-foreground">Chargement des rapprochements...</p> : null}
            {!isLoading && rapprochements.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                Aucun rapprochement créé. Lancez une première analyse à partir d’un relevé saisi.
              </div>
            ) : null}
            {rapprochements.map((rapprochement) => (
              <button
                key={rapprochement.id}
                type="button"
                className={`w-full rounded-lg border p-4 text-left transition ${
                  selectedId === rapprochement.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'
                }`}
                onClick={() => setSelectedId(rapprochement.id)}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{rapprochement.numero}</span>
                  <Badge variant={summaryBadgeVariant(rapprochement.statutDetaille)}>{rapprochement.statutDetaille}</Badge>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  {rapprochement.compte?.code ?? 'Compte'} • {rapprochement.dateDebut} → {rapprochement.dateFin}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded bg-muted/60 p-2">
                    <div className="text-muted-foreground">Lignes</div>
                    <div className="font-semibold">{rapprochement.totalLignes}</div>
                  </div>
                  <div className="rounded bg-muted/60 p-2">
                    <div className="text-muted-foreground">Auto</div>
                    <div className="font-semibold">{rapprochement.totalPropositionsAuto}</div>
                  </div>
                  <div className="rounded bg-muted/60 p-2">
                    <div className="text-muted-foreground">Écarts</div>
                    <div className="font-semibold">{rapprochement.totalEcartsQualifies}</div>
                  </div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Détail et arbitrage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {!selectedId ? <p className="text-sm text-muted-foreground">Sélectionnez un rapprochement.</p> : null}
            {selectedId && detailQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Chargement du détail...</p>
            ) : null}
            {selectedId && detailQuery.error ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                {detailQuery.error instanceof Error ? detailQuery.error.message : 'Impossible de charger le détail.'}
              </div>
            ) : null}

            {detailQuery.data ? (
              <>
                <div className="grid gap-3 md:grid-cols-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-xs text-muted-foreground">Statut détaillé</div>
                      <div className="mt-2 flex items-center gap-2 font-semibold">
                        <CheckSquare className="h-4 w-4" />
                        {detailQuery.data.statutDetaille}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-xs text-muted-foreground">Écart global</div>
                      <div className="mt-2 font-semibold">{formatCurrency(detailQuery.data.ecart)}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-xs text-muted-foreground">Lignes à traiter</div>
                      <div className="mt-2 font-semibold">{unresolvedCount}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-xs text-muted-foreground">Score moyen</div>
                      <div className="mt-2 font-semibold">{detailQuery.data.scoreGlobal ?? 0}</div>
                    </CardContent>
                  </Card>
                </div>

                <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <div className="font-medium">
                      Solde relevé {formatCurrency(detailQuery.data.soldeReleve)} • Solde comptable {formatCurrency(detailQuery.data.soldeComptable)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Validation finale possible uniquement quand les cas ambigus et sans match sont traités.
                    </div>
                  </div>
                  <Button
                    onClick={() => void validerRapprochement(detailQuery.data.id)}
                    disabled={validerPending || unresolvedCount > 0 || detailQuery.data.statut === 'valide'}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Valider le rapprochement
                  </Button>
                </div>

                <div className="space-y-4">
                  {detailQuery.data.lines.map((line) => {
                    const currentState = lineStates[line.id] ?? buildDefaultState(line);

                    return (
                      <Card key={line.id}>
                        <CardHeader className="pb-3">
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                              <CardTitle className="text-base">
                                Ligne {line.ordre} • {line.libelle}
                              </CardTitle>
                              <div className="mt-1 text-sm text-muted-foreground">
                                {line.dateOperation} • {formatCurrency(line.montant)} • {line.referenceBancaire || 'Sans référence'}
                              </div>
                            </div>
                            <Badge variant={summaryBadgeVariant(line.statut)}>
                              {statusLabel(line.statut)}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {line.reglesAppliquees.length > 0 ? (
                            <div className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
                              {line.reglesAppliquees.join(' · ')}
                            </div>
                          ) : null}

                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Candidats</TableHead>
                                <TableHead className="w-[220px]">Action</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {line.candidates.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={2} className="text-sm text-muted-foreground">
                                    Aucun candidat détecté. Qualifiez l’écart pour garder une trace exploitable.
                                  </TableCell>
                                </TableRow>
                              ) : (
                                line.candidates.map((candidate) => (
                                  <TableRow key={candidate.id}>
                                    <TableCell>
                                      <CandidateSummary candidate={candidate} />
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex flex-wrap gap-2">
                                        <Button
                                          size="sm"
                                          variant="secondary"
                                          disabled={decisionPending || candidate.statut === 'selectionne'}
                                          onClick={() =>
                                            void submitDecision(detailQuery.data.id, {
                                              lineId: line.id,
                                              action: 'select_candidate',
                                              candidateId: candidate.id,
                                              justification:
                                                currentState.justification || 'Validation manuelle du candidat proposé',
                                            })
                                          }
                                        >
                                          Accepter
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          disabled={decisionPending || candidate.statut === 'rejete' || candidate.statut === 'selectionne'}
                                          onClick={() =>
                                            void submitDecision(detailQuery.data.id, {
                                              lineId: line.id,
                                              action: 'reject_candidate',
                                              candidateId: candidate.id,
                                              justification:
                                                currentState.justification || 'Candidat rejeté après revue métier',
                                            })
                                          }
                                        >
                                          Rejeter
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>

                          {(line.statut === 'ambigu' || line.statut === 'sans_match' || line.statut === 'proposition_unique') ? (
                            <div className="grid gap-3 rounded-lg border border-dashed p-4 md:grid-cols-[1fr_220px_180px]">
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Justification manuelle</label>
                                <Textarea
                                  aria-label="Justification manuelle"
                                  value={currentState.justification}
                                  onChange={(event) => patchLineState(line.id, { justification: event.target.value })}
                                  rows={3}
                                  placeholder="Expliquez la décision ou la qualification retenue"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Catégorie d'écart</label>
                                <Select
                                  value={currentState.category}
                                  onValueChange={(value) =>
                                    patchLineState(line.id, { category: value as CategorieEcartRapprochement })
                                  }
                                >
                                  <SelectTrigger aria-label="Catégorie d'écart">
                                    <SelectValue placeholder="Choisir" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {ECART_OPTIONS.map((option) => (
                                      <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Candidat préféré</label>
                                <Select
                                  value={currentState.candidateId}
                                  onValueChange={(value) => patchLineState(line.id, { candidateId: value })}
                                >
                                  <SelectTrigger aria-label="Candidat préféré">
                                    <SelectValue placeholder="Choisir" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {line.candidates.map((candidate) => (
                                      <SelectItem key={candidate.id} value={candidate.id}>
                                        {(candidate.metadata.numero as string | undefined) ?? candidate.operationTresorerieId}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="md:col-span-3 flex flex-wrap gap-2">
                                <Button
                                  variant="secondary"
                                  disabled={decisionPending || !currentState.candidateId}
                                  onClick={() =>
                                    void submitDecision(detailQuery.data.id, {
                                      lineId: line.id,
                                      action: 'select_candidate',
                                      candidateId: currentState.candidateId,
                                      justification:
                                        currentState.justification || 'Sélection manuelle du candidat recommandé',
                                    })
                                  }
                                >
                                  Sélectionner le candidat
                                </Button>
                                <Button
                                  variant="outline"
                                  disabled={decisionPending || !currentState.category}
                                  onClick={() =>
                                    void submitDecision(detailQuery.data.id, {
                                      lineId: line.id,
                                      action: 'qualify_discrepancy',
                                      category: currentState.category,
                                      justification:
                                        currentState.justification || 'Qualification manuelle de l’écart',
                                    })
                                  }
                                >
                                  Qualifier l'écart
                                </Button>
                              </div>
                            </div>
                          ) : null}

                          {line.statut === 'ecart_qualifie' ? (
                            <div className="flex items-start gap-3 rounded-lg border border-amber-300/50 bg-amber-50 p-3 text-sm text-amber-900">
                              <AlertCircle className="mt-0.5 h-4 w-4" />
                              <div>
                                <div className="font-medium">Écart qualifié: {line.categorieEcart}</div>
                                <div>{line.motifQualification}</div>
                              </div>
                            </div>
                          ) : null}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Journal des décisions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {detailQuery.data.decisions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Aucune décision manuelle enregistrée pour le moment.</p>
                    ) : (
                      <div className="space-y-3">
                        {detailQuery.data.decisions.map((decision) => (
                          <div key={decision.id} className="rounded-lg border p-3 text-sm">
                            <div className="flex items-center justify-between gap-3">
                              <div className="font-medium">
                                {decision.action} • {decision.nextStatus}
                              </div>
                              <div className="text-xs text-muted-foreground">{decision.createdAt}</div>
                            </div>
                            <div className="mt-1 text-muted-foreground">{decision.justification}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <RapprochementBancaireDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        pending={createPending}
        onSubmit={async (data) => {
          await createRapprochement(data);
        }}
      />
    </div>
  );
};
