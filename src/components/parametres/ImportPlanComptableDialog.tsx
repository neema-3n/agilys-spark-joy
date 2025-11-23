import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Upload, FileUp, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import { importComptesService, ImportReport } from '@/services/api/import-comptes.service';
import { useClient } from '@/contexts/ClientContext';
import { useToast } from '@/hooks/use-toast';

interface ImportPlanComptableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type ImportPhase = 'select' | 'preview' | 'importing' | 'success' | 'error';

export const ImportPlanComptableDialog = ({ open, onOpenChange, onSuccess }: ImportPlanComptableDialogProps) => {
  const { currentClient } = useClient();
  const { toast } = useToast();
  
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<ImportPhase>('select');
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [preview, setPreview] = useState<Array<Record<string, string>>>([]);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const processFile = useCallback(async (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.csv')) {
      toast({
        title: 'Format invalide',
        description: 'Veuillez sélectionner un fichier CSV',
        variant: 'destructive',
      });
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      toast({
        title: 'Fichier trop volumineux',
        description: 'La taille maximale est de 5MB',
        variant: 'destructive',
      });
      return;
    }

    setFile(selectedFile);
    
    // Validate and preview
    try {
      const validation = await importComptesService.validateCSVFormat(selectedFile);
      
      if (!validation.valid) {
        setError(validation.errors.join(', '));
        setPhase('error');
        return;
      }

      setPreview(validation.preview || []);
      setPhase('preview');
    } catch (err: any) {
      setError(err.message);
      setPhase('error');
    }
  }, [toast]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    await processFile(selectedFile);
  }, [processFile]);

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    const droppedFile = e.dataTransfer.files?.[0];
    if (!droppedFile) return;
    
    await processFile(droppedFile);
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleImport = async () => {
    if (!file || !currentClient) return;

    setPhase('importing');
    setProgress(10);

    try {
      setProgress(30);
      const importReport = await importComptesService.importFromCSV(
        file,
        currentClient.id,
        skipDuplicates
      );
      
      setProgress(100);
      setReport(importReport);
      setPhase('success');
      
      toast({
        title: 'Import réussi',
        description: `${importReport.stats.created} comptes importés avec succès`,
      });
      
    } catch (err: any) {
      console.error('Import error:', err);
      setError(err.message);
      setPhase('error');
      
      toast({
        title: 'Erreur d\'import',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  const handleClose = () => {
    setFile(null);
    setPhase('select');
    setPreview([]);
    setReport(null);
    setProgress(0);
    setError(null);
    onOpenChange(false);
  };

  const handleDownloadExample = () => {
    const link = document.createElement('a');
    link.href = '/plan_sycebnl_exemple.csv';
    link.download = 'plan_sycebnl_exemple.csv';
    link.click();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="h-5 w-5" />
            Importer le plan comptable
          </DialogTitle>
          <DialogDescription>
            Importez votre plan comptable depuis un fichier CSV (format SYSCEBNL)
          </DialogDescription>
        </DialogHeader>

        {phase === 'select' && (
          <div className="space-y-4">
            <div 
              className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <div className="text-sm text-muted-foreground mb-2">
                Glissez votre fichier CSV ici ou cliquez pour sélectionner
              </div>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={() => document.getElementById('csv-file')?.click()}
              >
                Sélectionner un fichier
              </Button>
              <input
                id="csv-file"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                Le fichier CSV doit contenir les colonnes : <strong>code</strong>, <strong>intitule</strong>, <strong>nb_chiffres</strong>
                <br />
                <Button variant="link" onClick={handleDownloadExample} className="p-0 h-auto">
                  Télécharger un exemple
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {phase === 'preview' && (
          <div className="space-y-4">
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Fichier validé : <strong>{file?.name}</strong> ({preview.length}+ lignes détectées)
              </AlertDescription>
            </Alert>

            <div>
              <Label>Aperçu des premières lignes</Label>
              <div className="border rounded-lg overflow-hidden mt-2">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      {preview[0] && Object.keys(preview[0]).map(key => (
                        <th key={key} className="px-3 py-2 text-left font-medium">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 5).map((row, i) => (
                      <tr key={i} className="border-t">
                        {Object.values(row).map((val, j) => (
                          <td key={j} className="px-3 py-2">
                            {val}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <Label>Comportement sur doublons</Label>
              <RadioGroup value={skipDuplicates ? 'skip' : 'error'} onValueChange={(v) => setSkipDuplicates(v === 'skip')} className="mt-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="skip" id="skip" />
                  <Label htmlFor="skip" className="font-normal cursor-pointer">
                    Ignorer les comptes existants (recommandé)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="error" id="error" />
                  <Label htmlFor="error" className="font-normal cursor-pointer">
                    Arrêter si un doublon est détecté
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        )}

        {phase === 'importing' && (
          <div className="space-y-4 py-8">
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <Upload className="h-8 w-8 text-primary animate-pulse" />
              </div>
              <p className="text-sm text-muted-foreground">Import en cours...</p>
            </div>
            <Progress value={progress} />
          </div>
        )}

        {phase === 'success' && report && (
          <div className="space-y-4">
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                <strong>Import réussi !</strong>
                <div className="mt-2 space-y-1 text-sm">
                  <div>✅ {report.stats.created} comptes créés</div>
                  {report.stats.skipped > 0 && <div>⚠️ {report.stats.skipped} comptes ignorés (doublons)</div>}
                  {report.stats.errors.length > 0 && <div>❌ {report.stats.errors.length} erreurs</div>}
                </div>
              </AlertDescription>
            </Alert>

            <Accordion type="single" collapsible>
              <AccordionItem value="details">
                <AccordionTrigger>Détails par niveau</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 text-sm">
                    {Object.entries(report.byLevel).map(([niveau, stats]) => (
                      <div key={niveau} className="flex justify-between">
                        <span>Niveau {niveau}:</span>
                        <span>{stats.created} créés, {stats.skipped} ignorés</span>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
              
              {report.stats.errors.length > 0 && (
                <AccordionItem value="errors">
                  <AccordionTrigger>Erreurs ({report.stats.errors.length})</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-1 text-sm text-destructive">
                      {report.stats.errors.map((err, i) => (
                        <div key={i}>
                          {err.code}: {err.error}
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          </div>
        )}

        {phase === 'error' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          {phase === 'preview' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Annuler
              </Button>
              <Button onClick={handleImport}>
                Lancer l'import
              </Button>
            </>
          )}
          {(phase === 'select' || phase === 'error') && (
            <Button variant="outline" onClick={handleClose}>
              Fermer
            </Button>
          )}
          {phase === 'success' && (
            <Button onClick={() => {
              onSuccess();
              handleClose();
            }}>
              Fermer et recharger
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
