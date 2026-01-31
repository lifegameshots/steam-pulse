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

      // ============================================
      // 스트리밍 분석 테이블
      // ============================================

      streaming_history: {
        Row: {
          id: number;
          game_name: string;
          steam_app_id: number | null;
          platform: 'twitch' | 'chzzk' | 'total';
          total_viewers: number;
          live_streams: number;
          peak_viewers: number | null;
          unique_streamers: number | null;
          top_streamers: unknown;
          recorded_at: string;
        };
        Insert: {
          id?: number;
          game_name: string;
          steam_app_id?: number | null;
          platform: 'twitch' | 'chzzk' | 'total';
          total_viewers: number;
          live_streams: number;
          peak_viewers?: number | null;
          unique_streamers?: number | null;
          top_streamers?: unknown;
          recorded_at?: string;
        };
        Update: {
          id?: number;
          game_name?: string;
          steam_app_id?: number | null;
          platform?: 'twitch' | 'chzzk' | 'total';
          total_viewers?: number;
          live_streams?: number;
          peak_viewers?: number | null;
          unique_streamers?: number | null;
          top_streamers?: unknown;
          recorded_at?: string;
        };
      };

      streaming_daily_stats: {
        Row: {
          id: number;
          game_name: string;
          steam_app_id: number | null;
          platform: string;
          date: string;
          avg_viewers: number | null;
          peak_viewers: number | null;
          total_stream_hours: number | null;
          unique_streamers: number | null;
          avg_streams: number | null;
          viewer_change_pct: number | null;
          stream_change_pct: number | null;
        };
        Insert: {
          id?: number;
          game_name: string;
          steam_app_id?: number | null;
          platform: string;
          date: string;
          avg_viewers?: number | null;
          peak_viewers?: number | null;
          total_stream_hours?: number | null;
          unique_streamers?: number | null;
          avg_streams?: number | null;
          viewer_change_pct?: number | null;
          stream_change_pct?: number | null;
        };
        Update: {
          id?: number;
          game_name?: string;
          steam_app_id?: number | null;
          platform?: string;
          date?: string;
          avg_viewers?: number | null;
          peak_viewers?: number | null;
          total_stream_hours?: number | null;
          unique_streamers?: number | null;
          avg_streams?: number | null;
          viewer_change_pct?: number | null;
          stream_change_pct?: number | null;
        };
      };

      streamers: {
        Row: {
          id: string;
          platform: string;
          platform_id: string;
          display_name: string;
          login_name: string | null;
          profile_image_url: string | null;
          description: string | null;
          language: string | null;
          follower_count: number;
          subscriber_count: number | null;
          tier: 'mega' | 'macro' | 'micro' | 'nano';
          contact_email: string | null;
          contact_discord: string | null;
          contact_twitter: string | null;
          business_inquiry_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          platform: string;
          platform_id: string;
          display_name: string;
          login_name?: string | null;
          profile_image_url?: string | null;
          description?: string | null;
          language?: string | null;
          follower_count?: number;
          subscriber_count?: number | null;
          tier?: 'mega' | 'macro' | 'micro' | 'nano';
          contact_email?: string | null;
          contact_discord?: string | null;
          contact_twitter?: string | null;
          business_inquiry_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          platform?: string;
          platform_id?: string;
          display_name?: string;
          login_name?: string | null;
          profile_image_url?: string | null;
          description?: string | null;
          language?: string | null;
          follower_count?: number;
          subscriber_count?: number | null;
          tier?: 'mega' | 'macro' | 'micro' | 'nano';
          contact_email?: string | null;
          contact_discord?: string | null;
          contact_twitter?: string | null;
          business_inquiry_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };

      streamer_activity: {
        Row: {
          id: number;
          streamer_id: string;
          game_name: string;
          steam_app_id: number | null;
          stream_title: string | null;
          viewer_count: number;
          follower_count_snapshot: number | null;
          started_at: string | null;
          ended_at: string | null;
          duration_minutes: number | null;
          recorded_at: string;
        };
        Insert: {
          id?: number;
          streamer_id: string;
          game_name: string;
          steam_app_id?: number | null;
          stream_title?: string | null;
          viewer_count: number;
          follower_count_snapshot?: number | null;
          started_at?: string | null;
          ended_at?: string | null;
          duration_minutes?: number | null;
          recorded_at?: string;
        };
        Update: {
          id?: number;
          streamer_id?: string;
          game_name?: string;
          steam_app_id?: number | null;
          stream_title?: string | null;
          viewer_count?: number;
          follower_count_snapshot?: number | null;
          started_at?: string | null;
          ended_at?: string | null;
          duration_minutes?: number | null;
          recorded_at?: string;
        };
      };

      streamer_games: {
        Row: {
          id: string;
          streamer_id: string;
          game_name: string;
          steam_app_id: number | null;
          total_streams: number;
          total_hours: number;
          avg_viewers: number;
          peak_viewers: number;
          last_streamed_at: string | null;
          first_streamed_at: string | null;
          affinity_score: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          streamer_id: string;
          game_name: string;
          steam_app_id?: number | null;
          total_streams?: number;
          total_hours?: number;
          avg_viewers?: number;
          peak_viewers?: number;
          last_streamed_at?: string | null;
          first_streamed_at?: string | null;
          affinity_score?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          streamer_id?: string;
          game_name?: string;
          steam_app_id?: number | null;
          total_streams?: number;
          total_hours?: number;
          avg_viewers?: number;
          peak_viewers?: number;
          last_streamed_at?: string | null;
          first_streamed_at?: string | null;
          affinity_score?: number;
          updated_at?: string;
        };
      };

      game_daily_metrics: {
        Row: {
          id: number;
          steam_app_id: number;
          game_name: string;
          date: string;
          ccu_avg: number | null;
          ccu_peak: number | null;
          review_count: number | null;
          review_positive: number | null;
          price_usd: number | null;
          discount_percent: number;
          streaming_viewers_avg: number | null;
          streaming_viewers_peak: number | null;
          streaming_streams_avg: number | null;
          streaming_unique_streamers: number | null;
          streaming_hours_total: number | null;
          twitch_viewers_avg: number | null;
          twitch_streams_avg: number | null;
          chzzk_viewers_avg: number | null;
          chzzk_streams_avg: number | null;
          ccu_change_1d: number | null;
          ccu_change_7d: number | null;
          streaming_change_1d: number | null;
          streaming_change_7d: number | null;
          streaming_to_ccu_ratio: number | null;
          viewer_conversion_rate: number | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          steam_app_id: number;
          game_name: string;
          date: string;
          ccu_avg?: number | null;
          ccu_peak?: number | null;
          review_count?: number | null;
          review_positive?: number | null;
          price_usd?: number | null;
          discount_percent?: number;
          streaming_viewers_avg?: number | null;
          streaming_viewers_peak?: number | null;
          streaming_streams_avg?: number | null;
          streaming_unique_streamers?: number | null;
          streaming_hours_total?: number | null;
          twitch_viewers_avg?: number | null;
          twitch_streams_avg?: number | null;
          chzzk_viewers_avg?: number | null;
          chzzk_streams_avg?: number | null;
          ccu_change_1d?: number | null;
          ccu_change_7d?: number | null;
          streaming_change_1d?: number | null;
          streaming_change_7d?: number | null;
          streaming_to_ccu_ratio?: number | null;
          viewer_conversion_rate?: number | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          steam_app_id?: number;
          game_name?: string;
          date?: string;
          ccu_avg?: number | null;
          ccu_peak?: number | null;
          review_count?: number | null;
          review_positive?: number | null;
          price_usd?: number | null;
          discount_percent?: number;
          streaming_viewers_avg?: number | null;
          streaming_viewers_peak?: number | null;
          streaming_streams_avg?: number | null;
          streaming_unique_streamers?: number | null;
          streaming_hours_total?: number | null;
          twitch_viewers_avg?: number | null;
          twitch_streams_avg?: number | null;
          chzzk_viewers_avg?: number | null;
          chzzk_streams_avg?: number | null;
          ccu_change_1d?: number | null;
          ccu_change_7d?: number | null;
          streaming_change_1d?: number | null;
          streaming_change_7d?: number | null;
          streaming_to_ccu_ratio?: number | null;
          viewer_conversion_rate?: number | null;
          created_at?: string;
        };
      };

      influencer_impact_events: {
        Row: {
          id: string;
          streamer_id: string | null;
          streamer_name: string;
          streamer_tier: string | null;
          streamer_followers: number | null;
          game_name: string;
          steam_app_id: number | null;
          stream_started_at: string;
          stream_ended_at: string | null;
          stream_duration_minutes: number | null;
          stream_peak_viewers: number;
          stream_avg_viewers: number | null;
          ccu_before: number | null;
          ccu_during_peak: number | null;
          ccu_after: number | null;
          ccu_change_pct: number | null;
          reviews_before_24h: number | null;
          reviews_after_24h: number | null;
          review_spike_pct: number | null;
          estimated_views: number | null;
          estimated_purchases: number | null;
          estimated_revenue_usd: number | null;
          impact_score: number | null;
          impact_grade: string | null;
          is_sponsored: boolean;
          campaign_id: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          streamer_id?: string | null;
          streamer_name: string;
          streamer_tier?: string | null;
          streamer_followers?: number | null;
          game_name: string;
          steam_app_id?: number | null;
          stream_started_at: string;
          stream_ended_at?: string | null;
          stream_duration_minutes?: number | null;
          stream_peak_viewers: number;
          stream_avg_viewers?: number | null;
          ccu_before?: number | null;
          ccu_during_peak?: number | null;
          ccu_after?: number | null;
          ccu_change_pct?: number | null;
          reviews_before_24h?: number | null;
          reviews_after_24h?: number | null;
          review_spike_pct?: number | null;
          estimated_views?: number | null;
          estimated_purchases?: number | null;
          estimated_revenue_usd?: number | null;
          impact_score?: number | null;
          impact_grade?: string | null;
          is_sponsored?: boolean;
          campaign_id?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          streamer_id?: string | null;
          streamer_name?: string;
          streamer_tier?: string | null;
          streamer_followers?: number | null;
          game_name?: string;
          steam_app_id?: number | null;
          stream_started_at?: string;
          stream_ended_at?: string | null;
          stream_duration_minutes?: number | null;
          stream_peak_viewers?: number;
          stream_avg_viewers?: number | null;
          ccu_before?: number | null;
          ccu_during_peak?: number | null;
          ccu_after?: number | null;
          ccu_change_pct?: number | null;
          reviews_before_24h?: number | null;
          reviews_after_24h?: number | null;
          review_spike_pct?: number | null;
          estimated_views?: number | null;
          estimated_purchases?: number | null;
          estimated_revenue_usd?: number | null;
          impact_score?: number | null;
          impact_grade?: string | null;
          is_sponsored?: boolean;
          campaign_id?: string | null;
          notes?: string | null;
          created_at?: string;
        };
      };

      marketing_campaigns: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          game_name: string;
          steam_app_id: number | null;
          start_date: string;
          end_date: string | null;
          status: 'draft' | 'active' | 'paused' | 'completed';
          budget_usd: number | null;
          spent_usd: number;
          target_streamers: string[];
          confirmed_streamers: string[];
          total_streams: number;
          total_viewers: number;
          total_stream_hours: number;
          estimated_impressions: number;
          estimated_purchases: number;
          estimated_revenue_usd: number;
          roi_percentage: number | null;
          cost_per_viewer: number | null;
          cost_per_purchase: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          game_name: string;
          steam_app_id?: number | null;
          start_date: string;
          end_date?: string | null;
          status?: 'draft' | 'active' | 'paused' | 'completed';
          budget_usd?: number | null;
          spent_usd?: number;
          target_streamers?: string[];
          confirmed_streamers?: string[];
          total_streams?: number;
          total_viewers?: number;
          total_stream_hours?: number;
          estimated_impressions?: number;
          estimated_purchases?: number;
          estimated_revenue_usd?: number;
          roi_percentage?: number | null;
          cost_per_viewer?: number | null;
          cost_per_purchase?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          game_name?: string;
          steam_app_id?: number | null;
          start_date?: string;
          end_date?: string | null;
          status?: 'draft' | 'active' | 'paused' | 'completed';
          budget_usd?: number | null;
          spent_usd?: number;
          target_streamers?: string[];
          confirmed_streamers?: string[];
          total_streams?: number;
          total_viewers?: number;
          total_stream_hours?: number;
          estimated_impressions?: number;
          estimated_purchases?: number;
          estimated_revenue_usd?: number;
          roi_percentage?: number | null;
          cost_per_viewer?: number | null;
          cost_per_purchase?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };

      streaming_alerts: {
        Row: {
          id: string;
          user_id: string;
          alert_type: 'viewer_spike' | 'new_influencer' | 'competitor_surge' | 'trend_change';
          game_name: string | null;
          steam_app_id: number | null;
          streamer_id: string | null;
          streamer_name: string | null;
          title: string;
          message: string | null;
          metrics: unknown | null;
          is_read: boolean;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          alert_type: 'viewer_spike' | 'new_influencer' | 'competitor_surge' | 'trend_change';
          game_name?: string | null;
          steam_app_id?: number | null;
          streamer_id?: string | null;
          streamer_name?: string | null;
          title: string;
          message?: string | null;
          metrics?: unknown | null;
          is_read?: boolean;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          alert_type?: 'viewer_spike' | 'new_influencer' | 'competitor_surge' | 'trend_change';
          game_name?: string | null;
          steam_app_id?: number | null;
          streamer_id?: string | null;
          streamer_name?: string | null;
          title?: string;
          message?: string | null;
          metrics?: unknown | null;
          is_read?: boolean;
          read_at?: string | null;
          created_at?: string;
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
      aggregate_streaming_daily_stats: {
        Args: {
          p_date?: string;
        };
        Returns: number;
      };
      calculate_impact_score: {
        Args: {
          p_stream_viewers: number;
          p_ccu_change_pct: number;
          p_review_spike_pct: number;
        };
        Returns: number;
      };
      get_impact_grade: {
        Args: {
          p_score: number;
        };
        Returns: string;
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