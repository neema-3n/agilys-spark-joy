import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

interface CreateFactureRequest {
  exerciceId: string;
  clientId: string;
  fournisseurId: string;
  objet: string;
  dateFacture: string;
  dateEcheance?: string;
  montantHT: number;
  montantTVA: number;
  montantTTC: number;
  montantNetPaye?: number;
  totalAjouts?: number;
  totalRetraits?: number;
  numeroFactureFournisseur?: string;
  bonCommandeId?: string;
  engagementId?: string;
  ligneBudgetaireId?: string;
  projetId?: string;
  chargePrincipaleMode?: 'nature' | 'compte_expert';
  natureCompteChargeId?: string;
  compteChargeId?: string;
  ventilations?: Array<{
    id: string;
    libelle: string;
    nature: string;
    montant: number;
    sens: string;
  }>;
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
    const body: CreateFactureRequest = await req.json();
    
    // Validate required fields
    if (!body.exerciceId || !body.clientId || !body.fournisseurId || !body.objet) {
      throw new Error('Champs requis manquants: exerciceId, clientId, fournisseurId, objet');
    }

    console.log('Creating facture:', {
      exerciceId: body.exerciceId,
      clientId: body.clientId,
      fournisseurId: body.fournisseurId,
      userId: user.id
    });

    // Call database function with service role to create facture atomically
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data, error } = await supabaseAdmin.rpc('create_facture_with_numero', {
      p_exercice_id: body.exerciceId,
      p_client_id: body.clientId,
      p_fournisseur_id: body.fournisseurId,
      p_objet: body.objet,
      p_date_facture: body.dateFacture || new Date().toISOString().split('T')[0],
      p_date_echeance: body.dateEcheance || null,
      p_montant_ht: body.montantHT || 0,
      p_montant_tva: body.montantTVA || 0,
      p_montant_ttc: body.montantTTC || 0,
      p_numero_facture_fournisseur: body.numeroFactureFournisseur || null,
      p_bon_commande_id: body.bonCommandeId || null,
      p_engagement_id: body.engagementId || null,
      p_ligne_budgetaire_id: body.ligneBudgetaireId || null,
      p_projet_id: body.projetId || null,
      p_observations: body.observations || null,
      p_user_id: user.id
    });

    if (error) {
      console.error('Database error:', error);
      
      // Transformer les erreurs techniques en messages clairs
      let userMessage = error.message;
      
      // Erreur de dépassement du BC
      if (error.message.includes('dépasse le montant du bon de commande')) {
        const match = error.message.match(/\(([0-9.]+)\).*\(([0-9.]+)\)/);
        if (match) {
          const totalFacture = parseFloat(match[1]);
          const montantBC = parseFloat(match[2]);
          const deja = totalFacture - body.montantTTC;
          const disponible = montantBC - deja;
          
          userMessage = `⚠️ Montant insuffisant sur le bon de commande\n\n` +
                       `• Montant du BC : ${montantBC.toFixed(2)} €\n` +
                       `• Déjà facturé : ${deja.toFixed(2)} €\n` +
                       `• Disponible : ${disponible.toFixed(2)} €\n` +
                       `• Vous tentez de facturer : ${body.montantTTC.toFixed(2)} €\n\n` +
                       `💡 Réduisez le montant à ${disponible.toFixed(2)} € maximum`;
        }
      }
      
      // Erreur de dépassement de l'engagement
      if (error.message.includes('dépasse le montant de l\'engagement')) {
        const match = error.message.match(/\(([0-9.]+)\).*\(([0-9.]+)\)/);
        if (match) {
          const totalFacture = parseFloat(match[1]);
          const montantEng = parseFloat(match[2]);
          const disponible = montantEng - (totalFacture - body.montantTTC);
          
          userMessage = `⚠️ Montant insuffisant sur l'engagement\n\n` +
                       `• Montant de l'engagement : ${montantEng.toFixed(2)} €\n` +
                       `• Disponible : ${disponible.toFixed(2)} €\n\n` +
                       `💡 Réduisez le montant ou augmentez l'engagement`;
        }
      }
      
      // Erreur de budget insuffisant
      if (error.message.includes('Budget insuffisant')) {
        userMessage = `⚠️ Budget insuffisant sur la ligne budgétaire\n\n` +
                     `💡 Vérifiez le budget disponible ou créez une modification budgétaire`;
      }
      
      throw new Error(userMessage);
    }

    console.log('create-facture: Facture created successfully:', data.id);

    const { error: patchError } = await supabaseAdmin
      .from('factures')
      .update({
        montant_net_paye: body.montantNetPaye ?? body.montantTTC,
        total_ajouts: body.totalAjouts ?? body.montantTVA ?? 0,
        total_retraits: body.totalRetraits ?? 0,
        charge_principale_mode: body.chargePrincipaleMode ?? 'nature',
        nature_compte_charge_id: body.natureCompteChargeId || null,
        compte_charge_id: body.compteChargeId || null,
        ventilations: body.ventilations || [],
      })
      .eq('id', data.id);

    if (patchError) {
      console.error('create-facture: Error updating extended fields', patchError);
      throw new Error(patchError.message);
    }

    console.log('create-facture: Generating ecritures comptables');

    const { data: ecrituresResult, error: ecrituresError } = await supabaseAdmin.functions.invoke(
      'generate-ecritures-comptables',
      {
        body: {
          typeOperation: 'facture',
          sourceId: data.id,
          clientId: body.clientId,
          exerciceId: body.exerciceId
        }
      }
    );

    if (ecrituresError) {
      console.error('create-facture: Error generating ecritures', ecrituresError);
      throw new Error('La facture a ete creee mais la generation des ecritures comptables a echoue.');
    }

    if (!ecrituresResult?.success) {
      const comptaError = ecrituresResult?.error || 'Generation des ecritures comptables incomplete.';
      console.error('create-facture: Incomplete accounting generation', ecrituresResult);
      throw new Error(comptaError);
    }

    console.log('create-facture: Ecritures generated successfully');

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

    const result = toCamelCase({
      ...data,
      montant_net_paye: body.montantNetPaye ?? body.montantTTC,
      total_ajouts: body.totalAjouts ?? body.montantTVA ?? 0,
      total_retraits: body.totalRetraits ?? 0,
      charge_principale_mode: body.chargePrincipaleMode ?? 'nature',
      nature_compte_charge_id: body.natureCompteChargeId || null,
      compte_charge_id: body.compteChargeId || null,
      ventilations: body.ventilations || [],
    });

    console.log('Facture created successfully:', result.id);

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error in create-facture function:', error);
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
