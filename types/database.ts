/**
 * Supabase Database 타입.
 *
 * 이 파일은 `pnpm db:types` 로 자동 생성됩니다. 수동으로 편집하지 마세요.
 *
 * 아래는 첫 마이그레이션 후 supabase CLI 로 갱신되기 전까지 사용할
 * 최소 placeholder 타입입니다. CLI 가 돌고 나면 전체 스키마로 교체됩니다.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          nickname: string | null;
          avatar_url: string | null;
          theme_preference: "light" | "dark" | "system";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          nickname?: string | null;
          avatar_url?: string | null;
          theme_preference?: "light" | "dark" | "system";
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      calendars: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          color: string;
          is_default: boolean;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["calendars"]["Row"],
          "id" | "created_at"
        > & { id?: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["calendars"]["Insert"]>;
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          user_id: string;
          calendar_id: string;
          title: string;
          memo: string | null;
          start_at: string;
          end_at: string;
          is_all_day: boolean;
          location: string | null;
          is_lunar: boolean;
          lunar_month: number | null;
          lunar_day: number | null;
          color: string | null;
          expected_amount: number | null;
          expense_category: ExpenseCategory | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["events"]["Row"],
          "id" | "created_at" | "updated_at"
        > & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["events"]["Insert"]>;
        Relationships: [];
      };
      expenses: {
        Row: {
          id: string;
          user_id: string;
          event_id: string | null;
          amount: number;
          category: ExpenseCategory;
          memo: string | null;
          paid_at: string;
          receipt_url: string | null;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["expenses"]["Row"],
          "id" | "created_at"
        > & { id?: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["expenses"]["Insert"]>;
        Relationships: [];
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          amount: number;
          billing_day: number;
          category: ExpenseCategory;
          is_active: boolean;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["subscriptions"]["Row"],
          "id" | "created_at"
        > & { id?: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["subscriptions"]["Insert"]>;
        Relationships: [];
      };
      shared_calendars: {
        Row: {
          id: string;
          calendar_id: string;
          owner_id: string;
          member_id: string;
          permission: "view" | "edit";
          status: "pending" | "accepted";
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["shared_calendars"]["Row"],
          "id" | "created_at"
        > & { id?: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["shared_calendars"]["Insert"]>;
        Relationships: [];
      };
      budgets: {
        Row: {
          id: string;
          user_id: string;
          category: ExpenseCategory;
          month: string; // 'YYYY-MM'
          limit_amount: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["budgets"]["Row"],
          "id" | "created_at" | "updated_at"
        > & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["budgets"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      has_calendar_membership: {
        Args: {
          p_calendar_id: string;
          p_user_id: string;
          p_min_permission?: "view" | "edit";
        };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
  };
};

export type ExpenseCategory =
  | "식비"
  | "교통"
  | "쇼핑"
  | "구독"
  | "경조사"
  | "기타";

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "식비",
  "교통",
  "쇼핑",
  "구독",
  "경조사",
  "기타",
];
