import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CSVRow {
  code: string;
  intitule: string;
  terme_courant?: string;
  nb_chiffres: number;
  code_parent?: string;
}

interface EnrichedCompte extends CSVRow {
  niveau: number;
  type: string;
  categorie: string;
}

interface ImportReport {
  success: boolean;
  stats: {
    total: number;
    created: number;
    skipped: number;
    errors: Array<{ code: string; error: string }>;
  };
  byLevel: Record<number, { created: number; skipped: number }>;
}

function detectTypeAndCategorie(code: string): { type: string; categorie: string } {
  const firstDigit = parseInt(code[0]);
  const firstTwoDigits = parseInt(code.substring(0, 2));
  
  switch (firstDigit) {
    case 1:
      return { type: 'passif', categorie: 'capital' };
    
    case 2:
      return { type: 'actif', categorie: 'immobilisation' };
    
    case 3:
      return { type: 'actif', categorie: 'stock' };
    
    case 4:
      if (firstTwoDigits <= 45) {
        return { type: 'passif', categorie: 'dette' };
      } else {
        return { type: 'actif', categorie: 'creance' };
      }
    
    case 5:
      return { type: 'actif', categorie: 'tresorerie' };
    
    case 6:
      if (firstTwoDigits >= 66 && firstTwoDigits <= 67) {
        return { type: 'charge', categorie: 'financier' };
      } else {
        return { type: 'charge', categorie: 'exploitation' };
      }
    
    case 7:
      if (firstTwoDigits >= 76 && firstTwoDigits <= 77) {
        return { type: 'produit', categorie: 'financier' };
      } else {
        return { type: 'produit', categorie: 'exploitation' };
      }
    
    case 8:
      return { type: 'resultat', categorie: 'autre' };
    
    default:
      return { type: 'actif', categorie: 'autre' };
  }
}

function parseCSV(csvContent: string): CSVRow[] {
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim());
    const row: any = {};
    headers.forEach((header, i) => {
      row[header] = values[i];
    });
    
    return {
      code: row.code || '',
      intitule: row.intitule || '',
      terme_courant: row.terme_courant,
      nb_chiffres: parseInt(row.nb_chiffres || '0'),
      code_parent: row.code_parent || null,
    };
  }).filter(row => row.code && row.intitule);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { csv, clientId, skipDuplicates } = await req.json();

    if (!csv || !clientId) {
      return new Response(
        JSON.stringify({ error: 'Paramètres manquants: csv, clientId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Decode base64
    const csvContent = atob(csv);
    
    // Parse CSV
    const rows = parseCSV(csvContent);
    console.log(`Parsed ${rows.length} rows from CSV`);

    // Enrich data
    const enrichedData: EnrichedCompte[] = rows.map(row => {
      const { type, categorie } = detectTypeAndCategorie(row.code);
      return {
        ...row,
        niveau: row.nb_chiffres - 1, // 2→1, 3→2, 4→3, 5→4
        type,
        categorie,
      };
    });

    // Sort by niveau
    enrichedData.sort((a, b) => a.niveau - b.niveau);

    // Group by niveau
    const byLevel = new Map<number, EnrichedCompte[]>();
    enrichedData.forEach(compte => {
      if (!byLevel.has(compte.niveau)) {
        byLevel.set(compte.niveau, []);
      }
      byLevel.get(compte.niveau)!.push(compte);
    });

    console.log(`Grouped into ${byLevel.size} levels`);

    // Import report
    const report: ImportReport = {
      success: true,
      stats: {
        total: rows.length,
        created: 0,
        skipped: 0,
        errors: [],
      },
      byLevel: {},
    };

    // Mapping code → uuid
    const codeToUuid = new Map<string, string>();

    // Import level by level
    for (const [niveau, comptes] of Array.from(byLevel.entries()).sort((a, b) => a[0] - b[0])) {
      console.log(`Processing level ${niveau} with ${comptes.length} comptes`);
      
      report.byLevel[niveau] = { created: 0, skipped: 0 };

      for (const compte of comptes) {
        try {
          // Check if exists
          if (skipDuplicates) {
            const { data: existing } = await supabase
              .from('comptes')
              .select('id')
              .eq('numero', compte.code)
              .eq('client_id', clientId)
              .single();

            if (existing) {
              console.log(`Skipping duplicate: ${compte.code}`);
              report.stats.skipped++;
              report.byLevel[niveau].skipped++;
              codeToUuid.set(compte.code, existing.id);
              continue;
            }
          }

          // Resolve parent_id
          let parentId = null;
          if (compte.code_parent && codeToUuid.has(compte.code_parent)) {
            parentId = codeToUuid.get(compte.code_parent);
          }

          // Insert
          const { data: inserted, error } = await supabase
            .from('comptes')
            .insert({
              client_id: clientId,
              numero: compte.code,
              libelle: compte.intitule,
              type: compte.type,
              categorie: compte.categorie,
              niveau: compte.niveau,
              parent_id: parentId,
              statut: 'actif',
            })
            .select('id')
            .single();

          if (error) throw error;

          codeToUuid.set(compte.code, inserted.id);
          report.stats.created++;
          report.byLevel[niveau].created++;
          
        } catch (error: any) {
          console.error(`Error inserting ${compte.code}:`, error);
          report.stats.errors.push({
            code: compte.code,
            error: error.message,
          });
        }
      }
    }

    console.log(`Import completed: ${report.stats.created} created, ${report.stats.skipped} skipped, ${report.stats.errors.length} errors`);

    return new Response(
      JSON.stringify(report),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Import error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
