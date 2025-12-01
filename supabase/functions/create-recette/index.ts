import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const {
      clientId,
      exerciceId,
      dateRecette,
      montant,
      compteDestinationId,
      sourceRecette,
      categorie,
      beneficiaire,
      reference,
      libelle,
      observations,
    } = await req.json();

    console.log('Création d\'une recette:', { clientId, exerciceId, montant });

    // Générer le numéro de recette
    const { data: lastRecette } = await supabase
      .from('recettes')
      .select('numero')
      .eq('client_id', clientId)
      .order('numero', { ascending: false })
      .limit(1)
      .single();

    let nextNumber = 1;
    if (lastRecette?.numero) {
      const match = lastRecette.numero.match(/REC(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    const numero = `REC${String(nextNumber).padStart(5, '0')}`;

    // Récupérer l'utilisateur
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token || '');

    // Créer la recette
    const { data: recette, error: recetteError } = await supabase
      .from('recettes')
      .insert({
        client_id: clientId,
        exercice_id: exerciceId,
        numero,
        date_recette: dateRecette,
        montant,
        compte_destination_id: compteDestinationId,
        source_recette: sourceRecette,
        categorie,
        beneficiaire,
        reference,
        libelle,
        observations,
        statut: 'validee',
        created_by: user?.id,
      })
      .select(`
        *,
        compte_destination:comptes_tresorerie!compte_destination_id(code, libelle, type)
      `)
      .single();

    if (recetteError) throw recetteError;

    console.log('Recette créée avec succès:', recette.id);

    // Transformer les données pour le frontend
    const result = {
      id: recette.id,
      clientId: recette.client_id,
      exerciceId: recette.exercice_id,
      numero: recette.numero,
      dateRecette: recette.date_recette,
      montant: recette.montant,
      compteDestinationId: recette.compte_destination_id,
      sourceRecette: recette.source_recette,
      categorie: recette.categorie,
      beneficiaire: recette.beneficiaire,
      reference: recette.reference,
      libelle: recette.libelle,
      observations: recette.observations,
      statut: recette.statut,
      createdBy: recette.created_by,
      createdAt: recette.created_at,
      updatedAt: recette.updated_at,
      compteDestination: recette.compte_destination ? {
        code: recette.compte_destination.code,
        libelle: recette.compte_destination.libelle,
        type: recette.compte_destination.type,
      } : undefined,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Erreur:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
