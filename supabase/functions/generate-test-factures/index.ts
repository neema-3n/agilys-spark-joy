import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

interface GenerateTestFacturesRequest {
  count: number;
  clientId: string;
  exerciceId: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const statuts = ['brouillon', 'validee', 'payee', 'annulee'];
const objets = [
  'Fournitures de bureau',
  'Matériel informatique',
  'Prestations de service',
  'Maintenance équipements',
  'Formation professionnelle',
  'Logiciels et licences',
  'Mobilier de bureau',
  'Consommables',
  'Services de nettoyage',
  'Travaux d\'aménagement',
];

function randomDate(start: Date, end: Date): string {
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return date.toISOString().split('T')[0];
}

function randomAmount(): number {
  return Math.floor(Math.random() * 50000) + 500;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const body: GenerateTestFacturesRequest = await req.json();
    
    if (!body.count || !body.clientId || !body.exerciceId) {
      throw new Error('Champs requis manquants: count, clientId, exerciceId');
    }

    if (body.count > 1000) {
      throw new Error('Maximum 1000 factures par génération');
    }

    console.log(`Generating ${body.count} test factures...`);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Récupérer les fournisseurs existants
    const { data: fournisseurs, error: fournisseursError } = await supabaseAdmin
      .from('fournisseurs')
      .select('id')
      .eq('client_id', body.clientId)
      .limit(10);

    if (fournisseursError || !fournisseurs || fournisseurs.length === 0) {
      throw new Error('Aucun fournisseur trouvé pour ce client');
    }

    // Récupérer les lignes budgétaires existantes
    const { data: lignesBudgetaires, error: lignesError } = await supabaseAdmin
      .from('lignes_budgetaires')
      .select('id')
      .eq('client_id', body.clientId)
      .eq('exercice_id', body.exerciceId)
      .limit(10);

    if (lignesError || !lignesBudgetaires || lignesBudgetaires.length === 0) {
      throw new Error('Aucune ligne budgétaire trouvée pour cet exercice');
    }

    // Récupérer l'exercice pour les dates
    const { data: exercice, error: exerciceError } = await supabaseAdmin
      .from('exercices')
      .select('date_debut, date_fin')
      .eq('id', body.exerciceId)
      .single();

    if (exerciceError || !exercice) {
      throw new Error('Exercice non trouvé');
    }

    const startDate = new Date(exercice.date_debut);
    const endDate = new Date(exercice.date_fin);

    // Récupérer le dernier numéro de facture existant
    const { data: lastFacture } = await supabaseAdmin
      .from('factures')
      .select('numero')
      .eq('client_id', body.clientId)
      .eq('exercice_id', body.exerciceId)
      .order('numero', { ascending: false })
      .limit(1)
      .single();

    let startNumber = 1;
    if (lastFacture?.numero) {
      const match = lastFacture.numero.match(/FAC(\d+)/);
      if (match) {
        startNumber = parseInt(match[1]) + 1;
      }
    }

    console.log(`Starting from numero: FAC${String(startNumber).padStart(6, '0')}`);

    // Générer les factures
    const factures = [];
    for (let i = 0; i < body.count; i++) {
      const montantHT = randomAmount();
      const montantTVA = Math.floor(montantHT * 0.2);
      const montantTTC = montantHT + montantTVA;
      const statut = statuts[Math.floor(Math.random() * statuts.length)];
      const dateFacture = randomDate(startDate, endDate);
      
      factures.push({
        client_id: body.clientId,
        exercice_id: body.exerciceId,
        numero: `FAC${String(startNumber + i).padStart(6, '0')}`,
        date_facture: dateFacture,
        date_echeance: randomDate(new Date(dateFacture), endDate),
        fournisseur_id: fournisseurs[Math.floor(Math.random() * fournisseurs.length)].id,
        ligne_budgetaire_id: lignesBudgetaires[Math.floor(Math.random() * lignesBudgetaires.length)].id,
        objet: objets[Math.floor(Math.random() * objets.length)],
        numero_facture_fournisseur: `F-${Math.floor(Math.random() * 9999) + 1000}`,
        montant_ht: montantHT,
        montant_tva: montantTVA,
        montant_ttc: montantTTC,
        montant_liquide: statut === 'payee' ? montantTTC : 0,
        statut: statut,
        date_validation: statut !== 'brouillon' ? dateFacture : null,
        observations: Math.random() > 0.7 ? 'Facture de test générée automatiquement' : null,
        created_by: user.id,
      });
    }

    // Insérer par lots de 100
    const batchSize = 100;
    let insertedCount = 0;

    for (let i = 0; i < factures.length; i += batchSize) {
      const batch = factures.slice(i, i + batchSize);
      const { error: insertError } = await supabaseAdmin
        .from('factures')
        .insert(batch);

      if (insertError) {
        console.error('Error inserting batch:', insertError);
        throw new Error(`Erreur lors de l'insertion du lot ${i / batchSize + 1}: ${insertError.message}`);
      }

      insertedCount += batch.length;
      console.log(`Inserted ${insertedCount}/${factures.length} factures`);
    }

    console.log(`Successfully generated ${insertedCount} test factures`);

    return new Response(
      JSON.stringify({
        success: true,
        count: insertedCount,
        message: `${insertedCount} factures de test générées avec succès`,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error in generate-test-factures function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
