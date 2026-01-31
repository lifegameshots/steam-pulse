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
    PostgrestVersion: "14.1"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      alert_logs: {
        Row: {
          alert_type: string | null
          app_id: number
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string | null
          user_id: string | null
        }
        Insert: {
          alert_type?: string | null
          app_id: number
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          user_id?: string | null
        }
        Update: {
          alert_type?: string | null
          app_id?: number
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      alert_messages: {
        Row: {
          body: string | null
          channels: string[] | null
          created_at: string | null
          delivered_at: string | null
          id: string
          metadata: Json | null
          priority: string | null
          read_at: string | null
          rule_id: string | null
          status: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          body?: string | null
          channels?: string[] | null
          created_at?: string | null
          delivered_at?: string | null
          id?: string
          metadata?: Json | null
          priority?: string | null
          read_at?: string | null
          rule_id?: string | null
          status?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          body?: string | null
          channels?: string[] | null
          created_at?: string | null
          delivered_at?: string | null
          id?: string
          metadata?: Json | null
          priority?: string | null
          read_at?: string | null
          rule_id?: string | null
          status?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alert_messages_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "alert_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_rules: {
        Row: {
          channels: string[] | null
          condition_logic: string | null
          conditions: Json
          cooldown_minutes: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          enabled: boolean | null
          id: string
          last_triggered_at: string | null
          name: string
          priority: string | null
          target_ids: string[] | null
          target_type: string | null
          trigger_count: number | null
          type: string
          updated_at: string | null
        }
        Insert: {
          channels?: string[] | null
          condition_logic?: string | null
          conditions?: Json
          cooldown_minutes?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          enabled?: boolean | null
          id?: string
          last_triggered_at?: string | null
          name: string
          priority?: string | null
          target_ids?: string[] | null
          target_type?: string | null
          trigger_count?: number | null
          type: string
          updated_at?: string | null
        }
        Update: {
          channels?: string[] | null
          condition_logic?: string | null
          conditions?: Json
          cooldown_minutes?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          enabled?: boolean | null
          id?: string
          last_triggered_at?: string | null
          name?: string
          priority?: string | null
          target_ids?: string[] | null
          target_type?: string | null
          trigger_count?: number | null
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      alert_settings: {
        Row: {
          channels: Json | null
          created_at: string | null
          priority_filter: string[] | null
          quiet_hours: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          channels?: Json | null
          created_at?: string | null
          priority_filter?: string[] | null
          quiet_hours?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          channels?: Json | null
          created_at?: string | null
          priority_filter?: string[] | null
          quiet_hours?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          app_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string | null
          game_name: string | null
          id: string
          importance: string | null
          is_all_day: boolean | null
          source: string | null
          source_url: string | null
          start_date: string
          status: string | null
          tags: string[] | null
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          app_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          game_name?: string | null
          id: string
          importance?: string | null
          is_all_day?: boolean | null
          source?: string | null
          source_url?: string | null
          start_date: string
          status?: string | null
          tags?: string[] | null
          title: string
          type: string
          updated_at?: string | null
        }
        Update: {
          app_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          game_name?: string | null
          id?: string
          importance?: string | null
          is_all_day?: boolean | null
          source?: string | null
          source_url?: string | null
          start_date?: string
          status?: string | null
          tags?: string[] | null
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ccu_history: {
        Row: {
          app_id: number
          ccu: number
          id: number
          recorded_at: string | null
        }
        Insert: {
          app_id: number
          ccu: number
          id?: number
          recorded_at?: string | null
        }
        Update: {
          app_id?: number
          ccu?: number
          id?: number
          recorded_at?: string | null
        }
        Relationships: []
      }
      follower_history: {
        Row: {
          app_id: number
          follower_count: number
          id: number
          recorded_at: string | null
        }
        Insert: {
          app_id: number
          follower_count: number
          id?: number
          recorded_at?: string | null
        }
        Update: {
          app_id?: number
          follower_count?: number
          id?: number
          recorded_at?: string | null
        }
        Relationships: []
      }
      game_cache: {
        Row: {
          app_id: number
          developer: string | null
          genres: string[] | null
          header_image: string | null
          name: string | null
          positive_ratio: number | null
          price_usd: number | null
          publisher: string | null
          release_date: string | null
          tags: string[] | null
          total_reviews: number | null
          updated_at: string | null
        }
        Insert: {
          app_id: number
          developer?: string | null
          genres?: string[] | null
          header_image?: string | null
          name?: string | null
          positive_ratio?: number | null
          price_usd?: number | null
          publisher?: string | null
          release_date?: string | null
          tags?: string[] | null
          total_reviews?: number | null
          updated_at?: string | null
        }
        Update: {
          app_id?: number
          developer?: string | null
          genres?: string[] | null
          header_image?: string | null
          name?: string | null
          positive_ratio?: number | null
          price_usd?: number | null
          publisher?: string | null
          release_date?: string | null
          tags?: string[] | null
          total_reviews?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      game_daily_metrics: {
        Row: {
          ccu_avg: number | null
          ccu_change_1d: number | null
          ccu_change_7d: number | null
          ccu_peak: number | null
          chzzk_streams_avg: number | null
          chzzk_viewers_avg: number | null
          created_at: string | null
          date: string
          discount_percent: number | null
          game_name: string
          id: number
          price_usd: number | null
          review_count: number | null
          review_positive: number | null
          steam_app_id: number
          streaming_change_1d: number | null
          streaming_change_7d: number | null
          streaming_hours_total: number | null
          streaming_streams_avg: number | null
          streaming_to_ccu_ratio: number | null
          streaming_unique_streamers: number | null
          streaming_viewers_avg: number | null
          streaming_viewers_peak: number | null
          twitch_streams_avg: number | null
          twitch_viewers_avg: number | null
          viewer_conversion_rate: number | null
        }
        Insert: {
          ccu_avg?: number | null
          ccu_change_1d?: number | null
          ccu_change_7d?: number | null
          ccu_peak?: number | null
          chzzk_streams_avg?: number | null
          chzzk_viewers_avg?: number | null
          created_at?: string | null
          date: string
          discount_percent?: number | null
          game_name: string
          id?: number
          price_usd?: number | null
          review_count?: number | null
          review_positive?: number | null
          steam_app_id: number
          streaming_change_1d?: number | null
          streaming_change_7d?: number | null
          streaming_hours_total?: number | null
          streaming_streams_avg?: number | null
          streaming_to_ccu_ratio?: number | null
          streaming_unique_streamers?: number | null
          streaming_viewers_avg?: number | null
          streaming_viewers_peak?: number | null
          twitch_streams_avg?: number | null
          twitch_viewers_avg?: number | null
          viewer_conversion_rate?: number | null
        }
        Update: {
          ccu_avg?: number | null
          ccu_change_1d?: number | null
          ccu_change_7d?: number | null
          ccu_peak?: number | null
          chzzk_streams_avg?: number | null
          chzzk_viewers_avg?: number | null
          created_at?: string | null
          date?: string
          discount_percent?: number | null
          game_name?: string
          id?: number
          price_usd?: number | null
          review_count?: number | null
          review_positive?: number | null
          steam_app_id?: number
          streaming_change_1d?: number | null
          streaming_change_7d?: number | null
          streaming_hours_total?: number | null
          streaming_streams_avg?: number | null
          streaming_to_ccu_ratio?: number | null
          streaming_unique_streamers?: number | null
          streaming_viewers_avg?: number | null
          streaming_viewers_peak?: number | null
          twitch_streams_avg?: number | null
          twitch_viewers_avg?: number | null
          viewer_conversion_rate?: number | null
        }
        Relationships: []
      }
      gemini_key_usage: {
        Row: {
          id: number
          key_index: number
          request_count: number | null
          used_at: string
        }
        Insert: {
          id?: number
          key_index: number
          request_count?: number | null
          used_at?: string
        }
        Update: {
          id?: number
          key_index?: number
          request_count?: number | null
          used_at?: string
        }
        Relationships: []
      }
      influencer_impact_events: {
        Row: {
          campaign_id: string | null
          ccu_after: number | null
          ccu_before: number | null
          ccu_change_pct: number | null
          ccu_during_peak: number | null
          created_at: string | null
          estimated_purchases: number | null
          estimated_revenue_usd: number | null
          estimated_views: number | null
          game_name: string
          id: string
          impact_grade: string | null
          impact_score: number | null
          is_sponsored: boolean | null
          notes: string | null
          review_spike_pct: number | null
          reviews_after_24h: number | null
          reviews_before_24h: number | null
          steam_app_id: number | null
          stream_avg_viewers: number | null
          stream_duration_minutes: number | null
          stream_ended_at: string | null
          stream_peak_viewers: number
          stream_started_at: string
          streamer_followers: number | null
          streamer_id: string | null
          streamer_name: string
          streamer_tier: string | null
        }
        Insert: {
          campaign_id?: string | null
          ccu_after?: number | null
          ccu_before?: number | null
          ccu_change_pct?: number | null
          ccu_during_peak?: number | null
          created_at?: string | null
          estimated_purchases?: number | null
          estimated_revenue_usd?: number | null
          estimated_views?: number | null
          game_name: string
          id?: string
          impact_grade?: string | null
          impact_score?: number | null
          is_sponsored?: boolean | null
          notes?: string | null
          review_spike_pct?: number | null
          reviews_after_24h?: number | null
          reviews_before_24h?: number | null
          steam_app_id?: number | null
          stream_avg_viewers?: number | null
          stream_duration_minutes?: number | null
          stream_ended_at?: string | null
          stream_peak_viewers: number
          stream_started_at: string
          streamer_followers?: number | null
          streamer_id?: string | null
          streamer_name: string
          streamer_tier?: string | null
        }
        Update: {
          campaign_id?: string | null
          ccu_after?: number | null
          ccu_before?: number | null
          ccu_change_pct?: number | null
          ccu_during_peak?: number | null
          created_at?: string | null
          estimated_purchases?: number | null
          estimated_revenue_usd?: number | null
          estimated_views?: number | null
          game_name?: string
          id?: string
          impact_grade?: string | null
          impact_score?: number | null
          is_sponsored?: boolean | null
          notes?: string | null
          review_spike_pct?: number | null
          reviews_after_24h?: number | null
          reviews_before_24h?: number | null
          steam_app_id?: number | null
          stream_avg_viewers?: number | null
          stream_duration_minutes?: number | null
          stream_ended_at?: string | null
          stream_peak_viewers?: number
          stream_started_at?: string
          streamer_followers?: number | null
          streamer_id?: string | null
          streamer_name?: string
          streamer_tier?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "influencer_impact_events_streamer_id_fkey"
            columns: ["streamer_id"]
            isOneToOne: false
            referencedRelation: "streamers"
            referencedColumns: ["id"]
          },
        ]
      }
      insight_cache: {
        Row: {
          cache_key: string
          created_at: string | null
          expires_at: string
          id: string
          insight_text: string
        }
        Insert: {
          cache_key: string
          created_at?: string | null
          expires_at: string
          id?: string
          insight_text: string
        }
        Update: {
          cache_key?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          insight_text?: string
        }
        Relationships: []
      }
      marketing_campaigns: {
        Row: {
          budget_usd: number | null
          confirmed_streamers: string[] | null
          cost_per_purchase: number | null
          cost_per_viewer: number | null
          created_at: string | null
          description: string | null
          end_date: string | null
          estimated_impressions: number | null
          estimated_purchases: number | null
          estimated_revenue_usd: number | null
          game_name: string
          id: string
          name: string
          roi_percentage: number | null
          spent_usd: number | null
          start_date: string
          status: string | null
          steam_app_id: number | null
          target_streamers: string[] | null
          total_stream_hours: number | null
          total_streams: number | null
          total_viewers: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          budget_usd?: number | null
          confirmed_streamers?: string[] | null
          cost_per_purchase?: number | null
          cost_per_viewer?: number | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          estimated_impressions?: number | null
          estimated_purchases?: number | null
          estimated_revenue_usd?: number | null
          game_name: string
          id?: string
          name: string
          roi_percentage?: number | null
          spent_usd?: number | null
          start_date: string
          status?: string | null
          steam_app_id?: number | null
          target_streamers?: string[] | null
          total_stream_hours?: number | null
          total_streams?: number | null
          total_viewers?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          budget_usd?: number | null
          confirmed_streamers?: string[] | null
          cost_per_purchase?: number | null
          cost_per_viewer?: number | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          estimated_impressions?: number | null
          estimated_purchases?: number | null
          estimated_revenue_usd?: number | null
          game_name?: string
          id?: string
          name?: string
          roi_percentage?: number | null
          spent_usd?: number | null
          start_date?: string
          status?: string | null
          steam_app_id?: number | null
          target_streamers?: string[] | null
          total_stream_hours?: number | null
          total_streams?: number | null
          total_viewers?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      price_history: {
        Row: {
          app_id: number
          discount_percent: number | null
          id: number
          price_usd: number | null
          recorded_at: string | null
        }
        Insert: {
          app_id: number
          discount_percent?: number | null
          id?: number
          price_usd?: number | null
          recorded_at?: string | null
        }
        Update: {
          app_id?: number
          discount_percent?: number | null
          id?: number
          price_usd?: number | null
          recorded_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          avatar_url: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          archived_at: string | null
          color: string | null
          created_at: string | null
          description: string | null
          games: Json | null
          id: string
          members: Json | null
          name: string
          notes: Json | null
          owner_email: string | null
          owner_id: string | null
          settings: Json | null
          status: string | null
          tags: string[] | null
          type: string | null
          updated_at: string | null
          visibility: string | null
        }
        Insert: {
          archived_at?: string | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          games?: Json | null
          id?: string
          members?: Json | null
          name: string
          notes?: Json | null
          owner_email?: string | null
          owner_id?: string | null
          settings?: Json | null
          status?: string | null
          tags?: string[] | null
          type?: string | null
          updated_at?: string | null
          visibility?: string | null
        }
        Update: {
          archived_at?: string | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          games?: Json | null
          id?: string
          members?: Json | null
          name?: string
          notes?: Json | null
          owner_email?: string | null
          owner_id?: string | null
          settings?: Json | null
          status?: string | null
          tags?: string[] | null
          type?: string | null
          updated_at?: string | null
          visibility?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          cover_image: string | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          description: string | null
          id: string
          is_public: boolean | null
          logo: string | null
          published_at: string | null
          sections: Json | null
          share_expiry: string | null
          share_link: string | null
          share_password: string | null
          shares: Json | null
          status: string | null
          tags: string[] | null
          target_app_ids: string[] | null
          target_project_id: string | null
          theme: Json | null
          title: string
          type: string | null
          updated_at: string | null
        }
        Insert: {
          cover_image?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          description?: string | null
          id: string
          is_public?: boolean | null
          logo?: string | null
          published_at?: string | null
          sections?: Json | null
          share_expiry?: string | null
          share_link?: string | null
          share_password?: string | null
          shares?: Json | null
          status?: string | null
          tags?: string[] | null
          target_app_ids?: string[] | null
          target_project_id?: string | null
          theme?: Json | null
          title: string
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          cover_image?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          logo?: string | null
          published_at?: string | null
          sections?: Json | null
          share_expiry?: string | null
          share_link?: string | null
          share_password?: string | null
          shares?: Json | null
          status?: string | null
          tags?: string[] | null
          target_app_ids?: string[] | null
          target_project_id?: string | null
          theme?: Json | null
          title?: string
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      review_history: {
        Row: {
          app_id: number
          id: number
          negative: number | null
          positive: number | null
          recorded_at: string | null
          total_reviews: number | null
        }
        Insert: {
          app_id: number
          id?: number
          negative?: number | null
          positive?: number | null
          recorded_at?: string | null
          total_reviews?: number | null
        }
        Update: {
          app_id?: number
          id?: number
          negative?: number | null
          positive?: number | null
          recorded_at?: string | null
          total_reviews?: number | null
        }
        Relationships: []
      }
      streamer_activity: {
        Row: {
          duration_minutes: number | null
          ended_at: string | null
          follower_count_snapshot: number | null
          game_name: string
          id: number
          recorded_at: string
          started_at: string | null
          steam_app_id: number | null
          stream_title: string | null
          streamer_id: string | null
          viewer_count: number
        }
        Insert: {
          duration_minutes?: number | null
          ended_at?: string | null
          follower_count_snapshot?: number | null
          game_name: string
          id?: number
          recorded_at?: string
          started_at?: string | null
          steam_app_id?: number | null
          stream_title?: string | null
          streamer_id?: string | null
          viewer_count?: number
        }
        Update: {
          duration_minutes?: number | null
          ended_at?: string | null
          follower_count_snapshot?: number | null
          game_name?: string
          id?: number
          recorded_at?: string
          started_at?: string | null
          steam_app_id?: number | null
          stream_title?: string | null
          streamer_id?: string | null
          viewer_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "streamer_activity_streamer_id_fkey"
            columns: ["streamer_id"]
            isOneToOne: false
            referencedRelation: "streamers"
            referencedColumns: ["id"]
          },
        ]
      }
      streamer_games: {
        Row: {
          affinity_score: number | null
          avg_viewers: number | null
          first_streamed_at: string | null
          game_name: string
          id: string
          last_streamed_at: string | null
          peak_viewers: number | null
          steam_app_id: number | null
          streamer_id: string | null
          total_hours: number | null
          total_streams: number | null
          updated_at: string | null
        }
        Insert: {
          affinity_score?: number | null
          avg_viewers?: number | null
          first_streamed_at?: string | null
          game_name: string
          id?: string
          last_streamed_at?: string | null
          peak_viewers?: number | null
          steam_app_id?: number | null
          streamer_id?: string | null
          total_hours?: number | null
          total_streams?: number | null
          updated_at?: string | null
        }
        Update: {
          affinity_score?: number | null
          avg_viewers?: number | null
          first_streamed_at?: string | null
          game_name?: string
          id?: string
          last_streamed_at?: string | null
          peak_viewers?: number | null
          steam_app_id?: number | null
          streamer_id?: string | null
          total_hours?: number | null
          total_streams?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "streamer_games_streamer_id_fkey"
            columns: ["streamer_id"]
            isOneToOne: false
            referencedRelation: "streamers"
            referencedColumns: ["id"]
          },
        ]
      }
      streamers: {
        Row: {
          business_inquiry_url: string | null
          contact_discord: string | null
          contact_email: string | null
          contact_twitter: string | null
          created_at: string | null
          description: string | null
          display_name: string
          follower_count: number | null
          id: string
          language: string | null
          login_name: string | null
          platform: string
          platform_id: string
          profile_image_url: string | null
          subscriber_count: number | null
          tier: string | null
          updated_at: string | null
        }
        Insert: {
          business_inquiry_url?: string | null
          contact_discord?: string | null
          contact_email?: string | null
          contact_twitter?: string | null
          created_at?: string | null
          description?: string | null
          display_name: string
          follower_count?: number | null
          id?: string
          language?: string | null
          login_name?: string | null
          platform: string
          platform_id: string
          profile_image_url?: string | null
          subscriber_count?: number | null
          tier?: string | null
          updated_at?: string | null
        }
        Update: {
          business_inquiry_url?: string | null
          contact_discord?: string | null
          contact_email?: string | null
          contact_twitter?: string | null
          created_at?: string | null
          description?: string | null
          display_name?: string
          follower_count?: number | null
          id?: string
          language?: string | null
          login_name?: string | null
          platform?: string
          platform_id?: string
          profile_image_url?: string | null
          subscriber_count?: number | null
          tier?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      streaming_alerts: {
        Row: {
          alert_type: string
          created_at: string | null
          game_name: string | null
          id: string
          is_read: boolean | null
          message: string | null
          metrics: Json | null
          read_at: string | null
          steam_app_id: number | null
          streamer_id: string | null
          streamer_name: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          game_name?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          metrics?: Json | null
          read_at?: string | null
          steam_app_id?: number | null
          streamer_id?: string | null
          streamer_name?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          game_name?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          metrics?: Json | null
          read_at?: string | null
          steam_app_id?: number | null
          streamer_id?: string | null
          streamer_name?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "streaming_alerts_streamer_id_fkey"
            columns: ["streamer_id"]
            isOneToOne: false
            referencedRelation: "streamers"
            referencedColumns: ["id"]
          },
        ]
      }
      streaming_daily_stats: {
        Row: {
          avg_streams: number | null
          avg_viewers: number | null
          date: string
          game_name: string
          id: number
          peak_viewers: number | null
          platform: string
          steam_app_id: number | null
          stream_change_pct: number | null
          total_stream_hours: number | null
          unique_streamers: number | null
          viewer_change_pct: number | null
        }
        Insert: {
          avg_streams?: number | null
          avg_viewers?: number | null
          date: string
          game_name: string
          id?: number
          peak_viewers?: number | null
          platform: string
          steam_app_id?: number | null
          stream_change_pct?: number | null
          total_stream_hours?: number | null
          unique_streamers?: number | null
          viewer_change_pct?: number | null
        }
        Update: {
          avg_streams?: number | null
          avg_viewers?: number | null
          date?: string
          game_name?: string
          id?: number
          peak_viewers?: number | null
          platform?: string
          steam_app_id?: number | null
          stream_change_pct?: number | null
          total_stream_hours?: number | null
          unique_streamers?: number | null
          viewer_change_pct?: number | null
        }
        Relationships: []
      }
      streaming_history: {
        Row: {
          game_name: string
          id: number
          live_streams: number
          peak_viewers: number | null
          platform: string
          recorded_at: string
          steam_app_id: number | null
          top_streamers: Json | null
          total_viewers: number
          unique_streamers: number | null
        }
        Insert: {
          game_name: string
          id?: number
          live_streams?: number
          peak_viewers?: number | null
          platform: string
          recorded_at?: string
          steam_app_id?: number | null
          top_streamers?: Json | null
          total_viewers?: number
          unique_streamers?: number | null
        }
        Update: {
          game_name?: string
          id?: number
          live_streams?: number
          peak_viewers?: number | null
          platform?: string
          recorded_at?: string
          steam_app_id?: number | null
          top_streamers?: Json | null
          total_viewers?: number
          unique_streamers?: number | null
        }
        Relationships: []
      }
      team_members: {
        Row: {
          id: string
          joined_at: string | null
          role: string | null
          team_id: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          joined_at?: string | null
          role?: string | null
          team_id?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          joined_at?: string | null
          role?: string | null
          team_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      watchlist: {
        Row: {
          added_at: string | null
          alert_settings: Json | null
          alerts_enabled: boolean | null
          app_id: number
          app_name: string | null
          header_image: string | null
          id: string
          team_id: string | null
          user_id: string | null
        }
        Insert: {
          added_at?: string | null
          alert_settings?: Json | null
          alerts_enabled?: boolean | null
          app_id: number
          app_name?: string | null
          header_image?: string | null
          id?: string
          team_id?: string | null
          user_id?: string | null
        }
        Update: {
          added_at?: string | null
          alert_settings?: Json | null
          alerts_enabled?: boolean | null
          app_id?: number
          app_name?: string | null
          header_image?: string | null
          id?: string
          team_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "watchlist_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      game_daily_stats: {
        Row: {
          app_id: number | null
          avg_ccu: number | null
          date: string | null
          min_ccu: number | null
          peak_ccu: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      aggregate_streaming_daily_stats: {
        Args: { p_date?: string }
        Returns: number
      }
      calculate_impact_score: {
        Args: {
          p_ccu_change_pct: number
          p_review_spike_pct: number
          p_stream_viewers: number
        }
        Returns: number
      }
      get_least_used_key: {
        Args: { p_daily_limit?: number; p_key_count: number }
        Returns: number
      }
      increment_gemini_usage:
        | { Args: { p_date: string; p_key_index: number }; Returns: undefined }
        | { Args: { p_date: string; p_key_index: number }; Returns: undefined }
      refresh_game_daily_stats: { Args: Record<string, never>; Returns: undefined }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
