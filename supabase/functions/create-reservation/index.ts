import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateReservationRequest {
  exerciceId: string;
  clientId: string;
  ligneBudgetaireId: string;
  montant: number;
  objet: string;
  beneficiaire?: string;
  projetId?: string;
  dateExpiration?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('create-reservation: Starting request');

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
      console.error('create-reservation: Auth error', authError);
      throw new Error('Non autorisé');
    }

    console.log('create-reservation: User authenticated', user.id);

    // 2. Récupérer les données de la requête
    const body: CreateReservationRequest = await req.json();
    console.log('create-reservation: Request body', body);

    // 3. Valider les champs requis
    if (!body.exerciceId || !body.clientId || !body.ligneBudgetaireId || !body.objet) {
      throw new Error('Champs requis manquants');
    }

    // 4. Utiliser le service role key pour la transaction atomique
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('create-reservation: Calling create_reservation_with_numero function');

    // 5. Appeler la fonction PostgreSQL pour créer la réservation avec numéro atomique
    const { data, error } = await supabaseAdmin.rpc('create_reservation_with_numero', {
      p_exercice_id: body.exerciceId,
      p_client_id: body.clientId,
      p_ligne_budgetaire_id: body.ligneBudgetaireId,
      p_montant: body.montant || 0,
      p_objet: body.objet,
      p_beneficiaire: body.beneficiaire || null,
      p_projet_id: body.projetId || null,
      p_date_expiration: body.dateExpiration || null,
      p_user_id: user.id,
    });

    if (error) {
      console.error('create-reservation: Database error', error);
      throw error;
    }

    console.log('create-reservation: Reservation created successfully', data);

    // Generate accounting entries automatically
    try {
      console.log('create-reservation: Generating ecritures comptables');
      
      const { error: ecrituresError } = await supabaseAdmin.functions.invoke(
        'generate-ecritures-comptables',
        {
          body: {
            typeOperation: 'reservation',
            sourceId: data.id,
            clientId: body.clientId,
            exerciceId: body.exerciceId
          }
        }
      );
      
      if (ecrituresError) {
        console.error('create-reservation: Error generating ecritures', ecrituresError);
      } else {
        console.log('create-reservation: Ecritures generated successfully');
      }
    } catch (ecrituresError) {
      console.error('create-reservation: Exception generating ecritures', ecrituresError);
    }

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
    console.error('create-reservation: Error', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la création de la réservation';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
