import { supabase } from '@/integrations/supabase/client';
import { Scenario, LignePrevision, GenerationParams, TypeScenario, StatutScenario } from '@/types/prevision.types';

export const previsionsService = {
  // ========== Scenarios ==========
  async getScenarios(clientId: string): Promise<Scenario[]> {
    const { data, error } = await supabase
      .from('scenarios_prevision')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map(row => ({
      id: row.id,
      clientId: row.client_id,
      code: row.code,
      nom: row.nom,
      description: row.description,
      typeScenario: row.type_scenario as TypeScenario,
      anneeReference: row.annee_reference,
      exerciceReferenceId: row.exercice_reference_id,
      statut: row.statut as StatutScenario,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
    }));
  },

  async getScenario(scenarioId: string): Promise<Scenario> {
    const { data, error } = await supabase
      .from('scenarios_prevision')
      .select('*')
      .eq('id', scenarioId)
      .single();

    if (error) throw error;

    return {
      id: data.id,
      clientId: data.client_id,
      code: data.code,
      nom: data.nom,
      description: data.description,
      typeScenario: data.type_scenario as TypeScenario,
      anneeReference: data.annee_reference,
      exerciceReferenceId: data.exercice_reference_id,
      statut: data.statut as StatutScenario,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      createdBy: data.created_by,
    };
  },

  async createScenario(scenario: Omit<Scenario, 'id' | 'createdAt' | 'updatedAt'>): Promise<Scenario> {
    const payload: any = {
      client_id: scenario.clientId,
      code: scenario.code,
      nom: scenario.nom,
      type_scenario: scenario.typeScenario,
      annee_reference: scenario.anneeReference,
      statut: scenario.statut,
    };

    if (scenario.description) payload.description = scenario.description;
    if (scenario.exerciceReferenceId) payload.exercice_reference_id = scenario.exerciceReferenceId;
    if (scenario.createdBy) payload.created_by = scenario.createdBy;

    const { data, error } = await supabase
      .from('scenarios_prevision')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      clientId: data.client_id,
      code: data.code,
      nom: data.nom,
      description: data.description,
      typeScenario: data.type_scenario as TypeScenario,
      anneeReference: data.annee_reference,
      exerciceReferenceId: data.exercice_reference_id,
      statut: data.statut as StatutScenario,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      createdBy: data.created_by,
    };
  },

  async updateScenario(scenarioId: string, updates: Partial<Omit<Scenario, 'id' | 'clientId'>>): Promise<Scenario> {
    const updateData: any = {};
    if (updates.code !== undefined) updateData.code = updates.code;
    if (updates.nom !== undefined) updateData.nom = updates.nom;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.typeScenario !== undefined) updateData.type_scenario = updates.typeScenario;
    if (updates.anneeReference !== undefined) updateData.annee_reference = updates.anneeReference;
    if (updates.exerciceReferenceId !== undefined) updateData.exercice_reference_id = updates.exerciceReferenceId;
    if (updates.statut !== undefined) updateData.statut = updates.statut;

    const { data, error } = await supabase
      .from('scenarios_prevision')
      .update(updateData)
      .eq('id', scenarioId)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      clientId: data.client_id,
      code: data.code,
      nom: data.nom,
      description: data.description,
      typeScenario: data.type_scenario as TypeScenario,
      anneeReference: data.annee_reference,
      exerciceReferenceId: data.exercice_reference_id,
      statut: data.statut as StatutScenario,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      createdBy: data.created_by,
    };
  },

  async deleteScenario(scenarioId: string): Promise<void> {
    const { error } = await supabase
      .from('scenarios_prevision')
      .delete()
      .eq('id', scenarioId);

    if (error) throw error;
  },

  async validerScenario(scenarioId: string): Promise<Scenario> {
    return this.updateScenario(scenarioId, { statut: 'valide' });
  },

  async archiverScenario(scenarioId: string): Promise<Scenario> {
    return this.updateScenario(scenarioId, { statut: 'archive' });
  },

  // ========== Lignes de prévision ==========
  async getLignesPrevision(scenarioId: string, annee?: number): Promise<LignePrevision[]> {
    let query = supabase
      .from('lignes_prevision')
      .select('*')
      .eq('scenario_id', scenarioId);

    if (annee !== undefined) {
      query = query.eq('annee', annee);
    }

    const { data, error } = await query.order('annee', { ascending: true });

    if (error) throw error;

    return data.map(row => ({
      id: row.id,
      scenarioId: row.scenario_id,
      clientId: row.client_id,
      annee: row.annee,
      sectionCode: row.section_code,
      programmeCode: row.programme_code,
      actionCode: row.action_code,
      compteNumero: row.compte_numero,
      enveloppeId: row.enveloppe_id,
      libelle: row.libelle,
      montantPrevu: Number(row.montant_prevu),
      tauxCroissance: row.taux_croissance ? Number(row.taux_croissance) : undefined,
      hypotheses: row.hypotheses,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  },

  async createLignePrevision(ligne: Omit<LignePrevision, 'id' | 'createdAt' | 'updatedAt'>): Promise<LignePrevision> {
    const { data, error } = await supabase
      .from('lignes_prevision')
      .insert({
        scenario_id: ligne.scenarioId,
        client_id: ligne.clientId,
        annee: ligne.annee,
        section_code: ligne.sectionCode,
        programme_code: ligne.programmeCode,
        action_code: ligne.actionCode,
        compte_numero: ligne.compteNumero,
        enveloppe_id: ligne.enveloppeId,
        libelle: ligne.libelle,
        montant_prevu: ligne.montantPrevu,
        taux_croissance: ligne.tauxCroissance,
        hypotheses: ligne.hypotheses,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      scenarioId: data.scenario_id,
      clientId: data.client_id,
      annee: data.annee,
      sectionCode: data.section_code,
      programmeCode: data.programme_code,
      actionCode: data.action_code,
      compteNumero: data.compte_numero,
      enveloppeId: data.enveloppe_id,
      libelle: data.libelle,
      montantPrevu: Number(data.montant_prevu),
      tauxCroissance: data.taux_croissance ? Number(data.taux_croissance) : undefined,
      hypotheses: data.hypotheses,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  async updateLignePrevision(ligneId: string, updates: Partial<Omit<LignePrevision, 'id' | 'scenarioId' | 'clientId'>>): Promise<LignePrevision> {
    const updateData: any = {};
    if (updates.annee !== undefined) updateData.annee = updates.annee;
    if (updates.sectionCode !== undefined) updateData.section_code = updates.sectionCode;
    if (updates.programmeCode !== undefined) updateData.programme_code = updates.programmeCode;
    if (updates.actionCode !== undefined) updateData.action_code = updates.actionCode;
    if (updates.compteNumero !== undefined) updateData.compte_numero = updates.compteNumero;
    if (updates.enveloppeId !== undefined) updateData.enveloppe_id = updates.enveloppeId;
    if (updates.libelle !== undefined) updateData.libelle = updates.libelle;
    if (updates.montantPrevu !== undefined) updateData.montant_prevu = updates.montantPrevu;
    if (updates.tauxCroissance !== undefined) updateData.taux_croissance = updates.tauxCroissance;
    if (updates.hypotheses !== undefined) updateData.hypotheses = updates.hypotheses;

    const { data, error } = await supabase
      .from('lignes_prevision')
      .update(updateData)
      .eq('id', ligneId)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      scenarioId: data.scenario_id,
      clientId: data.client_id,
      annee: data.annee,
      sectionCode: data.section_code,
      programmeCode: data.programme_code,
      actionCode: data.action_code,
      compteNumero: data.compte_numero,
      enveloppeId: data.enveloppe_id,
      libelle: data.libelle,
      montantPrevu: Number(data.montant_prevu),
      tauxCroissance: data.taux_croissance ? Number(data.taux_croissance) : undefined,
      hypotheses: data.hypotheses,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  async deleteLignePrevision(ligneId: string): Promise<void> {
    const { error } = await supabase
      .from('lignes_prevision')
      .delete()
      .eq('id', ligneId);

    if (error) throw error;
  },

  // ========== Génération automatique ==========
  async genererPrevisions(params: GenerationParams): Promise<void> {
    // Récupérer les lignes budgétaires de l'exercice de référence
    const { data: lignesBudget, error: budgetError } = await supabase
      .from('lignes_budgetaires')
      .select('*')
      .eq('exercice_id', params.exerciceReferenceId)
      .eq('statut', 'actif');

    if (budgetError) throw budgetError;

    // Récupérer le scenario pour obtenir le client_id et l'année de référence
    const { data: scenario, error: scenarioError } = await supabase
      .from('scenarios_prevision')
      .select('client_id, annee_reference')
      .eq('id', params.scenarioId)
      .single();

    if (scenarioError) throw scenarioError;

    // Générer les lignes de prévision pour chaque année
    const lignesPrevision: any[] = [];

    for (let i = 1; i <= params.nombreAnnees; i++) {
      const annee = scenario.annee_reference + i;

    for (const ligneBudget of lignesBudget) {
        const montantBase = Number(ligneBudget.montant_modifie || ligneBudget.montant_initial);
        
        // Déterminer le taux de croissance à appliquer
        let tauxCroissance = params.tauxCroissanceGlobal || 0;

        // Ajouter l'inflation si demandée
        if (params.inclureInflation && params.tauxInflation) {
          tauxCroissance += params.tauxInflation;
        }

        // Calculer le montant prévu avec croissance composée
        const montantPrevu = montantBase * Math.pow(1 + tauxCroissance / 100, i);

        lignesPrevision.push({
          scenario_id: params.scenarioId,
          client_id: scenario.client_id,
          annee: annee,
          enveloppe_id: ligneBudget.enveloppe_id,
          libelle: ligneBudget.libelle,
          montant_prevu: montantPrevu,
          taux_croissance: tauxCroissance,
          hypotheses: `Projection automatique avec taux de ${tauxCroissance}% pour l'année ${annee}`,
        });
      }
    }

    // Insérer toutes les lignes en une seule fois
    if (lignesPrevision.length > 0) {
      const { error: insertError } = await supabase
        .from('lignes_prevision')
        .insert(lignesPrevision);

      if (insertError) throw insertError;
    }
  },

  async dupliquerScenario(scenarioId: string, nouveauCode: string, nouveauNom: string): Promise<Scenario> {
    // Récupérer le scénario source
    const scenarioSource = await this.getScenario(scenarioId);
    
    // Créer le nouveau scénario
    const nouveauScenario = await this.createScenario({
      clientId: scenarioSource.clientId,
      code: nouveauCode,
      nom: nouveauNom,
      description: `Copie de ${scenarioSource.nom}`,
      typeScenario: scenarioSource.typeScenario,
      anneeReference: scenarioSource.anneeReference,
      exerciceReferenceId: scenarioSource.exerciceReferenceId,
      statut: 'brouillon',
    });

    // Récupérer et dupliquer les lignes de prévision
    const lignesSource = await this.getLignesPrevision(scenarioId);
    
    if (lignesSource.length > 0) {
      const nouvellesLignes = lignesSource.map(ligne => ({
        scenario_id: nouveauScenario.id,
        client_id: ligne.clientId,
        annee: ligne.annee,
        section_code: ligne.sectionCode,
        programme_code: ligne.programmeCode,
        action_code: ligne.actionCode,
        compte_numero: ligne.compteNumero,
        enveloppe_id: ligne.enveloppeId,
        libelle: ligne.libelle,
        montant_prevu: ligne.montantPrevu,
        taux_croissance: ligne.tauxCroissance,
        hypotheses: ligne.hypotheses,
      }));

      const { error } = await supabase
        .from('lignes_prevision')
        .insert(nouvellesLignes);

      if (error) throw error;
    }

    return nouveauScenario;
  },
};
