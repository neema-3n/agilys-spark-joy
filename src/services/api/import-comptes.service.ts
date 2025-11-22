import { supabase } from '@/integrations/supabase/client';

export interface ImportReport {
  success: boolean;
  stats: {
    total: number;
    created: number;
    skipped: number;
    errors: Array<{ code: string; error: string }>;
  };
  byLevel: Record<number, { created: number; skipped: number }>;
}

export interface CSVValidation {
  valid: boolean;
  errors: string[];
  preview?: Array<Record<string, string>>;
}

export const importComptesService = {
  async importFromCSV(
    file: File,
    clientId: string,
    skipDuplicates: boolean = true
  ): Promise<ImportReport> {
    try {
      const csvContent = await file.text();
      const base64 = btoa(unescape(encodeURIComponent(csvContent)));

      const { data, error } = await supabase.functions.invoke('import-plan-comptable', {
        body: {
          csv: base64,
          clientId,
          skipDuplicates,
        },
      });

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Import error:', error);
      throw new Error(error.message || 'Erreur lors de l\'import');
    }
  },

  async validateCSVFormat(file: File): Promise<CSVValidation> {
    try {
      const text = await file.text();
      const lines = text.trim().split('\n');
      
      if (lines.length < 2) {
        return { valid: false, errors: ['Le fichier CSV est vide'] };
      }

      const headers = lines[0].split(',').map(h => h.trim());
      const requiredHeaders = ['code', 'intitule', 'nb_chiffres'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

      if (missingHeaders.length > 0) {
        return {
          valid: false,
          errors: [`Colonnes manquantes: ${missingHeaders.join(', ')}`],
        };
      }

      // Preview first 10 rows
      const preview = lines.slice(1, 11).map(line => {
        const values = line.split(',').map(v => v.trim());
        const row: Record<string, string> = {};
        headers.forEach((header, i) => {
          row[header] = values[i] || '';
        });
        return row;
      });

      return { valid: true, errors: [], preview };
    } catch (error: any) {
      return {
        valid: false,
        errors: ['Erreur de lecture du fichier: ' + error.message],
      };
    }
  },
};
