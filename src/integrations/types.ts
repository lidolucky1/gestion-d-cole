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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          annee_courante: string
          annee_debut_jour: number
          annee_debut_mois: number
          annee_fin_jour: number
          annee_fin_mois: number
          annees_scolaires: string[]
          devise: string
          etablissement_nom: string
          id: boolean
          nb_periodes: number
          periode_type: string
          updated_at: string
        }
        Insert: {
          annee_courante?: string
          annee_debut_jour?: number
          annee_debut_mois?: number
          annee_fin_jour?: number
          annee_fin_mois?: number
          annees_scolaires?: string[]
          devise?: string
          etablissement_nom?: string
          id?: boolean
          nb_periodes?: number
          periode_type?: string
          updated_at?: string
        }
        Update: {
          annee_courante?: string
          annee_debut_jour?: number
          annee_debut_mois?: number
          annee_fin_jour?: number
          annee_fin_mois?: number
          annees_scolaires?: string[]
          devise?: string
          etablissement_nom?: string
          id?: boolean
          nb_periodes?: number
          periode_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      classes: {
        Row: {
          annee_scolaire: string | null
          created_at: string
          droit_inscription: number
          frais_scolaire: number
          id: string
          niveau: string | null
          nom: string
        }
        Insert: {
          annee_scolaire?: string | null
          created_at?: string
          droit_inscription?: number
          frais_scolaire?: number
          id?: string
          niveau?: string | null
          nom: string
        }
        Update: {
          annee_scolaire?: string | null
          created_at?: string
          droit_inscription?: number
          frais_scolaire?: number
          id?: string
          niveau?: string | null
          nom?: string
        }
        Relationships: []
      }
      eleves: {
        Row: {
          adresse: string | null
          classe_id: string | null
          created_at: string
          date_inscription: string
          date_naissance: string | null
          id: string
          matricule: string
          nom: string
          photo_url: string | null
          prenom: string
          sexe: Database["public"]["Enums"]["sexe_enum"]
          telephone_parents: string | null
        }
        Insert: {
          adresse?: string | null
          classe_id?: string | null
          created_at?: string
          date_inscription?: string
          date_naissance?: string | null
          id?: string
          matricule?: string
          nom: string
          photo_url?: string | null
          prenom: string
          sexe: Database["public"]["Enums"]["sexe_enum"]
          telephone_parents?: string | null
        }
        Update: {
          adresse?: string | null
          classe_id?: string | null
          created_at?: string
          date_inscription?: string
          date_naissance?: string | null
          id?: string
          matricule?: string
          nom?: string
          photo_url?: string | null
          prenom?: string
          sexe?: Database["public"]["Enums"]["sexe_enum"]
          telephone_parents?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eleves_classe_id_fkey"
            columns: ["classe_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      matieres: {
        Row: {
          coefficient: number
          created_at: string
          id: string
          nom: string
        }
        Insert: {
          coefficient?: number
          created_at?: string
          id?: string
          nom: string
        }
        Update: {
          coefficient?: number
          created_at?: string
          id?: string
          nom?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          annee_scolaire: string
          appreciation: string | null
          created_at: string
          eleve_id: string
          id: string
          matiere_id: string
          note: number
          note_max: number
          trimestre: number
        }
        Insert: {
          annee_scolaire: string
          appreciation?: string | null
          created_at?: string
          eleve_id: string
          id?: string
          matiere_id: string
          note: number
          note_max?: number
          trimestre: number
        }
        Update: {
          annee_scolaire?: string
          appreciation?: string | null
          created_at?: string
          eleve_id?: string
          id?: string
          matiere_id?: string
          note?: number
          note_max?: number
          trimestre?: number
        }
        Relationships: [
          {
            foreignKeyName: "notes_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: false
            referencedRelation: "eleves"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_matiere_id_fkey"
            columns: ["matiere_id"]
            isOneToOne: false
            referencedRelation: "matieres"
            referencedColumns: ["id"]
          },
        ]
      }
      paiements: {
        Row: {
          created_at: string
          date_paiement: string
          eleve_id: string
          id: string
          montant: number
          motif: string | null
          recu_numero: string
          type_paiement: string
        }
        Insert: {
          created_at?: string
          date_paiement?: string
          eleve_id: string
          id?: string
          montant: number
          motif?: string | null
          recu_numero?: string
          type_paiement?: string
        }
        Update: {
          created_at?: string
          date_paiement?: string
          eleve_id?: string
          id?: string
          montant?: number
          motif?: string | null
          recu_numero?: string
          type_paiement?: string
        }
        Relationships: [
          {
            foreignKeyName: "paiements_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: false
            referencedRelation: "eleves"
            referencedColumns: ["id"]
          },
        ]
      }
      presences: {
        Row: {
          created_at: string
          date_presence: string
          eleve_id: string
          id: string
          note: string | null
          statut: Database["public"]["Enums"]["presence_statut"]
        }
        Insert: {
          created_at?: string
          date_presence?: string
          eleve_id: string
          id?: string
          note?: string | null
          statut: Database["public"]["Enums"]["presence_statut"]
        }
        Update: {
          created_at?: string
          date_presence?: string
          eleve_id?: string
          id?: string
          note?: string | null
          statut?: Database["public"]["Enums"]["presence_statut"]
        }
        Relationships: [
          {
            foreignKeyName: "presences_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: false
            referencedRelation: "eleves"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      reinscriptions: {
        Row: {
          annee_scolaire: string
          classe_id: string | null
          created_at: string
          date_reinscription: string
          eleve_id: string
          id: string
          note: string | null
        }
        Insert: {
          annee_scolaire: string
          classe_id?: string | null
          created_at?: string
          date_reinscription?: string
          eleve_id: string
          id?: string
          note?: string | null
        }
        Update: {
          annee_scolaire?: string
          classe_id?: string | null
          created_at?: string
          date_reinscription?: string
          eleve_id?: string
          id?: string
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reinscriptions_classe_id_fkey"
            columns: ["classe_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reinscriptions_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: false
            referencedRelation: "eleves"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      generate_matricule: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      presence_statut: "present" | "absent" | "retard"
      sexe_enum: "M" | "F"
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
      app_role: ["admin", "user"],
      presence_statut: ["present", "absent", "retard"],
      sexe_enum: ["M", "F"],
    },
  },
} as const
