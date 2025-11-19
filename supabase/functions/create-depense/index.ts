import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Vérifier l'authentification
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Non authentifié');
    }

    const {
      exercice_id,
      client_id,
      objet,
      montant,
      date_depense,
      engagement_id,
      reservation_credit_id,
      ligne_budgetaire_id,
      facture_id,
      fournisseur_id,
      beneficiaire,
      projet_id,
      mode_paiement,
      reference_paiement,
      observations,
      user_id,
    } = await req.json();

    console.log('Creating depense:', {
      exercice_id,
      client_id,
      objet,
      montant,
      engagement_id,
      reservation_credit_id,
      ligne_budgetaire_id,
    });

    // Validation
    if (!exercice_id || !client_id || !objet || !montant || !date_depense || !user_id) {
      throw new Error('Champs requis manquants');
    }

    if (!engagement_id && !reservation_credit_id && !ligne_budgetaire_id) {
      throw new Error('Au moins une imputation budgétaire est requise (engagement, réservation ou ligne budgétaire)');
    }

    // Appeler la fonction PostgreSQL
    const { data, error } = await supabase.rpc('create_depense_with_numero', {
      p_exercice_id: exercice_id,
      p_client_id: client_id,
      p_objet: objet,
      p_montant: montant,
      p_date_depense: date_depense,
      p_engagement_id: engagement_id || null,
      p_reservation_credit_id: reservation_credit_id || null,
      p_ligne_budgetaire_id: ligne_budgetaire_id || null,
      p_facture_id: facture_id || null,
      p_fournisseur_id: fournisseur_id || null,
      p_beneficiaire: beneficiaire || null,
      p_projet_id: projet_id || null,
      p_mode_paiement: mode_paiement || null,
      p_reference_paiement: reference_paiement || null,
      p_observations: observations || null,
      p_user_id: user_id,
    });

    if (error) {
      console.error('Database error:', error);
      
      // Transformer les erreurs PostgreSQL en messages lisibles
      let errorMessage = error.message;
      
      // Les messages formatés des triggers sont déjà clairs
      if (errorMessage.includes('⚠️')) {
        // C'est un message formaté, le garder tel quel
        return new Response(
          JSON.stringify({ error: errorMessage }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      // Autres erreurs
      if (errorMessage.includes('violates check constraint')) {
        if (errorMessage.includes('engagement_id')) {
          errorMessage = '❌ Une dépense doit être rattachée à au moins un engagement, une réservation ou une ligne budgétaire';
        } else if (errorMessage.includes('montant')) {
          errorMessage = '❌ Le montant doit être positif';
        }
      }
      
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Depense created successfully:', data);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in create-depense function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
