export type Database = {
  public: {
    Tables: {
      participants: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          slug: string;
          display_name: string;
          first_name: string;
          last_name: string;
          search_name: string;
          photo_file_name: string | null;
          photo_url: string | null;
          status: "waiting" | "submitted";
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          slug: string;
          display_name: string;
          first_name: string;
          last_name: string;
          search_name: string;
          photo_file_name?: string | null;
          photo_url?: string | null;
          status?: "waiting" | "submitted";
        };
        Update: {
          updated_at?: string;
          display_name?: string;
          first_name?: string;
          last_name?: string;
          search_name?: string;
          photo_file_name?: string | null;
          photo_url?: string | null;
          status?: "waiting" | "submitted";
        };
        Relationships: [];
      };
      submissions: {
        Row: {
          id: string;
          created_at: string;
          participant_id: string;
          first_name: string;
          last_name: string;
          size: "XS" | "S" | "M" | "L" | "XL" | "XXL" | "3XL";
          word_1: string;
          word_2: string;
          word_3: string;
          initials_language: "RU" | "UA" | "EN";
          back_name_asset_path: string | null;
          back_name_first_name: string | null;
          back_name_last_name: string | null;
          back_name_text: string | null;
          client_submission_id: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          participant_id: string;
          first_name: string;
          last_name: string;
          size: "XS" | "S" | "M" | "L" | "XL" | "XXL" | "3XL";
          word_1: string;
          word_2: string;
          word_3: string;
          initials_language?: "RU" | "UA" | "EN";
          back_name_asset_path?: string | null;
          back_name_first_name?: string | null;
          back_name_last_name?: string | null;
          back_name_text?: string | null;
          client_submission_id?: string | null;
        };
        Update: {
          first_name?: string;
          last_name?: string;
          size?: "XS" | "S" | "M" | "L" | "XL" | "XXL" | "3XL";
          word_1?: string;
          word_2?: string;
          word_3?: string;
          initials_language?: "RU" | "UA" | "EN";
          back_name_asset_path?: string | null;
          back_name_first_name?: string | null;
          back_name_last_name?: string | null;
          back_name_text?: string | null;
          client_submission_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "submissions_participant_id_fkey";
            columns: ["participant_id"];
            isOneToOne: false;
            referencedRelation: "participants";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
