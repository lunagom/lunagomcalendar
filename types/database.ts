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
      board_posts: {
        Row: {
          id: string
          calendar_id: string
          author_id: string
          title: string
          body: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          calendar_id: string
          author_id: string
          title: string
          body: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          calendar_id?: string
          author_id?: string
          title?: string
          body?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      board_comments: {
        Row: {
          id: string
          post_id: string
          author_id: string
          body: string
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          author_id: string
          body: string
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          author_id?: string
          body?: string
          created_at?: string
        }
        Relationships: []
      }
      board_likes: {
        Row: {
          user_id: string
          target_type: string
          target_id: string
          created_at: string
        }
        Insert: {
          user_id: string
          target_type: string
          target_id: string
          created_at?: string
        }
        Update: {
          user_id?: string
          target_type?: string
          target_id?: string
          created_at?: string
        }
        Relationships: []
      }
      board_reads: {
        Row: {
          user_id: string
          calendar_id: string
          last_read_at: string
        }
        Insert: {
          user_id: string
          calendar_id: string
          last_read_at?: string
        }
        Update: {
          user_id?: string
          calendar_id?: string
          last_read_at?: string
        }
        Relationships: []
      }
      budgets: {
        Row: {
          category: string
          created_at: string
          id: string
          limit_amount: number
          month: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          limit_amount: number
          month: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          limit_amount?: number
          month?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      calendars: {
        Row: {
          color: string
          created_at: string
          id: string
          is_default: boolean
          name: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          calendar_id: string
          color: string | null
          created_at: string
          emoji: string | null
          end_at: string
          expected_amount: number | null
          expense_category: string | null
          id: string
          is_all_day: boolean
          is_lunar: boolean
          location: string | null
          lunar_day: number | null
          lunar_month: number | null
          memo: string | null
          start_at: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          calendar_id: string
          color?: string | null
          created_at?: string
          emoji?: string | null
          end_at: string
          expected_amount?: number | null
          expense_category?: string | null
          id?: string
          is_all_day?: boolean
          is_lunar?: boolean
          location?: string | null
          lunar_day?: number | null
          lunar_month?: number | null
          memo?: string | null
          start_at: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          calendar_id?: string
          color?: string | null
          created_at?: string
          emoji?: string | null
          end_at?: string
          expected_amount?: number | null
          expense_category?: string | null
          id?: string
          is_all_day?: boolean
          is_lunar?: boolean
          location?: string | null
          lunar_day?: number | null
          lunar_month?: number | null
          memo?: string | null
          start_at?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          event_id: string | null
          id: string
          memo: string | null
          paid_at: string
          receipt_url: string | null
          user_id: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          event_id?: string | null
          id?: string
          memo?: string | null
          paid_at: string
          receipt_url?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          event_id?: string | null
          id?: string
          memo?: string | null
          paid_at?: string
          receipt_url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          body: string | null
          link: string | null
          dedupe_key: string | null
          created_at: string
          read_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          body?: string | null
          link?: string | null
          dedupe_key?: string | null
          created_at?: string
          read_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          body?: string | null
          link?: string | null
          dedupe_key?: string | null
          created_at?: string
          read_at?: string | null
        }
        Relationships: []
      }
      monthly_targets: {
        Row: {
          amount: number
          created_at: string
          id: string
          month: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          month: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          month?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          nickname: string | null
          theme_preference: string
          updated_at: string
          widget_visibility: Json | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id: string
          nickname?: string | null
          theme_preference?: string
          updated_at?: string
          widget_visibility?: Json | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          nickname?: string | null
          theme_preference?: string
          updated_at?: string
          widget_visibility?: Json | null
        }
        Relationships: []
      }
      shared_calendars: {
        Row: {
          calendar_id: string
          created_at: string
          id: string
          member_id: string
          owner_id: string
          permission: string
          status: string
        }
        Insert: {
          calendar_id: string
          created_at?: string
          id?: string
          member_id: string
          owner_id: string
          permission?: string
          status?: string
        }
        Update: {
          calendar_id?: string
          created_at?: string
          id?: string
          member_id?: string
          owner_id?: string
          permission?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_calendars_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount: number
          billing_day: number
          category: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          user_id: string
        }
        Insert: {
          amount: number
          billing_day: number
          category: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          user_id: string
        }
        Update: {
          amount?: number
          billing_day?: number
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          emoji: string | null
          id: string
          scheduled_date: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          emoji?: string | null
          id?: string
          scheduled_date: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          emoji?: string | null
          id?: string
          scheduled_date?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_calendar_membership: {
        Args: {
          p_calendar_id: string
          p_min_permission?: string
          p_user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
