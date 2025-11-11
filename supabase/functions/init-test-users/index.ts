import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// SECURITY: This function requires JWT authentication (verify_jwt = true)
// Only authenticated super_admin users can create test users
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Check user's role using anon key with their JWT
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user has super_admin role
    const { data: roles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isSuperAdmin = roles?.some((r: any) => r.role === 'super_admin');
    if (!isSuperAdmin) {
      return new Response(
        JSON.stringify({ error: 'Only super_admin can create test users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role key for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('Starting test users initialization...');

    // Définir les utilisateurs de test
    const testUsers = [
      {
        email: 'super@agilys.com',
        password: 'MotDePasse123!',
        user_metadata: {
          nom: 'Super',
          prenom: 'Admin',
          client_id: 'agilys-hq'
        },
        role: 'super_admin'
      },
      {
        email: 'admin@portonovo.bj',
        password: 'MotDePasse123!',
        user_metadata: {
          nom: 'Admin',
          prenom: 'Client',
          client_id: 'client-1'
        },
        role: 'admin_client'
      },
      {
        email: 'directeur@portonovo.bj',
        password: 'MotDePasse123!',
        user_metadata: {
          nom: 'Directeur',
          prenom: 'Financier',
          client_id: 'client-1'
        },
        role: 'directeur_financier'
      },
      {
        email: 'comptable@portonovo.bj',
        password: 'MotDePasse123!',
        user_metadata: {
          nom: 'Comptable',
          prenom: 'Test',
          client_id: 'client-1'
        },
        role: 'comptable'
      }
    ];

    const results = [];

    for (const user of testUsers) {
      try {
        // Vérifier si l'utilisateur existe déjà
        const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
        const userExists = existingUser?.users.some(u => u.email === user.email);

        if (userExists) {
          console.log(`User ${user.email} already exists, skipping...`);
          results.push({
            email: user.email,
            status: 'skipped',
            message: 'User already exists'
          });
          continue;
        }

        // Créer l'utilisateur
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true, // Confirmer l'email automatiquement pour les tests
          user_metadata: user.user_metadata
        });

        if (createError) {
          console.error(`Error creating user ${user.email}:`, createError);
          results.push({
            email: user.email,
            status: 'error',
            message: createError.message
          });
          continue;
        }

        console.log(`User ${user.email} created successfully with ID: ${newUser.user?.id}`);

        // Assigner le rôle
        if (newUser.user?.id) {
          const { error: roleError } = await supabaseAdmin
            .from('user_roles')
            .insert({
              user_id: newUser.user.id,
              role: user.role
            });

          if (roleError) {
            console.error(`Error assigning role to ${user.email}:`, roleError);
            results.push({
              email: user.email,
              status: 'partial',
              message: 'User created but role assignment failed: ' + roleError.message,
              userId: newUser.user.id
            });
          } else {
            console.log(`Role ${user.role} assigned to ${user.email}`);
            results.push({
              email: user.email,
              status: 'success',
              message: 'User and role created successfully',
              userId: newUser.user.id,
              role: user.role
            });
          }
        }

      } catch (error: any) {
        console.error(`Unexpected error for user ${user.email}:`, error);
        results.push({
          email: user.email,
          status: 'error',
          message: error?.message || 'Unknown error'
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Test users initialization completed',
        results 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error in init-test-users function:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error?.message || 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
