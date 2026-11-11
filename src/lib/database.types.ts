export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      drivers: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean;
          licence_number: string | null;
          name: string;
          owner_id: string;
          phone: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          licence_number?: string | null;
          name: string;
          owner_id?: string;
          phone: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          licence_number?: string | null;
          name?: string;
          owner_id?: string;
          phone?: string;
        };
        Relationships: [
          {
            foreignKeyName: "drivers_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "owner_dashboard";
            referencedColumns: ["owner_id"];
          },
          {
            foreignKeyName: "drivers_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "owners";
            referencedColumns: ["id"];
          },
        ];
      };
      owners: {
        Row: {
          business_name: string;
          created_at: string;
          id: string;
          locale: Database["public"]["Enums"]["app_locale"];
          name: string;
          phone: string;
        };
        ComputedFields: never;
        Insert: {
          business_name: string;
          created_at?: string;
          id: string;
          locale?: Database["public"]["Enums"]["app_locale"];
          name: string;
          phone: string;
        };
        Update: {
          business_name?: string;
          created_at?: string;
          id?: string;
          locale?: Database["public"]["Enums"]["app_locale"];
          name?: string;
          phone?: string;
        };
        Relationships: [];
      };
      parties: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          opening_balance: number;
          owner_id: string;
          phone: string | null;
          place: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          opening_balance?: number;
          owner_id?: string;
          phone?: string | null;
          place?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          opening_balance?: number;
          owner_id?: string;
          phone?: string | null;
          place?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "parties_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "owner_dashboard";
            referencedColumns: ["owner_id"];
          },
          {
            foreignKeyName: "parties_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "owners";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          amount: number;
          client_uuid: string;
          created_at: string;
          id: string;
          mode: Database["public"]["Enums"]["payment_mode"];
          owner_id: string;
          party_id: string;
          received_on: string;
          reference: string | null;
          trip_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          amount: number;
          client_uuid: string;
          created_at?: string;
          id?: string;
          mode: Database["public"]["Enums"]["payment_mode"];
          owner_id?: string;
          party_id: string;
          received_on?: string;
          reference?: string | null;
          trip_id?: string | null;
        };
        Update: {
          amount?: number;
          client_uuid?: string;
          created_at?: string;
          id?: string;
          mode?: Database["public"]["Enums"]["payment_mode"];
          owner_id?: string;
          party_id?: string;
          received_on?: string;
          reference?: string | null;
          trip_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "payments_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "owner_dashboard";
            referencedColumns: ["owner_id"];
          },
          {
            foreignKeyName: "payments_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "owners";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_party_id_owner_id_fkey";
            columns: ["party_id", "owner_id"];
            isOneToOne: false;
            referencedRelation: "parties";
            referencedColumns: ["id", "owner_id"];
          },
          {
            foreignKeyName: "payments_party_id_owner_id_fkey";
            columns: ["party_id", "owner_id"];
            isOneToOne: false;
            referencedRelation: "party_outstanding";
            referencedColumns: ["party_id", "owner_id"];
          },
          {
            foreignKeyName: "payments_trip_id_owner_id_party_id_fkey";
            columns: ["trip_id", "owner_id", "party_id"];
            isOneToOne: false;
            referencedRelation: "trip_summary";
            referencedColumns: ["trip_id", "owner_id", "party_id"];
          },
          {
            foreignKeyName: "payments_trip_id_owner_id_party_id_fkey";
            columns: ["trip_id", "owner_id", "party_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id", "owner_id", "party_id"];
          },
        ];
      };
      trip_expenses: {
        Row: {
          amount: number;
          client_uuid: string;
          created_at: string;
          entered_by_user_id: string | null;
          id: string;
          kind: Database["public"]["Enums"]["expense_kind"];
          litres: number | null;
          odometer: number | null;
          photo_url: string | null;
          spent_on: string;
          trip_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          amount: number;
          client_uuid: string;
          created_at?: string;
          entered_by_user_id?: string | null;
          id?: string;
          kind: Database["public"]["Enums"]["expense_kind"];
          litres?: number | null;
          odometer?: number | null;
          photo_url?: string | null;
          spent_on?: string;
          trip_id: string;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          client_uuid?: string;
          created_at?: string;
          entered_by_user_id?: string | null;
          id?: string;
          kind?: Database["public"]["Enums"]["expense_kind"];
          litres?: number | null;
          odometer?: number | null;
          photo_url?: string | null;
          spent_on?: string;
          trip_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "trip_expenses_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trip_summary";
            referencedColumns: ["trip_id"];
          },
          {
            foreignKeyName: "trip_expenses_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          },
        ];
      };
      trips: {
        Row: {
          advance_from_party: number;
          client_uuid: string;
          created_at: string;
          driver_id: string | null;
          end_odometer: number | null;
          ended_on: string | null;
          freight_amount: number;
          from_place: string;
          goods: string | null;
          id: string;
          notes: string | null;
          owner_id: string;
          party_id: string;
          start_odometer: number | null;
          started_on: string;
          status: Database["public"]["Enums"]["trip_status"];
          to_place: string;
          updated_at: string;
          vehicle_id: string;
        };
        ComputedFields: never;
        Insert: {
          advance_from_party?: number;
          client_uuid: string;
          created_at?: string;
          driver_id?: string | null;
          end_odometer?: number | null;
          ended_on?: string | null;
          freight_amount: number;
          from_place: string;
          goods?: string | null;
          id?: string;
          notes?: string | null;
          owner_id?: string;
          party_id: string;
          start_odometer?: number | null;
          started_on?: string;
          status?: Database["public"]["Enums"]["trip_status"];
          to_place: string;
          updated_at?: string;
          vehicle_id: string;
        };
        Update: {
          advance_from_party?: number;
          client_uuid?: string;
          created_at?: string;
          driver_id?: string | null;
          end_odometer?: number | null;
          ended_on?: string | null;
          freight_amount?: number;
          from_place?: string;
          goods?: string | null;
          id?: string;
          notes?: string | null;
          owner_id?: string;
          party_id?: string;
          start_odometer?: number | null;
          started_on?: string;
          status?: Database["public"]["Enums"]["trip_status"];
          to_place?: string;
          updated_at?: string;
          vehicle_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "trips_driver_id_owner_id_fkey";
            columns: ["driver_id", "owner_id"];
            isOneToOne: false;
            referencedRelation: "drivers";
            referencedColumns: ["id", "owner_id"];
          },
          {
            foreignKeyName: "trips_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "owner_dashboard";
            referencedColumns: ["owner_id"];
          },
          {
            foreignKeyName: "trips_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "owners";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "trips_party_id_owner_id_fkey";
            columns: ["party_id", "owner_id"];
            isOneToOne: false;
            referencedRelation: "parties";
            referencedColumns: ["id", "owner_id"];
          },
          {
            foreignKeyName: "trips_party_id_owner_id_fkey";
            columns: ["party_id", "owner_id"];
            isOneToOne: false;
            referencedRelation: "party_outstanding";
            referencedColumns: ["party_id", "owner_id"];
          },
          {
            foreignKeyName: "trips_vehicle_id_owner_id_fkey";
            columns: ["vehicle_id", "owner_id"];
            isOneToOne: false;
            referencedRelation: "vehicle_odometer";
            referencedColumns: ["vehicle_id", "owner_id"];
          },
          {
            foreignKeyName: "trips_vehicle_id_owner_id_fkey";
            columns: ["vehicle_id", "owner_id"];
            isOneToOne: false;
            referencedRelation: "vehicles";
            referencedColumns: ["id", "owner_id"];
          },
        ];
      };
      vehicle_documents: {
        Row: {
          created_at: string;
          doc_type: Database["public"]["Enums"]["doc_type"];
          expires_on: string;
          file_url: string | null;
          id: string;
          vehicle_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          doc_type: Database["public"]["Enums"]["doc_type"];
          expires_on: string;
          file_url?: string | null;
          id?: string;
          vehicle_id: string;
        };
        Update: {
          created_at?: string;
          doc_type?: Database["public"]["Enums"]["doc_type"];
          expires_on?: string;
          file_url?: string | null;
          id?: string;
          vehicle_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vehicle_documents_vehicle_id_fkey";
            columns: ["vehicle_id"];
            isOneToOne: false;
            referencedRelation: "vehicle_odometer";
            referencedColumns: ["vehicle_id"];
          },
          {
            foreignKeyName: "vehicle_documents_vehicle_id_fkey";
            columns: ["vehicle_id"];
            isOneToOne: false;
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          },
        ];
      };
      vehicles: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean;
          nickname: string | null;
          owner_id: string;
          reg_number: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          nickname?: string | null;
          owner_id?: string;
          reg_number: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          nickname?: string | null;
          owner_id?: string;
          reg_number?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vehicles_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "owner_dashboard";
            referencedColumns: ["owner_id"];
          },
          {
            foreignKeyName: "vehicles_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "owners";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      owner_dashboard: {
        Row: {
          month_profit: number | null;
          owner_id: string;
          total_outstanding: number | null;
        };
        ComputedFields: never;
        Insert: {
          month_profit?: never;
          owner_id?: string | null;
          total_outstanding?: never;
        };
        Update: {
          month_profit?: never;
          owner_id?: string | null;
          total_outstanding?: never;
        };
        Relationships: [];
      };
      party_ledger: {
        Row: {
          balance: number | null;
          created_at: string | null;
          credit: number | null;
          debit: number | null;
          entry_date: string | null;
          from_place: string | null;
          kind: string | null;
          mode: Database["public"]["Enums"]["payment_mode"] | null;
          owner_id: string | null;
          party_id: string | null;
          ref_id: string | null;
          reference: string | null;
          seq: number | null;
          to_place: string | null;
          trip_client_uuid: string | null;
        };
        ComputedFields: never;
        Relationships: [];
      };
      party_outstanding: {
        Row: {
          advance_received: number | null;
          billed: number | null;
          name: string;
          opening_balance: number;
          outstanding: number | null;
          owner_id: string;
          party_id: string;
          payments_received: number | null;
          phone: string | null;
          place: string | null;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "parties_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "owner_dashboard";
            referencedColumns: ["owner_id"];
          },
          {
            foreignKeyName: "parties_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "owners";
            referencedColumns: ["id"];
          },
        ];
      };
      trip_summary: {
        Row: {
          advance_from_party: number;
          bata_amount: number | null;
          client_uuid: string;
          created_at: string;
          diesel_amount: number | null;
          distance_km: number | null;
          driver_id: string | null;
          driver_name: string | null;
          end_odometer: number | null;
          ended_on: string | null;
          expense_count: number | null;
          expense_total: number | null;
          fine_amount: number | null;
          freight_amount: number;
          from_place: string;
          goods: string | null;
          litres: number | null;
          mileage_kmpl: number | null;
          other_amount: number | null;
          owner_id: string;
          party_id: string;
          party_name: string;
          profit: number | null;
          repair_amount: number | null;
          start_odometer: number | null;
          started_on: string;
          status: Database["public"]["Enums"]["trip_status"];
          to_place: string;
          toll_amount: number | null;
          trip_id: string;
          vehicle_id: string;
          vehicle_nickname: string | null;
          vehicle_reg: string;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "trips_driver_id_owner_id_fkey";
            columns: ["driver_id", "owner_id"];
            isOneToOne: false;
            referencedRelation: "drivers";
            referencedColumns: ["id", "owner_id"];
          },
          {
            foreignKeyName: "trips_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "owner_dashboard";
            referencedColumns: ["owner_id"];
          },
          {
            foreignKeyName: "trips_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "owners";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "trips_party_id_owner_id_fkey";
            columns: ["party_id", "owner_id"];
            isOneToOne: false;
            referencedRelation: "parties";
            referencedColumns: ["id", "owner_id"];
          },
          {
            foreignKeyName: "trips_party_id_owner_id_fkey";
            columns: ["party_id", "owner_id"];
            isOneToOne: false;
            referencedRelation: "party_outstanding";
            referencedColumns: ["party_id", "owner_id"];
          },
          {
            foreignKeyName: "trips_vehicle_id_owner_id_fkey";
            columns: ["vehicle_id", "owner_id"];
            isOneToOne: false;
            referencedRelation: "vehicle_odometer";
            referencedColumns: ["vehicle_id", "owner_id"];
          },
          {
            foreignKeyName: "trips_vehicle_id_owner_id_fkey";
            columns: ["vehicle_id", "owner_id"];
            isOneToOne: false;
            referencedRelation: "vehicles";
            referencedColumns: ["id", "owner_id"];
          },
        ];
      };
      vehicle_mileage: {
        Row: {
          distance_km: number | null;
          litres: number | null;
          mileage_kmpl: number | null;
          month: string | null;
          owner_id: string;
          trailing_avg_kmpl: number | null;
          trips: number | null;
          vehicle_id: string;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "trips_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "owner_dashboard";
            referencedColumns: ["owner_id"];
          },
          {
            foreignKeyName: "trips_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "owners";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "trips_vehicle_id_owner_id_fkey";
            columns: ["vehicle_id", "owner_id"];
            isOneToOne: false;
            referencedRelation: "vehicle_odometer";
            referencedColumns: ["vehicle_id", "owner_id"];
          },
          {
            foreignKeyName: "trips_vehicle_id_owner_id_fkey";
            columns: ["vehicle_id", "owner_id"];
            isOneToOne: false;
            referencedRelation: "vehicles";
            referencedColumns: ["id", "owner_id"];
          },
        ];
      };
      vehicle_odometer: {
        Row: {
          last_odometer: number | null;
          owner_id: string;
          vehicle_id: string;
        };
        ComputedFields: never;
        Insert: {
          last_odometer?: never;
          owner_id?: string | null;
          vehicle_id?: string | null;
        };
        Update: {
          last_odometer?: never;
          owner_id?: string | null;
          vehicle_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "vehicles_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "owner_dashboard";
            referencedColumns: ["owner_id"];
          },
          {
            foreignKeyName: "vehicles_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "owners";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      driver_open_trips: {
        Args: Record<PropertyKey, never>;
        Returns: {
          from_place: string;
          goods: string;
          started_on: string;
          to_place: string;
          trip_id: string;
          vehicle_nickname: string;
          vehicle_reg: string;
        }[];
      };
    };
    Enums: {
      app_locale: "ta" | "en";
      doc_type: "fc" | "insurance" | "permit" | "pollution" | "national_permit";
      expense_kind: "diesel" | "toll" | "bata" | "repair" | "fine" | "other";
      payment_mode: "upi" | "cash" | "cheque" | "bank";
      trip_status: "open" | "closed" | "cancelled";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_locale: ["ta", "en"],
      doc_type: ["fc", "insurance", "permit", "pollution", "national_permit"],
      expense_kind: ["diesel", "toll", "bata", "repair", "fine", "other"],
      payment_mode: ["upi", "cash", "cheque", "bank"],
      trip_status: ["open", "closed", "cancelled"],
    },
  },
} as const;
