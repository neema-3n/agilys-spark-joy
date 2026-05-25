import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type AppRole = 'super_admin' | 'admin_client' | 'directeur_financier' | 'chef_service' | 'comptable' | 'operateur_saisie';

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

    const { id } = await req.json() as { id?: string };
    if (!id) {
      throw new Error('L’identifiant de la dépense est requis.');
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('client_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('Profil utilisateur introuvable.');
    }

    const { data: roles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (rolesError) {
      throw new Error(rolesError.message);
    }

    const { data: depense, error: depenseError } = await supabaseAdmin
      .from('depenses')
      .select('id, client_id, statut')
      .eq('id', id)
      .single();

    if (depenseError || !depense) {
      throw new Error('Dépense introuvable.');
    }

    const isSuperAdmin = (roles || []).some(({ role }) => role === 'super_admin');
    if (!isSuperAdmin && depense.client_id !== profile.client_id) {
      throw new Error('Accès interdit à cette dépense.');
    }

    if (depense.statut !== 'brouillon') {
      throw new Error('Seules les dépenses brouillon peuvent être supprimées.');
    }

    const { error: deleteError } = await supabaseAdmin
      .from('depenses')
      .delete()
      .eq('id', id);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    return new Response(
      JSON.stringify({ success: true, id }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in delete-depense function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue';

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
