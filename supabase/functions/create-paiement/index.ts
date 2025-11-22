import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaiementRequest {
  depenseId: string;
  montant: number;
  datePaiement: string;
  modePaiement: string;
  referencePaiement?: string;
  observations?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: any = await req.json();
    console.log('Creating paiement:', { userId: user.id, ...body });

    const { depense_id, montant, date_paiement, mode_paiement, reference_paiement, observations } = body;

    if (!depense_id || !montant || !date_paiement || !mode_paiement) {
      return new Response(
        JSON.stringify({ error: 'Paramètres manquants' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Récupérer le client_id de l'utilisateur
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('client_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Profile error:', profileError);
      return new Response(
        JSON.stringify({ error: 'Profil utilisateur introuvable' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Récupérer l'exercice_id de la dépense
    const { data: depense, error: depenseError } = await supabase
      .from('depenses')
      .select('exercice_id, client_id')
      .eq('id', depense_id)
      .single();

    if (depenseError || !depense) {
      console.error('Depense error:', depenseError);
      return new Response(
        JSON.stringify({ error: 'Dépense introuvable' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérifier que la dépense appartient au même client
    if (depense.client_id !== profile.client_id) {
      return new Response(
        JSON.stringify({ error: 'Accès non autorisé à cette dépense' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Appeler la fonction DB pour créer le paiement avec numéro automatique
    const { data: paiement, error: paiementError } = await supabase.rpc(
      'create_paiement_with_numero',
      {
        p_client_id: profile.client_id,
        p_exercice_id: depense.exercice_id,
        p_depense_id: depense_id,
        p_montant: montant,
        p_date_paiement: date_paiement,
        p_mode_paiement: mode_paiement,
        p_reference_paiement: reference_paiement || null,
        p_observations: observations || null,
        p_user_id: user.id,
      }
    );

    if (paiementError) {
      console.error('Error creating paiement:', paiementError);
      return new Response(
        JSON.stringify({ error: paiementError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Paiement created successfully:', paiement);

    return new Response(
      JSON.stringify(paiement),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
