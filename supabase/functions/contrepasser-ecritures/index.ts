import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ContrepassationRequest {
  typeOperation: string;
  sourceId: string;
  motifAnnulation: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { typeOperation, sourceId, motifAnnulation } = await req.json() as ContrepassationRequest;

    console.log('Contrepassation request:', { typeOperation, sourceId, motifAnnulation });

    // 1. Récupérer toutes les écritures validées de l'opération source
    const { data: ecritures, error: fetchError } = await supabase
      .from('ecritures_comptables')
      .select('*')
      .eq('source_id', sourceId)
      .eq('type_operation', typeOperation)
      .eq('statut_ecriture', 'validee');

    if (fetchError) {
      console.error('Error fetching ecritures:', fetchError);
      throw fetchError;
    }

    if (!ecritures || ecritures.length === 0) {
      console.log('No ecritures found to contrepasser');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Aucune écriture à contrepasser',
          ecritures_count: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${ecritures.length} ecritures to contrepasser`);

    // 2. Créer les écritures inverses (contrepassation)
    const contrepassations = ecritures.map((ecriture) => ({
      client_id: ecriture.client_id,
      exercice_id: ecriture.exercice_id,
      numero_piece: ecriture.numero_piece,
      numero_ligne: ecriture.numero_ligne + 1000, // Décaler pour éviter les conflits
      date_ecriture: new Date().toISOString().split('T')[0],
      compte_debit_id: ecriture.compte_credit_id, // INVERSION
      compte_credit_id: ecriture.compte_debit_id, // INVERSION
      montant: ecriture.montant,
      libelle: `Annulation: ${ecriture.libelle} - ${motifAnnulation}`,
      type_operation: ecriture.type_operation,
      source_id: ecriture.source_id,
      regle_comptable_id: ecriture.regle_comptable_id,
      statut_ecriture: 'contrepassation',
      ecriture_origine_id: ecriture.id,
      created_by: user.id,
      // Relations FK selon le type
      engagement_id: ecriture.engagement_id,
      reservation_id: ecriture.reservation_id,
      bon_commande_id: ecriture.bon_commande_id,
      facture_id: ecriture.facture_id,
      depense_id: ecriture.depense_id,
      paiement_id: ecriture.paiement_id,
    }));

    const { data: createdEcritures, error: insertError } = await supabase
      .from('ecritures_comptables')
      .insert(contrepassations)
      .select();

    if (insertError) {
      console.error('Error inserting contrepassations:', insertError);
      throw insertError;
    }

    console.log(`Created ${createdEcritures?.length || 0} contrepassations`);

    return new Response(
      JSON.stringify({ 
        success: true,
        ecritures_count: createdEcritures?.length || 0,
        ecritures: createdEcritures
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in contrepasser-ecritures:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});