import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateEcrituresRequest {
  typeOperation: 'reservation' | 'engagement' | 'bon_commande' | 'facture' | 'depense' | 'paiement';
  sourceId: string;
  clientId: string;
  exerciceId: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    const authHeader = req.headers.get('Authorization')!;
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const request: GenerateEcrituresRequest = await req.json();
    const { typeOperation, sourceId, clientId, exerciceId } = request;

    console.log('Generating ecritures for:', { typeOperation, sourceId, clientId, exerciceId });

    // Récupérer les données de l'opération source
    let operationData: any = null;
    let numeroPiece = '';
    let dateOperation = '';
    let montant = 0;

    switch (typeOperation) {
      case 'reservation': {
        const { data } = await supabaseAdmin
          .from('reservations_credits')
          .select('*')
          .eq('id', sourceId)
          .single();
        operationData = data;
        numeroPiece = data?.numero || '';
        dateOperation = data?.date_reservation || '';
        montant = data?.montant || 0;
        break;
      }
      case 'engagement': {
        const { data } = await supabaseAdmin
          .from('engagements')
          .select('*')
          .eq('id', sourceId)
          .single();
        operationData = data;
        numeroPiece = data?.numero || '';
        dateOperation = data?.date_creation || '';
        montant = data?.montant || 0;
        break;
      }
      case 'bon_commande': {
        const { data } = await supabaseAdmin
          .from('bons_commande')
          .select('*')
          .eq('id', sourceId)
          .single();
        operationData = data;
        numeroPiece = data?.numero || '';
        dateOperation = data?.date_commande || '';
        montant = data?.montant || 0;
        break;
      }
      case 'facture': {
        const { data } = await supabaseAdmin
          .from('factures')
          .select('*')
          .eq('id', sourceId)
          .single();
        operationData = data;
        numeroPiece = data?.numero || '';
        dateOperation = data?.date_facture || '';
        montant = data?.montant_ttc || 0;
        break;
      }
      case 'depense': {
        const { data } = await supabaseAdmin
          .from('depenses')
          .select('*')
          .eq('id', sourceId)
          .single();
        operationData = data;
        numeroPiece = data?.numero || '';
        dateOperation = data?.date_depense || '';
        montant = data?.montant || 0;
        break;
      }
      case 'paiement': {
        const { data } = await supabaseAdmin
          .from('paiements')
          .select('*')
          .eq('id', sourceId)
          .single();
        operationData = data;
        numeroPiece = data?.numero || '';
        dateOperation = data?.date_paiement || '';
        montant = data?.montant || 0;
        break;
      }
    }

    if (!operationData) {
      return new Response(
        JSON.stringify({ error: 'Operation not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Appeler la fonction PostgreSQL pour générer les écritures
    const { data: result, error } = await supabaseAdmin.rpc('generate_ecritures_comptables', {
      p_client_id: clientId,
      p_exercice_id: exerciceId,
      p_type_operation: typeOperation,
      p_source_id: sourceId,
      p_numero_piece: numeroPiece,
      p_date_operation: dateOperation,
      p_montant: montant,
      p_operation_data: operationData,
      p_user_id: user.id,
    });

    if (error) {
      console.error('Error generating ecritures:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Ecritures generated:', result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-ecritures-comptables:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
