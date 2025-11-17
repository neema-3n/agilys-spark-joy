import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateModificationBudgetaireRequest {
  exerciceId: string;
  clientId: string;
  type: string;
  ligneSourceId?: string;
  ligneDestinationId: string;
  montant: number;
  motif: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('create-modification-budgetaire: Starting request');

    // 1. Vérifier l'authentification
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header manquant');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('create-modification-budgetaire: Auth error', authError);
      throw new Error('Non autorisé');
    }

    console.log('create-modification-budgetaire: User authenticated', user.id);

    // 2. Récupérer les données de la requête
    const body: CreateModificationBudgetaireRequest = await req.json();
    console.log('create-modification-budgetaire: Request body', body);

    // 3. Valider les champs requis
    if (!body.exerciceId || !body.clientId || !body.type || !body.ligneDestinationId || !body.motif) {
      throw new Error('Champs requis manquants');
    }

    // 4. Utiliser le service role key pour la transaction atomique
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('create-modification-budgetaire: Calling create_modification_budgetaire_with_numero function');

    // 5. Appeler la fonction PostgreSQL pour créer la modification avec numéro atomique
    const { data, error } = await supabaseAdmin.rpc('create_modification_budgetaire_with_numero', {
      p_exercice_id: body.exerciceId,
      p_client_id: body.clientId,
      p_type: body.type,
      p_ligne_source_id: body.ligneSourceId || null,
      p_ligne_destination_id: body.ligneDestinationId,
      p_montant: body.montant || 0,
      p_motif: body.motif,
    });

    if (error) {
      console.error('create-modification-budgetaire: Database error', error);
      throw error;
    }

    console.log('create-modification-budgetaire: Modification created successfully', data);

    // 6. Transformer les clés snake_case en camelCase
    const toCamelCase = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj.map(toCamelCase);
      } else if (obj !== null && obj.constructor === Object) {
        return Object.keys(obj).reduce((result, key) => {
          const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
          result[camelKey] = toCamelCase(obj[key]);
          return result;
        }, {} as any);
      }
      return obj;
    };

    const camelCaseData = toCamelCase(data);

    return new Response(JSON.stringify(camelCaseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('create-modification-budgetaire: Error', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la création de la modification budgétaire';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
