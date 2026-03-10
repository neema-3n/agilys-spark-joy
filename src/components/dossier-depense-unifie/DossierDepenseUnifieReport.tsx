import { useMemo, useState } from 'react';
import { AlertCircle, Download, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDossierDepenseUnifie } from '@/hooks/useDossierDepenseUnifie';
import type { DossierDepenseDetailLevel } from '@/types/dossier-depense-unifie.types';

const formatMontant = (value: number): string =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(value);

export const DossierDepenseUnifieReport = () => {
  const [depenseId, setDepenseId] = useState('');
  const [exerciceId, setExerciceId] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [detailLevel, setDetailLevel] = useState<DossierDepenseDetailLevel>('standard');

  const filters = useMemo(
    () => ({
      exerciceId: exerciceId.trim() || undefined,
      dateDebut: dateDebut || undefined,
      dateFin: dateFin || undefined,
      detailLevel
    }),
    [dateDebut, dateFin, detailLevel, exerciceId]
  );

  const { dossier, isLoading, error, exportDossier, isExporting, exportError } = useDossierDepenseUnifie(depenseId, filters);

  const onExport = async (format: 'pdf' | 'zip') => {
    if (!depenseId.trim()) {
      return;
    }

    await exportDossier(format);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Dossier de depense unifie (probatoire)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">Depense ID</label>
            <Input value={depenseId} onChange={(event) => setDepenseId(event.target.value)} placeholder="UUID depense" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Exercice ID (optionnel)</label>
            <Input value={exerciceId} onChange={(event) => setExerciceId(event.target.value)} placeholder="UUID exercice" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Niveau detail</label>
            <Select value={detailLevel} onValueChange={(value) => setDetailLevel(value as DossierDepenseDetailLevel)}>
              <SelectTrigger>
                <SelectValue placeholder="Niveau de detail" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="full">Complet (audit)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Date debut (optionnel)</label>
            <Input type="date" value={dateDebut} onChange={(event) => setDateDebut(event.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Date fin (optionnel)</label>
            <Input type="date" value={dateFin} onChange={(event) => setDateFin(event.target.value)} />
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={() => onExport('pdf')} disabled={!depenseId.trim() || isExporting} className="gap-2">
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Export PDF
            </Button>
            <Button variant="outline" onClick={() => onExport('zip')} disabled={!depenseId.trim() || isExporting} className="gap-2">
              <Download className="h-4 w-4" />
              Export ZIP
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement du dossier de depense...
        </div>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{(error as Error).message}</AlertDescription>
        </Alert>
      ) : null}

      {exportError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{(exportError as Error).message}</AlertDescription>
        </Alert>
      ) : null}

      {dossier ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Depense</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <p className="font-semibold">{dossier.depense.numero}</p>
                <p className="text-xs text-muted-foreground">{dossier.depense.objet}</p>
                <Badge variant="secondary">{dossier.depense.statut}</Badge>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Montant</CardTitle>
              </CardHeader>
              <CardContent className="text-xl font-semibold">{formatMontant(dossier.depense.montant)}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Montant paye</CardTitle>
              </CardHeader>
              <CardContent className="text-xl font-semibold">{formatMontant(dossier.depense.montantPaye)}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Preuves manquantes</CardTitle>
              </CardHeader>
              <CardContent className="text-xl font-semibold">{dossier.synthese.indicateurs.preuvesManquantes}</CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Timeline chaine depense</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Horodatage</TableHead>
                    <TableHead>Etape</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Acteur</TableHead>
                    <TableHead>Correlation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dossier.timeline.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>{event.timestamp}</TableCell>
                      <TableCell>{event.label}</TableCell>
                      <TableCell>{event.status || '-'}</TableCell>
                      <TableCell>{event.actor?.userId || '-'}</TableCell>
                      <TableCell className="font-mono text-xs">{event.correlationId}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Preuves</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Valeur</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dossier.preuves.map((preuve) => (
                      <TableRow key={preuve.id}>
                        <TableCell>{preuve.type}</TableCell>
                        <TableCell>{preuve.source}</TableCell>
                        <TableCell>
                          {preuve.value}
                          {preuve.missing ? <Badge variant="destructive" className="ml-2">manquante</Badge> : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Synthese ecarts et controles</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Controles</h4>
                  {dossier.synthese.controles.map((controle) => (
                    <div key={controle.code} className="rounded border p-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span>{controle.label}</span>
                        <Badge variant={controle.status === 'ok' ? 'secondary' : 'destructive'}>{controle.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{controle.detail}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Ecarts</h4>
                  {dossier.synthese.ecarts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucun ecart detecte.</p>
                  ) : (
                    dossier.synthese.ecarts.map((ecart) => (
                      <div key={ecart.code} className="rounded border p-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span>{ecart.label}</span>
                          <Badge variant={ecart.severity === 'medium' ? 'destructive' : 'outline'}>{ecart.severity}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{ecart.detail}</p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
};
