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

      calendar_events: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          type: string;
          importance: string;
          status: string;
          start_date: string;
          end_date: string | null;
          is_all_day: boolean;
          app_id: string | null;
          game_name: string | null;
          source: string;
          source_url: string | null;
          tags: string[] | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          title: string;
          description?: string | null;
          type: string;
          importance?: string;
          status?: string;
          start_date: string;
          end_date?: string | null;
          is_all_day?: boolean;
          app_id?: string | null;
          game_name?: string | null;
          source?: string;
          source_url?: string | null;
          tags?: string[] | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          type?: string;
          importance?: string;
          status?: string;
          start_date?: string;
          end_date?: string | null;
          is_all_day?: boolean;
          app_id?: string | null;
          game_name?: string | null;
          source?: string;
          source_url?: string | null;
          tags?: string[] | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };

      projects: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          type: string;
          status: string;
          visibility: string;
          owner_id: string;
          owner_email: string | null;
          games: unknown;
          members: unknown;
          notes: unknown;
          settings: unknown;
          tags: string[] | null;
          color: string | null;
          created_at: string;
          updated_at: string;
          archived_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          type?: string;
          status?: string;
          visibility?: string;
          owner_id: string;
          owner_email?: string | null;
          games?: unknown;
          members?: unknown;
          notes?: unknown;
          settings?: unknown;
          tags?: string[] | null;
          color?: string | null;
          created_at?: string;
          updated_at?: string;
          archived_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          type?: string;
          status?: string;
          visibility?: string;
          owner_id?: string;
          owner_email?: string | null;
          games?: unknown;
          members?: unknown;
          notes?: unknown;
          settings?: unknown;
          tags?: string[] | null;
          color?: string | null;
          created_at?: string;
          updated_at?: string;
          archived_at?: string | null;
        };
      };

      alert_rules: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          type: string;
          enabled: boolean;
          target_type: string;
          target_ids: string[] | null;
          conditions: unknown;
          condition_logic: string;
          channels: string[] | null;
          priority: string;
          cooldown_minutes: number;
          created_by: string;
          created_at: string;
          updated_at: string;
          last_triggered_at: string | null;
          trigger_count: number;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          type: string;
          enabled?: boolean;
          target_type?: string;
          target_ids?: string[] | null;
          conditions: unknown;
          condition_logic?: string;
          channels?: string[] | null;
          priority?: string;
          cooldown_minutes?: number;
          created_by: string;
          created_at?: string;
          updated_at?: string;
          last_triggered_at?: string | null;
          trigger_count?: number;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          type?: string;
          enabled?: boolean;
          target_type?: string;
          target_ids?: string[] | null;
          conditions?: unknown;
          condition_logic?: string;
          channels?: string[] | null;
          priority?: string;
          cooldown_minutes?: number;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
          last_triggered_at?: string | null;
          trigger_count?: number;
        };
      };

      alert_messages: {
        Row: {
          id: string;
          user_id: string;
          rule_id: string | null;
          title: string;
          body: string | null;
          priority: string;
          status: string;
          channels: string[] | null;
          metadata: unknown | null;
          created_at: string;
          read_at: string | null;
          delivered_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          rule_id?: string | null;
          title: string;
          body?: string | null;
          priority?: string;
          status?: string;
          channels?: string[] | null;
          metadata?: unknown | null;
          created_at?: string;
          read_at?: string | null;
          delivered_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          rule_id?: string | null;
          title?: string;
          body?: string | null;
          priority?: string;
          status?: string;
          channels?: string[] | null;
          metadata?: unknown | null;
          created_at?: string;
          read_at?: string | null;
          delivered_at?: string | null;
        };
      };

      alert_settings: {
        Row: {
          user_id: string;
          channels: unknown;
          priority_filter: string[] | null;
          quiet_hours: unknown | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          channels?: unknown;
          priority_filter?: string[] | null;
          quiet_hours?: unknown | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          channels?: unknown;
          priority_filter?: string[] | null;
          quiet_hours?: unknown | null;
          created_at?: string;
          updated_at?: string;
        };
      };

      reports: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          type: string;
          status: string;
          sections: unknown;
          created_by: string;
          created_by_name: string | null;
          created_at: string;
          updated_at: string;
          published_at: string | null;
          target_app_ids: string[] | null;
          target_project_id: string | null;
          is_public: boolean;
          share_link: string | null;
          share_password: string | null;
          share_expiry: string | null;
          shares: unknown;
          theme: unknown | null;
          cover_image: string | null;
          logo: string | null;
          tags: string[] | null;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          type?: string;
          status?: string;
          sections?: unknown;
          created_by: string;
          created_by_name?: string | null;
          created_at?: string;
          updated_at?: string;
          published_at?: string | null;
          target_app_ids?: string[] | null;
          target_project_id?: string | null;
          is_public?: boolean;
          share_link?: string | null;
          share_password?: string | null;
          share_expiry?: string | null;
          shares?: unknown;
          theme?: unknown | null;
          cover_image?: string | null;
          logo?: string | null;
          tags?: string[] | null;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          type?: string;
          status?: string;
          sections?: unknown;
          created_by?: string;
          created_by_name?: string | null;
          created_at?: string;
          updated_at?: string;
          published_at?: string | null;
          target_app_ids?: string[] | null;
          target_project_id?: string | null;
          is_public?: boolean;
          share_link?: string | null;
          share_password?: string | null;
          share_expiry?: string | null;
          shares?: unknown;
          theme?: unknown | null;
          cover_image?: string | null;
          logo?: string | null;
          tags?: string[] | null;
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
      refresh_game_daily_stats: {
        Args: Record<string, never>;
        Returns: void;
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