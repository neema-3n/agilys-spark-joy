import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Action = 'inviter' | 'rattacher' | 'changer_role' | 'changer_statut' | 'detacher';

interface RequestBody {
  action: Action;
  clientId: string;
  email?: string;
  nom?: string;
  prenom?: string;
  roleId?: string;
  userId?: string;
  statut?: 'actif' | 'inactif';
  /** Adresse de retour du lien d'invitation, fournie par l'application. */
  redirectTo?: string;
}

/**
 * Gestion des utilisateurs d'une organisation.
 *
 * Créer un compte exige la clé service_role, qui ne doit jamais atteindre le
 * navigateur. Le droit d'agir est revérifié ici, côté serveur : le clientId
 * reçu est une demande, jamais une autorisation.
 *
 * Aucun mot de passe ne transite : un nouvel utilisateur reçoit une invitation
 * et choisit le sien. Un administrateur n'a pas à connaître celui d'un autre.
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
    if (!authHeader) return json({ error: 'Authentification requise' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const caller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await caller.auth.getUser();
    if (authError || !user) return json({ error: 'Authentification invalide' }, 401);

    const body = (await req.json()) as RequestBody;
    const { action, clientId } = body;
    if (!action || !clientId) return json({ error: 'action et clientId sont requis' }, 400);

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    /**
     * Les erreurs d'authentification remontent en anglais et en langage
     * technique. Un administrateur qui lit « email rate limit exceeded » ne
     * peut ni comprendre ni agir : on nomme la cause et la sortie.
     */
    const traduire = (message: string) => {
      if (/rate limit/i.test(message)) {
        return (
          "Quota d'envoi d'emails atteint. Le service intégré de Supabase est limité à " +
          "quelques messages par heure. Attendez une heure, ou configurez un service " +
          "d'envoi dédié dans Supabase (Authentication → Emails → SMTP)."
        );
      }
      if (/already registered|already exists/i.test(message)) {
        return "Cette adresse a déjà un compte. Utilisez « Compte existant » pour lui donner accès.";
      }
      if (/invalid.*email|email.*invalid/i.test(message)) {
        return "Adresse email invalide.";
      }
      if (/sending.*email|smtp/i.test(message)) {
        return "L'email n'a pas pu être envoyé. Vérifiez la configuration d'envoi dans Supabase.";
      }
      return message;
    };

    // Le droit d'agir sur CETTE organisation est verifie ici, pas deduit de ce
    // que le navigateur affirme.
    const { data: estAdmin, error: droitError } = await admin.rpc('is_client_admin', {
      _user_id: user.id,
      _client_id: clientId,
    });
    if (droitError) return json({ error: droitError.message }, 500);

    const { data: rolesGlobaux } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    const estSuperAdmin = rolesGlobaux?.some((r) => r.role === 'super_admin') ?? false;

    if (!estAdmin && !estSuperAdmin) {
      return json({ error: 'Vous ne gérez pas les utilisateurs de cette organisation.' }, 403);
    }

    // Un role doit appartenir a l'organisation visee : sans cette verification,
    // un administrateur pourrait attribuer le role d'un autre client.
    const verifierRole = async (roleId: string) => {
      const { data } = await admin
        .from('roles')
        .select('id, client_id')
        .eq('id', roleId)
        .maybeSingle();
      return data?.client_id === clientId;
    };

    const trouverUtilisateurParEmail = async (email: string) => {
      const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      return data?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
    };

    switch (action) {
      case 'inviter': {
        const { email, nom, prenom, roleId } = body;
        if (!email || !roleId) return json({ error: 'email et roleId sont requis' }, 400);
        if (!(await verifierRole(roleId))) return json({ error: 'Rôle inconnu pour cette organisation' }, 400);

        const existant = await trouverUtilisateurParEmail(email);
        if (existant) {
          return json({
            error:
              'Cette adresse a déjà un compte. Utilisez « Rattacher un utilisateur existant » ' +
              'pour lui donner accès sans créer de doublon.',
          }, 409);
        }

        // Sans redirectTo, le lien pointe vers la Site URL du projet Supabase,
        // restée à sa valeur par défaut : l'invitation part et ne mène nulle
        // part. L'application fournit sa propre adresse.
        const { data: invite, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
          data: { nom: nom ?? '', prenom: prenom ?? '', client_id: clientId },
          redirectTo: body.redirectTo,
        });

        if (inviteError) return json({ error: traduire(inviteError.message) }, 500);

        const { error: lienError } = await admin.from('user_clients').insert({
          user_id: invite.user.id,
          client_id: clientId,
          role_id: roleId,
          created_by: user.id,
        });

        if (lienError) {
          // Le compte a été créé avant le rattachement : le laisser en place
          // interdirait de réessayer avec la même adresse, qui serait alors
          // « déjà connue » alors qu'elle n'a jamais reçu d'accès.
          await admin.auth.admin.deleteUser(invite.user.id);
          return json({
            error: `Le rattachement a échoué, l'invitation a été annulée : ${lienError.message}`,
          }, 500);
        }

        return json({ success: true, userId: invite.user.id, invitation: true });
      }

      case 'rattacher': {
        const { email, roleId } = body;
        if (!email || !roleId) return json({ error: 'email et roleId sont requis' }, 400);
        if (!(await verifierRole(roleId))) return json({ error: 'Rôle inconnu pour cette organisation' }, 400);

        const existant = await trouverUtilisateurParEmail(email);
        if (!existant) {
          return json({ error: 'Aucun compte ne correspond à cette adresse.' }, 404);
        }

        // L'unicite (user_id, client_id) garantit qu'un rattachement
        // supplementaire ne cree jamais de doublon d'identite.
        const { error } = await admin.from('user_clients').insert({
          user_id: existant.id,
          client_id: clientId,
          role_id: roleId,
          created_by: user.id,
        });

        if (error) {
          if (error.code === '23505') {
            return json({ error: 'Cet utilisateur a déjà accès à cette organisation.' }, 409);
          }
          return json({ error: error.message }, 500);
        }

        return json({ success: true, userId: existant.id, invitation: false });
      }

      case 'changer_role': {
        const { userId, roleId } = body;
        if (!userId || !roleId) return json({ error: 'userId et roleId sont requis' }, 400);
        if (!(await verifierRole(roleId))) return json({ error: 'Rôle inconnu pour cette organisation' }, 400);
        if (userId === user.id && !estSuperAdmin) {
          return json({ error: 'Vous ne pouvez pas modifier votre propre rôle.' }, 403);
        }

        const { error } = await admin
          .from('user_clients')
          .update({ role_id: roleId })
          .eq('user_id', userId)
          .eq('client_id', clientId);

        if (error) return json({ error: error.message }, 500);
        return json({ success: true });
      }

      case 'changer_statut': {
        const { userId, statut } = body;
        if (!userId || !statut) return json({ error: 'userId et statut sont requis' }, 400);
        if (userId === user.id) {
          return json({ error: 'Vous ne pouvez pas désactiver votre propre accès.' }, 403);
        }

        const { error } = await admin
          .from('user_clients')
          .update({ statut })
          .eq('user_id', userId)
          .eq('client_id', clientId);

        if (error) return json({ error: error.message }, 500);
        return json({ success: true });
      }

      case 'detacher': {
        const { userId } = body;
        if (!userId) return json({ error: 'userId est requis' }, 400);
        if (userId === user.id) {
          return json({ error: 'Vous ne pouvez pas retirer votre propre accès.' }, 403);
        }

        // Le compte lui-meme n'est pas supprime : il peut avoir acces a
        // d'autres organisations, et son historique reste attache a ses
        // ecritures.
        const { error } = await admin
          .from('user_clients')
          .delete()
          .eq('user_id', userId)
          .eq('client_id', clientId);

        if (error) return json({ error: error.message }, 500);
        return json({ success: true });
      }

      default:
        return json({ error: `Action inconnue : ${action}` }, 400);
    }
  } catch (error) {
    console.error('manage-users:', error);
    return json(
      { error: error instanceof Error ? error.message : 'Erreur inattendue' },
      500,
    );
  }
});
