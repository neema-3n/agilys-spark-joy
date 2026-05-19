import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaiementRequest {
  depenseId?: string;
  engagementId?: string;
  ligneBudgetaireId?: string;
  fournisseurId?: string;
  beneficiaire?: string;
  projetId?: string;
  objet?: string;
  montant: number;
  datePaiement: string;
  modePaiement: string;
  compteTresorerieId?: string;
  statut?: string;
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

    const {
      depense_id,
      engagement_id,
      ligne_budgetaire_id,
      fournisseur_id,
      beneficiaire,
      projet_id,
      objet,
      montant,
      date_paiement,
      mode_paiement,
      compte_tresorerie_id,
      statut,
      reference_paiement,
      observations,
      client_id,
      exercice_id,
    } = body;
    const normalizedStatut = statut === 'valide' ? 'valide' : 'brouillon';

    if (!depense_id || !montant || !date_paiement || !mode_paiement) {
      return new Response(
        JSON.stringify({ error: 'Paramètres manquants' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérifier si l'utilisateur est super_admin
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isSuperAdmin = userRoles?.some(r => r.role === 'super_admin') || false;

    // Récupérer le client_id de l'utilisateur (seulement si pas super_admin)
    let userClientId = null;
    if (!isSuperAdmin) {
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
      userClientId = profile.client_id;
    }

    let paiement: any;

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

    if (!isSuperAdmin && depense.client_id !== userClientId) {
      return new Response(
        JSON.stringify({ error: 'Accès non autorisé à cette dépense' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data, error: paiementError } = await supabase.rpc(
      'create_paiement_with_numero',
      {
        p_client_id: depense.client_id,
        p_exercice_id: depense.exercice_id,
        p_depense_id: depense_id,
        p_montant: montant,
        p_date_paiement: date_paiement,
        p_mode_paiement: mode_paiement,
        p_compte_tresorerie_id: compte_tresorerie_id || null,
        p_statut: normalizedStatut,
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

    paiement = data;

    console.log('Paiement created successfully:', paiement);

    const { error: patchError } = await supabase
      .from('paiements')
      .update({
        engagement_id: engagement_id || null,
        ligne_budgetaire_id: ligne_budgetaire_id || null,
        fournisseur_id: fournisseur_id || null,
        beneficiaire: beneficiaire || null,
        projet_id: projet_id || null,
        objet: objet || null,
        compte_tresorerie_id: compte_tresorerie_id || null,
      })
      .eq('id', paiement.id);

    if (patchError) {
      console.error('Error patching paiement:', patchError);
      return new Response(
        JSON.stringify({ error: patchError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (normalizedStatut !== 'valide') {
      return new Response(
        JSON.stringify({
          ...paiement,
          statut: normalizedStatut,
          engagement_id: engagement_id || null,
          ligne_budgetaire_id: ligne_budgetaire_id || null,
          fournisseur_id: fournisseur_id || null,
          beneficiaire: beneficiaire || null,
          projet_id: projet_id || null,
          objet: objet || null,
          compte_tresorerie_id: compte_tresorerie_id || null,
        }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('create-paiement: Generating ecritures comptables');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: ecrituresResult, error: ecrituresError } = await supabaseAdmin.functions.invoke(
      'generate-ecritures-comptables',
      {
        body: {
          typeOperation: 'paiement',
          sourceId: paiement.id,
          clientId: depense.client_id,
          exerciceId: depense.exercice_id
        }
      }
    );

    if (ecrituresError) {
      console.error('create-paiement: Error generating ecritures', ecrituresError);
      throw new Error('Le paiement a ete cree mais la generation des ecritures comptables a echoue.');
    }

    if (!ecrituresResult?.success) {
      const comptaError = ecrituresResult?.error || 'Generation des ecritures comptables incomplete.';
      console.error('create-paiement: Incomplete accounting generation', ecrituresResult);
      throw new Error(comptaError);
    }

    console.log('create-paiement: Ecritures generated successfully');

    return new Response(
      JSON.stringify({
        ...paiement,
        engagement_id: engagement_id || null,
        ligne_budgetaire_id: ligne_budgetaire_id || null,
        fournisseur_id: fournisseur_id || null,
        beneficiaire: beneficiaire || null,
        projet_id: projet_id || null,
        objet: objet || null,
        compte_tresorerie_id: compte_tresorerie_id || null,
        statut: normalizedStatut,
      }),
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
