import { requestJson } from '@/services/api/api-utils';

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

const encodeUtf8ToBase64 = (content: string): string => {
  const encoded = encodeURIComponent(content).replace(/%([0-9A-F]{2})/g, (_match, p1: string) =>
    String.fromCharCode(Number.parseInt(p1, 16))
  );
  return btoa(encoded);
};

export const importComptesService = {
  async importFromCSV(file: File, _clientId: string, skipDuplicates: boolean = true): Promise<ImportReport> {
    const csvContent = await file.text();
    const base64 = encodeUtf8ToBase64(csvContent);

    return requestJson<ImportReport>(
      '/comptes/import-csv',
      {
        method: 'POST',
        body: JSON.stringify({
          csv: base64,
          skipDuplicates
        })
      },
      "Erreur lors de l'import"
    );
  },

  async validateCSVFormat(file: File): Promise<CSVValidation> {
    try {
      const text = await file.text();
      const lines = text.trim().split('\n');

      if (lines.length < 2) {
        return { valid: false, errors: ['Le fichier CSV est vide'] };
      }

      const headers = lines[0].split(',').map((header) => header.trim());
      const requiredHeaders = ['code', 'intitule', 'nb_chiffres'];
      const missingHeaders = requiredHeaders.filter((header) => !headers.includes(header));

      if (missingHeaders.length > 0) {
        return {
          valid: false,
          errors: [`Colonnes manquantes: ${missingHeaders.join(', ')}`]
        };
      }

      const preview = lines.slice(1, 11).map((line) => {
        const values = line.split(',').map((value) => value.trim());
        const row: Record<string, string> = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        return row;
      });

      return { valid: true, errors: [], preview };
    } catch (error) {
      return {
        valid: false,
        errors: ['Erreur de lecture du fichier: ' + (error instanceof Error ? error.message : 'inconnue')]
      };
    }
  }
};
