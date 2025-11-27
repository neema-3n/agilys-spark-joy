import { Download, FileText, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

interface ExportResultsBarProps {
  resultCount: number;
  onExportCSV: () => void;
  onExportPDF: () => void;
  onPrint: () => void;
  disabled?: boolean;
}

export const ExportResultsBar = ({
  resultCount,
  onExportCSV,
  onExportPDF,
  onPrint,
  disabled = false,
}: ExportResultsBarProps) => {
  if (resultCount === 0) return null;

  const handleExportCSV = () => {
    try {
      onExportCSV();
      toast({
        title: 'Export CSV réussi',
        description: `${resultCount} ligne${resultCount > 1 ? 's' : ''} exportée${resultCount > 1 ? 's' : ''}`,
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: "Échec de l'export CSV",
        variant: 'destructive',
      });
    }
  };

  const handleExportPDF = () => {
    try {
      onExportPDF();
      toast({
        title: 'Export PDF réussi',
        description: `${resultCount} ligne${resultCount > 1 ? 's' : ''} exportée${resultCount > 1 ? 's' : ''}`,
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: "Échec de l'export PDF",
        variant: 'destructive',
      });
    }
  };

  const handlePrint = () => {
    try {
      onPrint();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: "Échec de l'impression",
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
      <p className="text-sm text-muted-foreground">
        Exporter les <span className="font-semibold text-foreground">{resultCount}</span> résultat{resultCount > 1 ? 's' : ''} filtré{resultCount > 1 ? 's' : ''}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCSV}
          disabled={disabled}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          CSV
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportPDF}
          disabled={disabled}
          className="gap-2"
        >
          <FileText className="h-4 w-4" />
          PDF
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrint}
          disabled={disabled}
          className="gap-2"
        >
          <Printer className="h-4 w-4" />
          Imprimer
        </Button>
      </div>
    </div>
  );
};
