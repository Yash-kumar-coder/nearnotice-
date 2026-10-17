export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          created_at?: string;
        };
      };
      notices: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          body: string | null;
          category: string;
          image_path: string | null;
          images?: string[] | null;
          area_label: string;
          latitude: number | null;
          longitude: number | null;
          price?: number | null;
          contact_number?: string | null;
          contact_type?: 'whatsapp' | 'call' | 'both' | string | null;
          views_count?: number | null;
          status: 'draft' | 'published' | 'removed';
          created_at: string;
          updated_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string;
          title: string;
          body?: string | null;
          category: string;
          image_path?: string | null;
          images?: string[] | null;
          area_label: string;
          latitude?: number | null;
          longitude?: number | null;
          price?: number | null;
          contact_number?: string | null;
          contact_type?: 'whatsapp' | 'call' | 'both' | string | null;
          status?: 'draft' | 'published' | 'removed';
          created_at?: string;
          updated_at?: string;
          expires_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          title?: string;
          body?: string | null;
          category?: string;
          image_path?: string | null;
          images?: string[] | null;
          area_label?: string;
          latitude?: number | null;
          longitude?: number | null;
          price?: number | null;
          contact_number?: string | null;
          contact_type?: 'whatsapp' | 'call' | 'both' | string | null;
          status?: 'draft' | 'published' | 'removed';
          created_at?: string;
          updated_at?: string;
          expires_at?: string;
        };
      };
    };
    Views: {
      public_notices: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          body: string | null;
          category: string;
          image_path: string | null;
          images?: string[] | null;
          area_label: string;
          latitude: number | null;
          longitude: number | null;
          price?: number | null;
          contact_type?: 'whatsapp' | 'call' | 'both' | string | null;
          views_count?: number | null;
          created_at: string;
          expires_at: string;
          author_name?: string | null;
        };
      };
    };
    Functions: {
      increment_notice_views: {
        Args: { notice_id: string };
        Returns: void;
      };
      get_notice_contact: {
        Args: { target_notice_id: string };
        Returns: {
          contact_number: string;
          contact_type: string;
        }[];
      };
    };
  };
}

export type PublicNotice = Database['public']['Views']['public_notices']['Row'] & {
  contact_number?: string | null;
  author_avatar?: string | null;
  distance_km?: number | null;
};
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Notice = Database['public']['Tables']['notices']['Row'];
