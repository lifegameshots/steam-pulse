// Supabase 데이터베이스 타입

export interface Database {
  public: {
    Tables: {
      teams: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
        };
      };
      
      team_members: {
        Row: {
          id: string;
          team_id: string;
          user_id: string;
          role: string;
          joined_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          user_id: string;
          role?: string;
          joined_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          user_id?: string;
          role?: string;
          joined_at?: string;
        };
      };
      
      watchlist: {
        Row: {
          id: string;
          user_id: string;
          team_id: string | null;
          app_id: number;
          app_name: string;
          added_at: string;
          alerts_enabled: boolean;
          alert_settings: {
            ccu_spike: number;
            ccu_drop: number;
            review_spike: number;
            price_change: boolean;
            update_news: boolean;
            rating_change: number;
          };
        };
        Insert: {
          id?: string;
          user_id: string;
          team_id?: string | null;
          app_id: number;
          app_name: string;
          added_at?: string;
          alerts_enabled?: boolean;
          alert_settings?: {
            ccu_spike: number;
            ccu_drop: number;
            review_spike: number;
            price_change: boolean;
            update_news: boolean;
            rating_change: number;
          };
        };
        Update: {
          id?: string;
          user_id?: string;
          team_id?: string | null;
          app_id?: number;
          app_name?: string;
          added_at?: string;
          alerts_enabled?: boolean;
          alert_settings?: {
            ccu_spike: number;
            ccu_drop: number;
            review_spike: number;
            price_change: boolean;
            update_news: boolean;
            rating_change: number;
          };
        };
      };
      
      ccu_history: {
        Row: {
          id: number;
          app_id: number;
          ccu: number;
          recorded_at: string;
        };
        Insert: {
          id?: number;
          app_id: number;
          ccu: number;
          recorded_at?: string;
        };
        Update: {
          id?: number;
          app_id?: number;
          ccu?: number;
          recorded_at?: string;
        };
      };
      
      review_history: {
        Row: {
          id: number;
          app_id: number;
          total_reviews: number;
          positive: number;
          negative: number;
          recorded_at: string;
        };
        Insert: {
          id?: number;
          app_id: number;
          total_reviews: number;
          positive: number;
          negative: number;
          recorded_at?: string;
        };
        Update: {
          id?: number;
          app_id?: number;
          total_reviews?: number;
          positive?: number;
          negative?: number;
          recorded_at?: string;
        };
      };
      
      follower_history: {
        Row: {
          id: number;
          app_id: number;
          follower_count: number;
          recorded_at: string;
        };
        Insert: {
          id?: number;
          app_id: number;
          follower_count: number;
          recorded_at?: string;
        };
        Update: {
          id?: number;
          app_id?: number;
          follower_count?: number;
          recorded_at?: string;
        };
      };
      
      price_history: {
        Row: {
          id: number;
          app_id: number;
          price_usd: number;
          discount_percent: number;
          recorded_at: string;
        };
        Insert: {
          id?: number;
          app_id: number;
          price_usd: number;
          discount_percent?: number;
          recorded_at?: string;
        };
        Update: {
          id?: number;
          app_id?: number;
          price_usd?: number;
          discount_percent?: number;
          recorded_at?: string;
        };
      };
      
      insight_cache: {
        Row: {
          id: string;
          cache_key: string;
          insight_text: string;
          created_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          cache_key: string;
          insight_text: string;
          created_at?: string;
          expires_at: string;
        };
        Update: {
          id?: string;
          cache_key?: string;
          insight_text?: string;
          created_at?: string;
          expires_at?: string;
        };
      };
      
      gemini_key_usage: {
        Row: {
          id: number;
          key_index: number;
          used_at: string;
          request_count: number;
        };
        Insert: {
          id?: number;
          key_index: number;
          used_at?: string;
          request_count?: number;
        };
        Update: {
          id?: number;
          key_index?: number;
          used_at?: string;
          request_count?: number;
        };
      };
      
      alert_logs: {
        Row: {
          id: string;
          user_id: string;
          app_id: number;
          alert_type: string;
          message: string;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          app_id: number;
          alert_type: string;
          message: string;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          app_id?: number;
          alert_type?: string;
          message?: string;
          is_read?: boolean;
          created_at?: string;
        };
      };
      
      game_cache: {
        Row: {
          app_id: number;
          name: string;
          developer: string;
          publisher: string;
          release_date: string;
          genres: string[];
          tags: string[];
          price_usd: number;
          total_reviews: number;
          positive_ratio: number;
          header_image: string;
          updated_at: string;
        };
        Insert: {
          app_id: number;
          name: string;
          developer?: string;
          publisher?: string;
          release_date?: string;
          genres?: string[];
          tags?: string[];
          price_usd?: number;
          total_reviews?: number;
          positive_ratio?: number;
          header_image?: string;
          updated_at?: string;
        };
        Update: {
          app_id?: number;
          name?: string;
          developer?: string;
          publisher?: string;
          release_date?: string;
          genres?: string[];
          tags?: string[];
          price_usd?: number;
          total_reviews?: number;
          positive_ratio?: number;
          header_image?: string;
          updated_at?: string;
        };
      };
    };
    
    Functions: {
      increment_gemini_usage: {
        Args: {
          p_key_index: number;
          p_date: string;
        };
        Returns: void;
      };
      get_least_used_key: {
        Args: {
          p_key_count: number;
          p_daily_limit?: number;
        };
        Returns: number;
      };
    };
  };
}

export type Tables<T extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][T]['Row'];

export type InsertTables<T extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][T]['Insert'];

export type UpdateTables<T extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][T]['Update'];