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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          menu_id: string
          name: string
          position: number
          restaurant_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          menu_id: string
          name: string
          position?: number
          restaurant_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          menu_id?: string
          name?: string
          position?: number
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      combos: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          items: Json
          name: string
          position: number
          price: number
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          items?: Json
          name: string
          position?: number
          price: number
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          items?: Json
          name?: string
          position?: number
          price?: number
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "combos_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_uses: {
        Row: {
          coupon_id: string
          customer_identifier: string
          id: string
          order_id: string | null
          used_at: string
        }
        Insert: {
          coupon_id: string
          customer_identifier: string
          id?: string
          order_id?: string | null
          used_at?: string
        }
        Update: {
          coupon_id?: string
          customer_identifier?: string
          id?: string
          order_id?: string | null
          used_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_uses_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          discount_id: string
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          restaurant_id: string
          usage_type: string
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          discount_id: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          restaurant_id: string
          usage_type: string
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          discount_id?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          restaurant_id?: string
          usage_type?: string
          used_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "coupons_discount_id_fkey"
            columns: ["discount_id"]
            isOneToOne: false
            referencedRelation: "discounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      discounts: {
        Row: {
          created_at: string
          current_uses: number
          description: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          name: string
          restaurant_id: string
          scope: string
          starts_at: string | null
          target_ids: string[]
          type: string
          updated_at: string
          value: number
        }
        Insert: {
          created_at?: string
          current_uses?: number
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          name: string
          restaurant_id: string
          scope: string
          starts_at?: string | null
          target_ids?: string[]
          type: string
          updated_at?: string
          value: number
        }
        Update: {
          created_at?: string
          current_uses?: number
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          name?: string
          restaurant_id?: string
          scope?: string
          starts_at?: string | null
          target_ids?: string[]
          type?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "discounts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      kitchen_tickets: {
        Row: {
          created_at: string
          id: string
          items: Json
          order_id: string
          priority: number
          restaurant_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          items?: Json
          order_id: string
          priority?: number
          restaurant_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          items?: Json
          order_id?: string
          priority?: number
          restaurant_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kitchen_tickets_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kitchen_tickets_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      menus: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          position: number
          restaurant_id: string
          schedule: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          position?: number
          restaurant_id: string
          schedule?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          position?: number
          restaurant_id?: string
          schedule?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menus_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          status: string
          updated_at: string
          user_id: string
          vehicle_type: string
          whatsapp: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          status?: string
          updated_at?: string
          user_id: string
          vehicle_type: string
          whatsapp: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          status?: string
          updated_at?: string
          user_id?: string
          vehicle_type?: string
          whatsapp?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          cancellation_reason: string | null
          coupon_code: string | null
          coupon_id: string | null
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          delivery_address: Json | null
          delivery_fee: number
          discount_amount: number
          driver_id: string | null
          estimated_time_min: number | null
          id: string
          items: Json
          menu_id: string | null
          notes: string | null
          order_type: string
          pos_session_id: string | null
          restaurant_id: string
          source: string
          status: string
          subtotal: number
          table_number: string | null
          total: number
          updated_at: string
        }
        Insert: {
          cancellation_reason?: string | null
          coupon_code?: string | null
          coupon_id?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          delivery_address?: Json | null
          delivery_fee?: number
          discount_amount?: number
          driver_id?: string | null
          estimated_time_min?: number | null
          id?: string
          items?: Json
          menu_id?: string | null
          notes?: string | null
          order_type: string
          pos_session_id?: string | null
          restaurant_id: string
          source?: string
          status?: string
          subtotal?: number
          table_number?: string | null
          total?: number
          updated_at?: string
        }
        Update: {
          cancellation_reason?: string | null
          coupon_code?: string | null
          coupon_id?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          delivery_address?: Json | null
          delivery_fee?: number
          discount_amount?: number
          driver_id?: string | null
          estimated_time_min?: number | null
          id?: string
          items?: Json
          menu_id?: string | null
          notes?: string | null
          order_type?: string
          pos_session_id?: string | null
          restaurant_id?: string
          source?: string
          status?: string
          subtotal?: number
          table_number?: string | null
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_pos_session_id_fkey"
            columns: ["pos_session_id"]
            isOneToOne: false
            referencedRelation: "pos_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_sessions: {
        Row: {
          closed_at: string | null
          closing_cash: number | null
          id: string
          opened_at: string
          opening_cash: number
          restaurant_id: string
          status: string
          total_sales: number
          user_id: string
        }
        Insert: {
          closed_at?: string | null
          closing_cash?: number | null
          id?: string
          opened_at?: string
          opening_cash?: number
          restaurant_id: string
          status?: string
          total_sales?: number
          user_id: string
        }
        Update: {
          closed_at?: string | null
          closing_cash?: number | null
          id?: string
          opened_at?: string
          opening_cash?: number
          restaurant_id?: string
          status?: string
          total_sales?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_sessions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_transactions: {
        Row: {
          amount: number
          change_amount: number
          created_at: string
          id: string
          order_id: string
          payment_method: string
          pos_session_id: string
          reference: string | null
          restaurant_id: string
        }
        Insert: {
          amount: number
          change_amount?: number
          created_at?: string
          id?: string
          order_id: string
          payment_method: string
          pos_session_id: string
          reference?: string | null
          restaurant_id: string
        }
        Update: {
          amount?: number
          change_amount?: number
          created_at?: string
          id?: string
          order_id?: string
          payment_method?: string
          pos_session_id?: string
          reference?: string | null
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_transactions_pos_session_id_fkey"
            columns: ["pos_session_id"]
            isOneToOne: false
            referencedRelation: "pos_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_transactions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          allergens: string[]
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_featured: boolean
          name: string
          position: number
          preparation_time_min: number | null
          price: number
          restaurant_id: string
          tags: string[]
          updated_at: string
        }
        Insert: {
          allergens?: string[]
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          name: string
          position?: number
          preparation_time_min?: number | null
          price: number
          restaurant_id: string
          tags?: string[]
          updated_at?: string
        }
        Update: {
          allergens?: string[]
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          name?: string
          position?: number
          preparation_time_min?: number | null
          price?: number
          restaurant_id?: string
          tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_hours: {
        Row: {
          close_time: string | null
          day_of_week: number
          id: string
          is_closed: boolean
          open_time: string | null
          restaurant_id: string
        }
        Insert: {
          close_time?: string | null
          day_of_week: number
          id?: string
          is_closed?: boolean
          open_time?: string | null
          restaurant_id: string
        }
        Update: {
          close_time?: string | null
          day_of_week?: number
          id?: string
          is_closed?: boolean
          open_time?: string | null
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_hours_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_drivers: {
        Row: {
          created_at: string
          driver_id: string
          id: string
          restaurant_id: string
        }
        Insert: {
          created_at?: string
          driver_id: string
          id?: string
          restaurant_id: string
        }
        Update: {
          created_at?: string
          driver_id?: string
          id?: string
          restaurant_id?: string
        }
        Relationships: []
      }
      billing_periods: {
        Row: {
          id: string
          restaurant_id: string
          week_start: string
          week_end: string
          order_count: number
          amount_owed: number
          status: string
          stripe_invoice_id: string | null
          stripe_payment_url: string | null
          paid_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          week_start: string
          week_end: string
          order_count?: number
          amount_owed?: number
          status?: string
          stripe_invoice_id?: string | null
          stripe_payment_url?: string | null
          paid_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          week_start?: string
          week_end?: string
          order_count?: number
          amount_owed?: number
          status?: string
          stripe_invoice_id?: string | null
          stripe_payment_url?: string | null
          paid_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_periods_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          address: string | null
          billing_status: string
          created_at: string
          delivery_enabled: boolean
          delivery_fee: number
          delivery_min_order: number
          delivery_radius_km: number | null
          driver_mode: string
          font_choice: string
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          notification_sound: boolean
          owner_id: string
          phone: string | null
          primary_color: string
          secondary_color: string
          slug: string
          stripe_account_id: string | null
          stripe_account_status: string
          stripe_customer_id: string | null
          timezone: string
          updated_at: string
          whatsapp_number: string | null
        }
        Insert: {
          address?: string | null
          billing_status?: string
          created_at?: string
          delivery_enabled?: boolean
          delivery_fee?: number
          delivery_min_order?: number
          delivery_radius_km?: number | null
          driver_mode?: string
          font_choice?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          notification_sound?: boolean
          owner_id: string
          phone?: string | null
          primary_color?: string
          secondary_color?: string
          slug: string
          stripe_account_id?: string | null
          stripe_account_status?: string
          stripe_customer_id?: string | null
          timezone?: string
          updated_at?: string
          whatsapp_number?: string | null
        }
        Update: {
          address?: string | null
          billing_status?: string
          created_at?: string
          delivery_enabled?: boolean
          delivery_fee?: number
          delivery_min_order?: number
          delivery_radius_km?: number | null
          driver_mode?: string
          font_choice?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          notification_sound?: boolean
          owner_id?: string
          phone?: string | null
          primary_color?: string
          secondary_color?: string
          slug?: string
          stripe_account_id?: string | null
          stripe_account_status?: string
          stripe_customer_id?: string | null
          timezone?: string
          updated_at?: string
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          created_at: string
          id: string
          role: string
        }
        Insert: {
          created_at?: string
          id: string
          role: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
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
