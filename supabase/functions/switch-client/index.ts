import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SwitchClientRequest {
  clientId: string;
}

/**
 * Pose le client actif de l'utilisateur dans app_metadata.
 *
 * Pourquoi une edge function plutôt qu'un simple update côté client :
 * app_metadata n'est modifiable qu'avec la clé service_role, qui ne doit
 * jamais atteindre le navigateur. C'est précisément ce qui rend la valeur
 * digne de confiance — un utilisateur ne peut pas se déclarer membre d'un
 * client, contrairement à user_metadata qu'il peut écrire lui-même.
 *
 * L'appartenance est revérifiée ici, côté serveur : le clientId reçu n'est
 * qu'une demande, jamais une autorisation.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Authentification requise' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return json({ error: 'Authentification invalide' }, 401);
    }

    const { clientId } = (await req.json()) as SwitchClientRequest;
    if (!clientId) {
      return json({ error: 'clientId manquant' }, 400);
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Le client demandé doit exister et ne pas être résilié.
    const { data: client, error: clientError } = await supabaseAdmin
      .from('clients')
      .select('id, nom, statut')
      .eq('id', clientId)
      .maybeSingle();

    if (clientError) {
      return json({ error: clientError.message }, 500);
    }
    if (!client) {
      return json({ error: 'Client introuvable' }, 404);
    }
    if (client.statut === 'resilie') {
      return json({ error: `L'abonnement de ${client.nom} est résilié.` }, 403);
    }

    // L'appartenance fait foi. Un super_admin en est dispensé : il accède aux
    // clients en prise en main, ce que la base journalise de son côté.
    const { data: membership } = await supabaseAdmin
      .from('user_clients')
      .select('role')
      .eq('user_id', user.id)
      .eq('client_id', clientId)
      .eq('statut', 'actif')
      .maybeSingle();

    let isTakeover = false;

    if (!membership) {
      const { data: globalRoles } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const isSuperAdmin = globalRoles?.some((r) => r.role === 'super_admin') ?? false;
      if (!isSuperAdmin) {
        return json({ error: 'Vous n\'avez pas accès à ce client.' }, 403);
      }
      isTakeover = true;
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      app_metadata: { active_client_id: clientId },
    });

    if (updateError) {
      return json({ error: updateError.message }, 500);
    }

    console.log(
      `switch-client: ${user.email} -> ${clientId}${isTakeover ? ' (prise en main)' : ''}`,
    );

    return json({
      success: true,
      clientId,
      nom: client.nom,
      role: membership?.role ?? 'super_admin',
      isTakeover,
      // Le frontend DOIT rafraîchir la session : le jeton en cours porte
      // encore l'ancien client, et la RLS répondrait pour celui-là.
      requiresSessionRefresh: true,
    });
  } catch (error) {
    console.error('switch-client:', error);
    return json(
      { error: error instanceof Error ? error.message : 'Erreur inattendue' },
      500,
    );
  }
});
