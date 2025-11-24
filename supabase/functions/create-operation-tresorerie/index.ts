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
      dateOperation,
      typeOperation,
      compteId,
      compteContrepartieId,
      montant,
      modePaiement,
      referenceBancaire,
      libelle,
      categorie,
      observations,
    } = await req.json();

    console.log('Création d\'une opération de trésorerie:', { clientId, typeOperation, montant });

    // Générer le numéro d'opération
    const { data: lastOperation } = await supabase
      .from('operations_tresorerie')
      .select('numero')
      .eq('client_id', clientId)
      .order('numero', { ascending: false })
      .limit(1)
      .single();

    let nextNumber = 1;
    if (lastOperation?.numero) {
      const match = lastOperation.numero.match(/OPE(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    const numero = `OPE${String(nextNumber).padStart(6, '0')}`;

    // Récupérer l'utilisateur
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token || '');

    // Créer l'opération
    const { data: operation, error: operationError } = await supabase
      .from('operations_tresorerie')
      .insert({
        client_id: clientId,
        exercice_id: exerciceId,
        numero,
        date_operation: dateOperation,
        type_operation: typeOperation,
        compte_id: compteId,
        compte_contrepartie_id: compteContrepartieId,
        montant,
        mode_paiement: modePaiement,
        reference_bancaire: referenceBancaire,
        libelle,
        categorie,
        observations,
        statut: 'validee',
        created_by: user?.id,
      })
      .select(`
        *,
        compte:comptes_tresorerie!compte_id(code, libelle, type),
        compte_contrepartie:comptes_tresorerie!compte_contrepartie_id(code, libelle, type)
      `)
      .single();

    if (operationError) throw operationError;

    console.log('Opération créée avec succès:', operation.id);

    // Transformer les données pour le frontend
    const result = {
      id: operation.id,
      clientId: operation.client_id,
      exerciceId: operation.exercice_id,
      numero: operation.numero,
      dateOperation: operation.date_operation,
      typeOperation: operation.type_operation,
      compteId: operation.compte_id,
      compteContrepartieId: operation.compte_contrepartie_id,
      montant: operation.montant,
      modePaiement: operation.mode_paiement,
      referenceBancaire: operation.reference_bancaire,
      libelle: operation.libelle,
      categorie: operation.categorie,
      statut: operation.statut,
      rapproche: operation.rapproche,
      observations: operation.observations,
      createdBy: operation.created_by,
      createdAt: operation.created_at,
      updatedAt: operation.updated_at,
      compte: operation.compte ? {
        code: operation.compte.code,
        libelle: operation.compte.libelle,
        type: operation.compte.type,
      } : undefined,
      compteContrepartie: operation.compte_contrepartie ? {
        code: operation.compte_contrepartie.code,
        libelle: operation.compte_contrepartie.libelle,
        type: operation.compte_contrepartie.type,
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
