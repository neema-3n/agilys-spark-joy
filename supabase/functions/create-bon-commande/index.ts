import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

interface CreateBonCommandeRequest {
  exerciceId: string;
  clientId: string;
  fournisseurId: string;
  objet: string;
  montant: number;
  dateCommande?: string;
  dateLivraisonPrevue?: string;
  conditionsLivraison?: string;
  engagementId?: string;
  ligneBudgetaireId?: string;
  projetId?: string;
  observations?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
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

    // Parse request body
    const body: CreateBonCommandeRequest = await req.json();
    
    // Validate required fields
    if (!body.exerciceId || !body.clientId || !body.fournisseurId || !body.objet) {
      throw new Error('Champs requis manquants: exerciceId, clientId, fournisseurId, objet');
    }

    console.log('Creating bon de commande:', {
      exerciceId: body.exerciceId,
      clientId: body.clientId,
      fournisseurId: body.fournisseurId,
      userId: user.id
    });

    // Call database function with service role to create bon de commande atomically
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data, error } = await supabaseAdmin.rpc('create_bon_commande_with_numero', {
      p_exercice_id: body.exerciceId,
      p_client_id: body.clientId,
      p_fournisseur_id: body.fournisseurId,
      p_objet: body.objet,
      p_montant: body.montant || 0,
      p_date_commande: body.dateCommande || new Date().toISOString().split('T')[0],
      p_date_livraison_prevue: body.dateLivraisonPrevue || null,
      p_conditions_livraison: body.conditionsLivraison || null,
      p_engagement_id: body.engagementId || null,
      p_ligne_budgetaire_id: body.ligneBudgetaireId || null,
      p_projet_id: body.projetId || null,
      p_observations: body.observations || null,
      p_user_id: user.id
    });

    if (error) {
      console.error('Database error:', error);
      throw new Error(error.message);
    }

    console.log('create-bon-commande: BC created successfully:', data.id);

    // Generate accounting entries automatically
    try {
      console.log('create-bon-commande: Generating ecritures comptables');
      
      const { error: ecrituresError } = await supabaseAdmin.functions.invoke(
        'generate-ecritures-comptables',
        {
          body: {
            typeOperation: 'bon_commande',
            sourceId: data.id,
            clientId: body.clientId,
            exerciceId: body.exerciceId
          }
        }
      );
      
      if (ecrituresError) {
        console.error('create-bon-commande: Error generating ecritures', ecrituresError);
      } else {
        console.log('create-bon-commande: Ecritures generated successfully');
      }
    } catch (ecrituresError) {
      console.error('create-bon-commande: Exception generating ecritures', ecrituresError);
    }

    // Convert snake_case to camelCase
    const toCamelCase = (obj: any): any => {
      if (obj === null || obj === undefined) return obj;
      if (Array.isArray(obj)) return obj.map(toCamelCase);
      if (typeof obj !== 'object') return obj;
      
      return Object.keys(obj).reduce((acc, key) => {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        acc[camelKey] = toCamelCase(obj[key]);
        return acc;
      }, {} as any);
    };

    const result = toCamelCase(data);

    console.log('Bon de commande created successfully:', result.id);

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error in create-bon-commande function:', error);
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
