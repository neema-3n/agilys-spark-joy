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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
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
