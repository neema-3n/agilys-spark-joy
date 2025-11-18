export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      actions: {
        Row: {
          client_id: string
          code: string
          created_at: string
          created_by: string | null
          exercice_id: string
          id: string
          libelle: string
          ordre: number
          programme_id: string
          statut: string
          updated_at: string
        }
        Insert: {
          client_id: string
          code: string
          created_at?: string
          created_by?: string | null
          exercice_id: string
          id?: string
          libelle: string
          ordre?: number
          programme_id: string
          statut?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          code?: string
          created_at?: string
          created_by?: string | null
          exercice_id?: string
          id?: string
          libelle?: string
          ordre?: number
          programme_id?: string
          statut?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "actions_exercice_id_fkey"
            columns: ["exercice_id"]
            isOneToOne: false
            referencedRelation: "exercices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actions_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
        ]
      }
      bons_commande: {
        Row: {
          client_id: string
          conditions_livraison: string | null
          created_at: string
          created_by: string | null
          date_commande: string
          date_livraison_prevue: string | null
          date_livraison_reelle: string | null
          date_validation: string | null
          engagement_id: string | null
          exercice_id: string
          fournisseur_id: string
          id: string
          ligne_budgetaire_id: string | null
          montant: number
          numero: string
          objet: string
          observations: string | null
          projet_id: string | null
          statut: string
          updated_at: string
        }
        Insert: {
          client_id: string
          conditions_livraison?: string | null
          created_at?: string
          created_by?: string | null
          date_commande?: string
          date_livraison_prevue?: string | null
          date_livraison_reelle?: string | null
          date_validation?: string | null
          engagement_id?: string | null
          exercice_id: string
          fournisseur_id: string
          id?: string
          ligne_budgetaire_id?: string | null
          montant?: number
          numero: string
          objet: string
          observations?: string | null
          projet_id?: string | null
          statut?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          conditions_livraison?: string | null
          created_at?: string
          created_by?: string | null
          date_commande?: string
          date_livraison_prevue?: string | null
          date_livraison_reelle?: string | null
          date_validation?: string | null
          engagement_id?: string | null
          exercice_id?: string
          fournisseur_id?: string
          id?: string
          ligne_budgetaire_id?: string | null
          montant?: number
          numero?: string
          objet?: string
          observations?: string | null
          projet_id?: string | null
          statut?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bons_commande_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bons_commande_exercice_id_fkey"
            columns: ["exercice_id"]
            isOneToOne: false
            referencedRelation: "exercices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bons_commande_fournisseur_id_fkey"
            columns: ["fournisseur_id"]
            isOneToOne: false
            referencedRelation: "fournisseurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bons_commande_ligne_budgetaire_id_fkey"
            columns: ["ligne_budgetaire_id"]
            isOneToOne: false
            referencedRelation: "lignes_budgetaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bons_commande_projet_id_fkey"
            columns: ["projet_id"]
            isOneToOne: false
            referencedRelation: "projets"
            referencedColumns: ["id"]
          },
        ]
      }
      comptes: {
        Row: {
          categorie: string
          client_id: string
          created_at: string
          created_by: string | null
          id: string
          libelle: string
          niveau: number
          numero: string
          parent_id: string | null
          statut: string
          type: string
          updated_at: string
        }
        Insert: {
          categorie: string
          client_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          libelle: string
          niveau?: number
          numero: string
          parent_id?: string | null
          statut?: string
          type: string
          updated_at?: string
        }
        Update: {
          categorie?: string
          client_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          libelle?: string
          niveau?: number
          numero?: string
          parent_id?: string | null
          statut?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comptes_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comptes"
            referencedColumns: ["id"]
          },
        ]
      }
      engagements: {
        Row: {
          beneficiaire: string | null
          client_id: string
          created_at: string
          created_by: string | null
          date_creation: string
          date_validation: string | null
          exercice_id: string
          fournisseur_id: string | null
          id: string
          ligne_budgetaire_id: string
          montant: number
          motif_annulation: string | null
          numero: string
          objet: string
          observations: string | null
          projet_id: string | null
          reservation_credit_id: string | null
          statut: string
          updated_at: string
        }
        Insert: {
          beneficiaire?: string | null
          client_id: string
          created_at?: string
          created_by?: string | null
          date_creation?: string
          date_validation?: string | null
          exercice_id: string
          fournisseur_id?: string | null
          id?: string
          ligne_budgetaire_id: string
          montant?: number
          motif_annulation?: string | null
          numero: string
          objet: string
          observations?: string | null
          projet_id?: string | null
          reservation_credit_id?: string | null
          statut?: string
          updated_at?: string
        }
        Update: {
          beneficiaire?: string | null
          client_id?: string
          created_at?: string
          created_by?: string | null
          date_creation?: string
          date_validation?: string | null
          exercice_id?: string
          fournisseur_id?: string | null
          id?: string
          ligne_budgetaire_id?: string
          montant?: number
          motif_annulation?: string | null
          numero?: string
          objet?: string
          observations?: string | null
          projet_id?: string | null
          reservation_credit_id?: string | null
          statut?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "engagements_fournisseur_id_fkey"
            columns: ["fournisseur_id"]
            isOneToOne: false
            referencedRelation: "fournisseurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagements_ligne_budgetaire_id_fkey"
            columns: ["ligne_budgetaire_id"]
            isOneToOne: false
            referencedRelation: "lignes_budgetaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagements_projet_id_fkey"
            columns: ["projet_id"]
            isOneToOne: false
            referencedRelation: "projets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagements_reservation_credit_id_fkey"
            columns: ["reservation_credit_id"]
            isOneToOne: false
            referencedRelation: "reservations_credits"
            referencedColumns: ["id"]
          },
        ]
      }
      enveloppes: {
        Row: {
          client_id: string
          code: string
          created_at: string
          created_by: string | null
          exercice_id: string
          id: string
          montant_alloue: number
          montant_consomme: number
          nom: string
          source_financement: string
          statut: string
          updated_at: string
        }
        Insert: {
          client_id: string
          code: string
          created_at?: string
          created_by?: string | null
          exercice_id: string
          id?: string
          montant_alloue?: number
          montant_consomme?: number
          nom: string
          source_financement: string
          statut?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          code?: string
          created_at?: string
          created_by?: string | null
          exercice_id?: string
          id?: string
          montant_alloue?: number
          montant_consomme?: number
          nom?: string
          source_financement?: string
          statut?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enveloppes_exercice_id_fkey"
            columns: ["exercice_id"]
            isOneToOne: false
            referencedRelation: "exercices"
            referencedColumns: ["id"]
          },
        ]
      }
      exercices: {
        Row: {
          client_id: string
          code: string | null
          created_at: string | null
          created_by: string | null
          date_debut: string
          date_fin: string
          id: string
          libelle: string
          statut: string
          updated_at: string | null
        }
        Insert: {
          client_id: string
          code?: string | null
          created_at?: string | null
          created_by?: string | null
          date_debut: string
          date_fin: string
          id?: string
          libelle: string
          statut: string
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          code?: string | null
          created_at?: string | null
          created_by?: string | null
          date_debut?: string
          date_fin?: string
          id?: string
          libelle?: string
          statut?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      factures: {
        Row: {
          bon_commande_id: string | null
          client_id: string
          created_at: string
          created_by: string | null
          date_echeance: string | null
          date_facture: string
          date_validation: string | null
          engagement_id: string | null
          exercice_id: string
          fournisseur_id: string
          id: string
          ligne_budgetaire_id: string | null
          montant_ht: number
          montant_paye: number
          montant_ttc: number
          montant_tva: number
          numero: string
          numero_facture_fournisseur: string | null
          objet: string
          observations: string | null
          projet_id: string | null
          statut: string
          updated_at: string
        }
        Insert: {
          bon_commande_id?: string | null
          client_id: string
          created_at?: string
          created_by?: string | null
          date_echeance?: string | null
          date_facture?: string
          date_validation?: string | null
          engagement_id?: string | null
          exercice_id: string
          fournisseur_id: string
          id?: string
          ligne_budgetaire_id?: string | null
          montant_ht?: number
          montant_paye?: number
          montant_ttc?: number
          montant_tva?: number
          numero: string
          numero_facture_fournisseur?: string | null
          objet: string
          observations?: string | null
          projet_id?: string | null
          statut?: string
          updated_at?: string
        }
        Update: {
          bon_commande_id?: string | null
          client_id?: string
          created_at?: string
          created_by?: string | null
          date_echeance?: string | null
          date_facture?: string
          date_validation?: string | null
          engagement_id?: string | null
          exercice_id?: string
          fournisseur_id?: string
          id?: string
          ligne_budgetaire_id?: string | null
          montant_ht?: number
          montant_paye?: number
          montant_ttc?: number
          montant_tva?: number
          numero?: string
          numero_facture_fournisseur?: string | null
          objet?: string
          observations?: string | null
          projet_id?: string | null
          statut?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "factures_bon_commande_id_fkey"
            columns: ["bon_commande_id"]
            isOneToOne: false
            referencedRelation: "bons_commande"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factures_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factures_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factures_exercice_id_fkey"
            columns: ["exercice_id"]
            isOneToOne: false
            referencedRelation: "exercices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factures_fournisseur_id_fkey"
            columns: ["fournisseur_id"]
            isOneToOne: false
            referencedRelation: "fournisseurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factures_ligne_budgetaire_id_fkey"
            columns: ["ligne_budgetaire_id"]
            isOneToOne: false
            referencedRelation: "lignes_budgetaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factures_projet_id_fkey"
            columns: ["projet_id"]
            isOneToOne: false
            referencedRelation: "projets"
            referencedColumns: ["id"]
          },
        ]
      }
      fournisseurs: {
        Row: {
          adresse: string | null
          banque: string | null
          categorie: string | null
          client_id: string
          code: string
          code_swift: string | null
          commentaires: string | null
          conditions_paiement: string | null
          contact_email: string | null
          contact_fonction: string | null
          contact_nom: string | null
          contact_prenom: string | null
          contact_telephone: string | null
          created_at: string | null
          created_by: string | null
          date_premiere_collaboration: string | null
          delai_livraison_moyen: number | null
          dernier_engagement_date: string | null
          email: string | null
          forme_juridique: string | null
          iban: string | null
          id: string
          montant_total_engage: number | null
          nom: string
          nom_court: string | null
          nombre_engagements: number | null
          note_evaluation: number | null
          numero_compte: string | null
          numero_contribuable: string | null
          pays: string | null
          registre_commerce: string | null
          site_web: string | null
          statut: string
          telephone: string | null
          telephone_mobile: string | null
          type_fournisseur: string
          updated_at: string | null
          ville: string | null
        }
        Insert: {
          adresse?: string | null
          banque?: string | null
          categorie?: string | null
          client_id: string
          code: string
          code_swift?: string | null
          commentaires?: string | null
          conditions_paiement?: string | null
          contact_email?: string | null
          contact_fonction?: string | null
          contact_nom?: string | null
          contact_prenom?: string | null
          contact_telephone?: string | null
          created_at?: string | null
          created_by?: string | null
          date_premiere_collaboration?: string | null
          delai_livraison_moyen?: number | null
          dernier_engagement_date?: string | null
          email?: string | null
          forme_juridique?: string | null
          iban?: string | null
          id?: string
          montant_total_engage?: number | null
          nom: string
          nom_court?: string | null
          nombre_engagements?: number | null
          note_evaluation?: number | null
          numero_compte?: string | null
          numero_contribuable?: string | null
          pays?: string | null
          registre_commerce?: string | null
          site_web?: string | null
          statut?: string
          telephone?: string | null
          telephone_mobile?: string | null
          type_fournisseur: string
          updated_at?: string | null
          ville?: string | null
        }
        Update: {
          adresse?: string | null
          banque?: string | null
          categorie?: string | null
          client_id?: string
          code?: string
          code_swift?: string | null
          commentaires?: string | null
          conditions_paiement?: string | null
          contact_email?: string | null
          contact_fonction?: string | null
          contact_nom?: string | null
          contact_prenom?: string | null
          contact_telephone?: string | null
          created_at?: string | null
          created_by?: string | null
          date_premiere_collaboration?: string | null
          delai_livraison_moyen?: number | null
          dernier_engagement_date?: string | null
          email?: string | null
          forme_juridique?: string | null
          iban?: string | null
          id?: string
          montant_total_engage?: number | null
          nom?: string
          nom_court?: string | null
          nombre_engagements?: number | null
          note_evaluation?: number | null
          numero_compte?: string | null
          numero_contribuable?: string | null
          pays?: string | null
          registre_commerce?: string | null
          site_web?: string | null
          statut?: string
          telephone?: string | null
          telephone_mobile?: string | null
          type_fournisseur?: string
          updated_at?: string | null
          ville?: string | null
        }
        Relationships: []
      }
      lignes_budgetaires: {
        Row: {
          action_id: string
          client_id: string
          compte_id: string
          created_at: string
          created_by: string | null
          disponible: number
          enveloppe_id: string | null
          exercice_id: string
          id: string
          libelle: string
          montant_engage: number
          montant_initial: number
          montant_modifie: number
          montant_paye: number
          montant_reserve: number
          statut: string
          updated_at: string
        }
        Insert: {
          action_id: string
          client_id: string
          compte_id: string
          created_at?: string
          created_by?: string | null
          disponible?: number
          enveloppe_id?: string | null
          exercice_id: string
          id?: string
          libelle: string
          montant_engage?: number
          montant_initial?: number
          montant_modifie?: number
          montant_paye?: number
          montant_reserve?: number
          statut?: string
          updated_at?: string
        }
        Update: {
          action_id?: string
          client_id?: string
          compte_id?: string
          created_at?: string
          created_by?: string | null
          disponible?: number
          enveloppe_id?: string | null
          exercice_id?: string
          id?: string
          libelle?: string
          montant_engage?: number
          montant_initial?: number
          montant_modifie?: number
          montant_paye?: number
          montant_reserve?: number
          statut?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lignes_budgetaires_enveloppe_id_fkey"
            columns: ["enveloppe_id"]
            isOneToOne: false
            referencedRelation: "enveloppes"
            referencedColumns: ["id"]
          },
        ]
      }
      lignes_prevision: {
        Row: {
          action_code: string | null
          annee: number
          client_id: string
          compte_numero: string | null
          created_at: string
          enveloppe_id: string | null
          hypotheses: string | null
          id: string
          libelle: string
          montant_prevu: number
          programme_code: string | null
          scenario_id: string
          section_code: string | null
          taux_croissance: number | null
          updated_at: string
        }
        Insert: {
          action_code?: string | null
          annee: number
          client_id: string
          compte_numero?: string | null
          created_at?: string
          enveloppe_id?: string | null
          hypotheses?: string | null
          id?: string
          libelle: string
          montant_prevu?: number
          programme_code?: string | null
          scenario_id: string
          section_code?: string | null
          taux_croissance?: number | null
          updated_at?: string
        }
        Update: {
          action_code?: string | null
          annee?: number
          client_id?: string
          compte_numero?: string | null
          created_at?: string
          enveloppe_id?: string | null
          hypotheses?: string | null
          id?: string
          libelle?: string
          montant_prevu?: number
          programme_code?: string | null
          scenario_id?: string
          section_code?: string | null
          taux_croissance?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lignes_prevision_enveloppe_id_fkey"
            columns: ["enveloppe_id"]
            isOneToOne: false
            referencedRelation: "enveloppes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lignes_prevision_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "scenarios_prevision"
            referencedColumns: ["id"]
          },
        ]
      }
      modifications_budgetaires: {
        Row: {
          client_id: string
          created_at: string
          date_creation: string
          date_validation: string | null
          exercice_id: string
          id: string
          ligne_destination_id: string
          ligne_source_id: string | null
          montant: number
          motif: string
          numero: string
          statut: string
          type: string
          updated_at: string
          valide_par: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          date_creation?: string
          date_validation?: string | null
          exercice_id: string
          id?: string
          ligne_destination_id: string
          ligne_source_id?: string | null
          montant: number
          motif: string
          numero: string
          statut?: string
          type: string
          updated_at?: string
          valide_par?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          date_creation?: string
          date_validation?: string | null
          exercice_id?: string
          id?: string
          ligne_destination_id?: string
          ligne_source_id?: string | null
          montant?: number
          motif?: string
          numero?: string
          statut?: string
          type?: string
          updated_at?: string
          valide_par?: string | null
        }
        Relationships: []
      }
      parametres_referentiels: {
        Row: {
          actif: boolean | null
          categorie: string
          client_id: string
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          libelle: string
          modifiable: boolean | null
          ordre: number | null
          updated_at: string
        }
        Insert: {
          actif?: boolean | null
          categorie: string
          client_id: string
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          libelle: string
          modifiable?: boolean | null
          ordre?: number | null
          updated_at?: string
        }
        Update: {
          actif?: boolean | null
          categorie?: string
          client_id?: string
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          libelle?: string
          modifiable?: boolean | null
          ordre?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          client_id: string
          created_at: string | null
          email: string
          id: string
          nom: string
          prenom: string
          updated_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          email: string
          id: string
          nom: string
          prenom: string
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          email?: string
          id?: string
          nom?: string
          prenom?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      programmes: {
        Row: {
          client_id: string
          code: string
          created_at: string
          created_by: string | null
          exercice_id: string
          id: string
          libelle: string
          ordre: number
          section_id: string
          statut: string
          updated_at: string
        }
        Insert: {
          client_id: string
          code: string
          created_at?: string
          created_by?: string | null
          exercice_id: string
          id?: string
          libelle: string
          ordre?: number
          section_id: string
          statut?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          code?: string
          created_at?: string
          created_by?: string | null
          exercice_id?: string
          id?: string
          libelle?: string
          ordre?: number
          section_id?: string
          statut?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "programmes_exercice_id_fkey"
            columns: ["exercice_id"]
            isOneToOne: false
            referencedRelation: "exercices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programmes_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      projets: {
        Row: {
          budget_alloue: number | null
          budget_consomme: number | null
          budget_engage: number | null
          client_id: string
          code: string
          created_at: string | null
          created_by: string | null
          date_debut: string
          date_fin: string
          description: string | null
          enveloppe_id: string | null
          exercice_id: string
          id: string
          nom: string
          priorite: string | null
          responsable: string | null
          statut: string
          taux_avancement: number | null
          type_projet: string | null
          updated_at: string | null
        }
        Insert: {
          budget_alloue?: number | null
          budget_consomme?: number | null
          budget_engage?: number | null
          client_id: string
          code: string
          created_at?: string | null
          created_by?: string | null
          date_debut: string
          date_fin: string
          description?: string | null
          enveloppe_id?: string | null
          exercice_id: string
          id?: string
          nom: string
          priorite?: string | null
          responsable?: string | null
          statut?: string
          taux_avancement?: number | null
          type_projet?: string | null
          updated_at?: string | null
        }
        Update: {
          budget_alloue?: number | null
          budget_consomme?: number | null
          budget_engage?: number | null
          client_id?: string
          code?: string
          created_at?: string | null
          created_by?: string | null
          date_debut?: string
          date_fin?: string
          description?: string | null
          enveloppe_id?: string | null
          exercice_id?: string
          id?: string
          nom?: string
          priorite?: string | null
          responsable?: string | null
          statut?: string
          taux_avancement?: number | null
          type_projet?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      reservations_credits: {
        Row: {
          beneficiaire: string | null
          client_id: string
          created_at: string
          created_by: string | null
          date_expiration: string | null
          date_reservation: string
          exercice_id: string
          id: string
          ligne_budgetaire_id: string
          montant: number
          motif_annulation: string | null
          numero: string
          objet: string
          projet_id: string | null
          statut: string
          updated_at: string
        }
        Insert: {
          beneficiaire?: string | null
          client_id: string
          created_at?: string
          created_by?: string | null
          date_expiration?: string | null
          date_reservation?: string
          exercice_id: string
          id?: string
          ligne_budgetaire_id: string
          montant?: number
          motif_annulation?: string | null
          numero: string
          objet: string
          projet_id?: string | null
          statut?: string
          updated_at?: string
        }
        Update: {
          beneficiaire?: string | null
          client_id?: string
          created_at?: string
          created_by?: string | null
          date_expiration?: string | null
          date_reservation?: string
          exercice_id?: string
          id?: string
          ligne_budgetaire_id?: string
          montant?: number
          motif_annulation?: string | null
          numero?: string
          objet?: string
          projet_id?: string | null
          statut?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_reservations_credits_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_reservations_credits_exercice"
            columns: ["exercice_id"]
            isOneToOne: false
            referencedRelation: "exercices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_reservations_credits_ligne_budgetaire"
            columns: ["ligne_budgetaire_id"]
            isOneToOne: false
            referencedRelation: "lignes_budgetaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_reservations_credits_projet"
            columns: ["projet_id"]
            isOneToOne: false
            referencedRelation: "projets"
            referencedColumns: ["id"]
          },
        ]
      }
      scenarios_prevision: {
        Row: {
          annee_reference: number
          client_id: string
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          exercice_reference_id: string | null
          id: string
          nom: string
          statut: string
          type_scenario: string
          updated_at: string
        }
        Insert: {
          annee_reference: number
          client_id: string
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          exercice_reference_id?: string | null
          id?: string
          nom: string
          statut?: string
          type_scenario: string
          updated_at?: string
        }
        Update: {
          annee_reference?: number
          client_id?: string
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          exercice_reference_id?: string | null
          id?: string
          nom?: string
          statut?: string
          type_scenario?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scenarios_prevision_exercice_reference_id_fkey"
            columns: ["exercice_reference_id"]
            isOneToOne: false
            referencedRelation: "exercices"
            referencedColumns: ["id"]
          },
        ]
      }
      sections: {
        Row: {
          client_id: string
          code: string
          created_at: string
          created_by: string | null
          exercice_id: string
          id: string
          libelle: string
          ordre: number
          statut: string
          updated_at: string
        }
        Insert: {
          client_id: string
          code: string
          created_at?: string
          created_by?: string | null
          exercice_id: string
          id?: string
          libelle: string
          ordre?: number
          statut?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          code?: string
          created_at?: string
          created_by?: string | null
          exercice_id?: string
          id?: string
          libelle?: string
          ordre?: number
          statut?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sections_exercice_id_fkey"
            columns: ["exercice_id"]
            isOneToOne: false
            referencedRelation: "exercices"
            referencedColumns: ["id"]
          },
        ]
      }
      structures: {
        Row: {
          client_id: string
          code: string
          created_at: string
          created_by: string | null
          exercice_id: string | null
          id: string
          nom: string
          parent_id: string | null
          responsable: string | null
          statut: string
          type: string
          updated_at: string
        }
        Insert: {
          client_id: string
          code: string
          created_at?: string
          created_by?: string | null
          exercice_id?: string | null
          id?: string
          nom: string
          parent_id?: string | null
          responsable?: string | null
          statut?: string
          type: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          code?: string
          created_at?: string
          created_by?: string | null
          exercice_id?: string | null
          id?: string
          nom?: string
          parent_id?: string | null
          responsable?: string | null
          statut?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "structures_exercice_id_fkey"
            columns: ["exercice_id"]
            isOneToOne: false
            referencedRelation: "exercices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "structures_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "structures"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_montant_reserve: {
        Args: { p_ligne_budgetaire_id: string }
        Returns: number
      }
      create_engagement_with_numero: {
        Args: {
          p_beneficiaire: string
          p_client_id: string
          p_exercice_id: string
          p_fournisseur_id: string
          p_ligne_budgetaire_id: string
          p_montant: number
          p_objet: string
          p_observations: string
          p_projet_id: string
          p_reservation_credit_id: string
          p_user_id: string
        }
        Returns: Json
      }
      create_modification_budgetaire_with_numero: {
        Args: {
          p_client_id: string
          p_exercice_id: string
          p_ligne_destination_id: string
          p_ligne_source_id: string
          p_montant: number
          p_motif: string
          p_type: string
        }
        Returns: Json
      }
      create_reservation_with_numero: {
        Args: {
          p_beneficiaire: string
          p_client_id: string
          p_date_expiration: string
          p_exercice_id: string
          p_ligne_budgetaire_id: string
          p_montant: number
          p_objet: string
          p_projet_id: string
          p_user_id: string
        }
        Returns: Json
      }
      get_user_client_id: { Args: { user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      recalculate_ligne_disponible: {
        Args: { p_ligne_budgetaire_id: string }
        Returns: undefined
      }
      recalculate_montant_engage: {
        Args: { p_ligne_budgetaire_id: string }
        Returns: undefined
      }
      recalculate_montant_paye: {
        Args: { p_ligne_budgetaire_id: string }
        Returns: undefined
      }
      recalculate_montant_reserve: {
        Args: { p_ligne_budgetaire_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "admin_client"
        | "directeur_financier"
        | "chef_service"
        | "comptable"
        | "operateur_saisie"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "super_admin",
        "admin_client",
        "directeur_financier",
        "chef_service",
        "comptable",
        "operateur_saisie",
      ],
    },
  },
} as const
