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

    // Simulate smooth progress while waiting
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 10;
      });
    }, 500);

    try {
      setProgress(30);
      const importReport = await importComptesService.importFromCSV(
        file,
        currentClient.id,
        skipDuplicates
      );
      
      clearInterval(progressInterval);
      setProgress(100);
      setReport(importReport);
      setPhase('success');
      
      toast({
        title: 'Import réussi',
        description: `${importReport.stats.created} comptes importés avec succès`,
      });
      
    } catch (err: any) {
      clearInterval(progressInterval);
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
                <strong>Import terminé</strong>
                <div className="mt-2 space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-green-600 dark:text-green-400">✅ {report.stats.created} comptes créés</span>
                  </div>
                  {report.stats.skipped > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-orange-600 dark:text-orange-400">⏭️ {report.stats.skipped} comptes ignorés (déjà existants)</span>
                    </div>
                  )}
                  {report.stats.errors.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-destructive">❌ {report.stats.errors.length} comptes en erreur</span>
                    </div>
                  )}
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
                  <AccordionTrigger className="text-destructive">
                    ⚠️ Erreurs ({report.stats.errors.length})
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground mb-3">
                        Les comptes suivants n'ont pas pu être importés :
                      </p>
                      <div className="max-h-60 overflow-y-auto space-y-3">
                        {(() => {
                          // Group errors by type
                          const missingParentErrors: Record<string, string[]> = {};
                          const duplicatesByCode = new Map<string, Set<number>>();
                          const otherErrors: Array<{ code: string; error: string }> = [];
                          
                          report.stats.errors.forEach((error) => {
                            const missingParentMatch = error.error.match(/Compte parent (\d+) inexistant/);
                            const duplicateMatch = error.error.match(/Compte en double dans le fichier CSV \(ligne (\d+) et ligne (\d+)\)/);
                            
                            if (missingParentMatch) {
                              const parentCode = missingParentMatch[1];
                              if (!missingParentErrors[parentCode]) {
                                missingParentErrors[parentCode] = [];
                              }
                              missingParentErrors[parentCode].push(error.code);
                            } else if (duplicateMatch) {
                              const line1 = parseInt(duplicateMatch[1]);
                              const line2 = parseInt(duplicateMatch[2]);
                              
                              if (!duplicatesByCode.has(error.code)) {
                                duplicatesByCode.set(error.code, new Set());
                              }
                              duplicatesByCode.get(error.code)!.add(line1);
                              duplicatesByCode.get(error.code)!.add(line2);
                            } else {
                              otherErrors.push(error);
                            }
                          });

                          const elements: React.ReactNode[] = [];
                          
                          // Display grouped missing parent errors
                          Object.entries(missingParentErrors).forEach(([parentCode, childCodes]) => {
                            elements.push(
                              <div key={`parent-${parentCode}`} className="p-3 bg-destructive/10 rounded border border-destructive/20">
                                <p className="font-medium text-destructive mb-2">
                                  Compte parent {parentCode} inexistant
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Comptes concernés ({childCodes.length}) : {childCodes.sort().join(', ')}
                                </p>
                              </div>
                            );
                          });
                          
                          // Display duplicate errors (grouped by account code)
                          duplicatesByCode.forEach((lines, code) => {
                            const sortedLines = Array.from(lines).sort((a, b) => a - b);
                            elements.push(
                              <div key={`dup-${code}`} className="p-3 bg-destructive/10 rounded border border-destructive/20">
                                <p className="font-medium text-destructive mb-2">
                                  Compte {code} en double dans le fichier CSV
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Lignes {sortedLines.join(', ')}
                                </p>
                              </div>
                            );
                          });
                          
                          // Display other errors
                          otherErrors.forEach((error) => {
                            elements.push(
                              <div key={error.code} className="p-3 bg-destructive/10 rounded border border-destructive/20">
                                <p className="font-medium text-destructive mb-2">
                                  {error.error}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Compte : {error.code}
                                </p>
                              </div>
                            );
                          });
                          
                          return elements;
                        })()}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
            
            {report.stats.errors.length > 0 && (
              <div className="flex justify-end">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    // Group errors for better readability
                    const csvLines: string[] = ['Code,Type d\'erreur,Détails'];
                    
                    // Track which errors we've already processed
                    const processedMissingParents = new Set<string>();
                    const duplicatesByCode = new Map<string, Set<number>>();
                    const otherErrors: Array<{ code: string; error: string }> = [];
                    
                    report.stats.errors.forEach((error) => {
                      // Handle missing parent errors
                      const missingParentMatch = error.error.match(/Compte parent (\d+) inexistant/);
                      if (missingParentMatch) {
                        const parentCode = missingParentMatch[1];
                        if (!processedMissingParents.has(parentCode)) {
                          // Find all children with this missing parent
                          const affectedCodes = report.stats.errors
                            .filter(e => e.error.includes(`Compte parent ${parentCode} inexistant`))
                            .map(e => e.code)
                            .sort();
                          
                          csvLines.push(`"${affectedCodes.join(', ')}","Parent manquant","Compte parent ${parentCode} inexistant"`);
                          processedMissingParents.add(parentCode);
                        }
                        return;
                      }
                      
                      // Handle duplicate errors - collect all lines for each code
                      const duplicateMatch = error.error.match(/Compte en double dans le fichier CSV \(ligne (\d+) et ligne (\d+)\)/);
                      if (duplicateMatch) {
                        const line1 = parseInt(duplicateMatch[1]);
                        const line2 = parseInt(duplicateMatch[2]);
                        
                        if (!duplicatesByCode.has(error.code)) {
                          duplicatesByCode.set(error.code, new Set());
                        }
                        duplicatesByCode.get(error.code)!.add(line1);
                        duplicatesByCode.get(error.code)!.add(line2);
                        return;
                      }
                      
                      // Handle other errors
                      otherErrors.push({ code: error.code, error: error.error });
                    });
                    
                    // Add duplicate errors (one line per code with all lines sorted)
                    duplicatesByCode.forEach((lines, code) => {
                      const sortedLines = Array.from(lines).sort((a, b) => a - b);
                      csvLines.push(`"${code}","Doublon","Compte en double (lignes ${sortedLines.join(', ')})"`);
                    });
                    
                    // Add other errors
                    otherErrors.forEach(({ code, error }) => {
                      csvLines.push(`"${code}","Erreur","${error.replace(/"/g, '""')}"`);
                    });
                    
                    const csvContent = csvLines.join('\n');
                    
                    // Create and download file
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = `erreurs_import_${new Date().toISOString().split('T')[0]}.csv`;
                    link.click();
                    URL.revokeObjectURL(link.href);
                  }}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Télécharger le log des erreurs
                </Button>
              </div>
            )}
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
              Terminer
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
