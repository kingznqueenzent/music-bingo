/**
 * Generated from live Postgres schema (scripts/gen-supabase-types.js).
 * Project: dmcjpkrdivafkqoovyvn
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      badge_definitions: {
        Row: {
          id: string
          name: string
          description: string | null
          icon_url: string | null
          condition_type: string
          condition_value: number
        }
        Insert: {
          id: string
          name: string
          description?: string | null
          icon_url?: string | null
          condition_type: string
          condition_value: number
        }
        Update: {
          id?: string | null
          name?: string | null
          description?: string | null
          icon_url?: string | null
          condition_type?: string | null
          condition_value?: number | null
        }
        Relationships: []
      }
      bingo_game_tracks: {
        Row: {
          id: string
          game_id: string | null
          title: string
          artist: string | null
          genre: string | null
          file_url: string | null
          file_path: string | null
          theme_id: string | null
          played: boolean
          played_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          game_id?: string | null
          title: string
          artist?: string | null
          genre?: string | null
          file_url?: string | null
          file_path?: string | null
          theme_id?: string | null
          played?: boolean
          played_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string | null
          game_id?: string | null
          title?: string | null
          artist?: string | null
          genre?: string | null
          file_url?: string | null
          file_path?: string | null
          theme_id?: string | null
          played?: boolean | null
          played_at?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      card_cells: {
        Row: {
          id: string
          card_id: string
          playlist_song_id: string
          position: number
          created_at: string | null
        }
        Insert: {
          id?: string
          card_id: string
          playlist_song_id: string
          position: number
          created_at?: string | null
        }
        Update: {
          id?: string | null
          card_id?: string | null
          playlist_song_id?: string | null
          position?: number | null
          created_at?: string | null
        }
        Relationships: []
      }
      cards: {
        Row: {
          id: string
          player_id: string | null
          game_id: string | null
          grid: string[] | null
          player_identifier: string | null
          player_name: string | null
          grid_data: Json
          won: boolean
        }
        Insert: {
          id?: string
          player_id?: string | null
          game_id?: string | null
          grid?: string[] | null
          player_identifier?: string | null
          player_name?: string | null
          grid_data?: Json
          won?: boolean
        }
        Update: {
          id?: string | null
          player_id?: string | null
          game_id?: string | null
          grid?: string[] | null
          player_identifier?: string | null
          player_name?: string | null
          grid_data?: Json | null
          won?: boolean | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          id: string
          game_id: string | null
          player_name: string
          player_email: string
          player_identifier: string | null
          avatar_url: string | null
          message: string
          message_type: string
          room: string
          community_channel: string | null
          tournament_id: string | null
          is_flagged: boolean
          is_deleted: boolean
          created_at: string
          sender_role: string
          is_dj: boolean
        }
        Insert: {
          id?: string
          game_id?: string | null
          player_name: string
          player_email?: string
          player_identifier?: string | null
          avatar_url?: string | null
          message: string
          message_type: string
          room: string
          community_channel?: string | null
          tournament_id?: string | null
          is_flagged?: boolean
          is_deleted?: boolean
          created_at?: string
          sender_role?: string
          is_dj?: boolean
        }
        Update: {
          id?: string | null
          game_id?: string | null
          player_name?: string | null
          player_email?: string | null
          player_identifier?: string | null
          avatar_url?: string | null
          message?: string | null
          message_type?: string | null
          room?: string | null
          community_channel?: string | null
          tournament_id?: string | null
          is_flagged?: boolean | null
          is_deleted?: boolean | null
          created_at?: string | null
          sender_role?: string | null
          is_dj?: boolean | null
        }
        Relationships: []
      }
      claimed_prizes: {
        Row: {
          id: string
          winner_name: string
          prize_id: string
          claim_email: string
          claim_phone: string | null
          game_id: string
          claimed_at: string
          created_at: string
        }
        Insert: {
          id?: string
          winner_name: string
          prize_id: string
          claim_email: string
          claim_phone?: string | null
          game_id: string
          claimed_at?: string
          created_at?: string
        }
        Update: {
          id?: string | null
          winner_name?: string | null
          prize_id?: string | null
          claim_email?: string | null
          claim_phone?: string | null
          game_id?: string | null
          claimed_at?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      copyright_claims: {
        Row: {
          id: string
          track_id: string
          mix_analysis_id: string | null
          claimant_name: string
          claim_type: string
          territory: Json
          policy_hints: Json
          source: string | null
          source_reference: string | null
          effective_from: Json | null
          effective_to: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          track_id: string
          mix_analysis_id?: string | null
          claimant_name: string
          claim_type: string
          territory?: Json
          policy_hints?: Json
          source?: string | null
          source_reference?: string | null
          effective_from?: Json | null
          effective_to?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string | null
          track_id?: string | null
          mix_analysis_id?: string | null
          claimant_name?: string | null
          claim_type?: string | null
          territory?: Json | null
          policy_hints?: Json | null
          source?: string | null
          source_reference?: string | null
          effective_from?: Json | null
          effective_to?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      eras: {
        Row: {
          id: string
          name: string
          start_year: number
          end_year: number
          sort_order: number
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          start_year: number
          end_year: number
          sort_order?: number
          created_at?: string | null
        }
        Update: {
          id?: string | null
          name?: string | null
          start_year?: number | null
          end_year?: number | null
          sort_order?: number | null
          created_at?: string | null
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          key: string
          label: string
          enabled: boolean
          description: string
        }
        Insert: {
          key: string
          label: string
          enabled?: boolean
          description?: string
        }
        Update: {
          key?: string | null
          label?: string | null
          enabled?: boolean | null
          description?: string | null
        }
        Relationships: []
      }
      fingerprints: {
        Row: {
          id: string
          track_id: string | null
          mix_analysis_id: string | null
          provider: string
          provider_fingerprint_id: string | null
          window_start_sec: number
          window_duration_sec: number | null
          fingerprint_hash: string | null
          payload: Json
          created_at: string
        }
        Insert: {
          id?: string
          track_id?: string | null
          mix_analysis_id?: string | null
          provider: string
          provider_fingerprint_id?: string | null
          window_start_sec?: number
          window_duration_sec?: number | null
          fingerprint_hash?: string | null
          payload?: Json
          created_at?: string
        }
        Update: {
          id?: string | null
          track_id?: string | null
          mix_analysis_id?: string | null
          provider?: string | null
          provider_fingerprint_id?: string | null
          window_start_sec?: number | null
          window_duration_sec?: number | null
          fingerprint_hash?: string | null
          payload?: Json | null
          created_at?: string | null
        }
        Relationships: []
      }
      game_sponsors: {
        Row: {
          id: string
          game_id: string
          name: string
          logo_url: string | null
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          game_id: string
          name: string
          logo_url?: string | null
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string | null
          game_id?: string | null
          name?: string | null
          logo_url?: string | null
          sort_order?: number | null
          created_at?: string | null
        }
        Relationships: []
      }
      game_events: {
        Row: {
          id: string
          game_id: string
          event_type: string
          payload: Json
          created_at: string
        }
        Insert: {
          id?: string
          game_id: string
          event_type: string
          payload?: Json
          created_at?: string
        }
        Update: {
          id?: string | null
          game_id?: string | null
          event_type?: string | null
          payload?: Json | null
          created_at?: string | null
        }
        Relationships: []
      }
      games: {
        Row: {
          id: string
          code: string
          host_name: string | null
          status: string | null
          current_track_index: number | null
          created_at: string | null
          tier: string
          logo_url: string | null
          stage_show_leaderboard: boolean
          theme_id: string | null
          mode: string
          round: number
          clip_seconds: number
          crossfade_seconds: number
          grid_size: number
          playlist_id: string | null
          current_song_id: string | null
          venue_display_name: string | null
          brand_primary_hex: string | null
          brand_accent_hex: string | null
          brand_hide_lyricgrid: boolean
          entry_fee_cents: number
          prize_pool_cents: number
          muted_players: string[]
          chat_profanity_filter_enabled: boolean
          host_id: string | null
        }
        Insert: {
          id?: string
          code: string
          host_name?: string | null
          status?: string | null
          current_track_index?: number | null
          created_at?: string | null
          tier?: string
          logo_url?: string | null
          stage_show_leaderboard?: boolean
          theme_id?: string | null
          mode?: string
          round?: number
          clip_seconds?: number
          crossfade_seconds?: number
          grid_size?: number
          playlist_id?: string | null
          current_song_id?: string | null
          venue_display_name?: string | null
          brand_primary_hex?: string | null
          brand_accent_hex?: string | null
          brand_hide_lyricgrid?: boolean
          entry_fee_cents?: number
          prize_pool_cents?: number
          muted_players?: string[]
          chat_profanity_filter_enabled?: boolean
          host_id?: string | null
        }
        Update: {
          id?: string | null
          code?: string | null
          host_name?: string | null
          status?: string | null
          current_track_index?: number | null
          created_at?: string | null
          tier?: string | null
          logo_url?: string | null
          stage_show_leaderboard?: boolean | null
          theme_id?: string | null
          mode?: string | null
          round?: number | null
          clip_seconds?: number | null
          crossfade_seconds?: number | null
          grid_size?: number | null
          playlist_id?: string | null
          current_song_id?: string | null
          venue_display_name?: string | null
          brand_primary_hex?: string | null
          brand_accent_hex?: string | null
          brand_hide_lyricgrid?: boolean | null
          entry_fee_cents?: number | null
          prize_pool_cents?: number | null
          muted_players?: string[] | null
          chat_profanity_filter_enabled?: boolean | null
          host_id?: string | null
        }
        Relationships: []
      }
      genres: {
        Row: {
          id: string
          name: string
          slug: string
          sort_order: number
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          slug: string
          sort_order?: number
          created_at?: string | null
        }
        Update: {
          id?: string | null
          name?: string | null
          slug?: string | null
          sort_order?: number | null
          created_at?: string | null
        }
        Relationships: []
      }
      leaderboard: {
        Row: {
          id: string
          player_name: string
          identifier: string
          wins: number
          points: number
          last_played: string | null
          created_at: string | null
          updated_at: string | null
          total_xp: number
          games_played: number
          streak_current: number
          streak_best: number
          last_played_week: string | null
          badges: string[]
          premium_subscriber: boolean
          chat_messages_sent: number
          chat_distinct_days: number
          last_chat_date: Json | null
        }
        Insert: {
          id?: string
          player_name: string
          identifier: string
          wins?: number
          points?: number
          last_played?: string | null
          created_at?: string | null
          updated_at?: string | null
          total_xp?: number
          games_played?: number
          streak_current?: number
          streak_best?: number
          last_played_week?: string | null
          badges?: string[]
          premium_subscriber?: boolean
          chat_messages_sent?: number
          chat_distinct_days?: number
          last_chat_date?: Json | null
        }
        Update: {
          id?: string | null
          player_name?: string | null
          identifier?: string | null
          wins?: number | null
          points?: number | null
          last_played?: string | null
          created_at?: string | null
          updated_at?: string | null
          total_xp?: number | null
          games_played?: number | null
          streak_current?: number | null
          streak_best?: number | null
          last_played_week?: string | null
          badges?: string[] | null
          premium_subscriber?: boolean | null
          chat_messages_sent?: number | null
          chat_distinct_days?: number | null
          last_chat_date?: Json | null
        }
        Relationships: []
      }
      media_library: {
        Row: {
          id: string
          name: string
          file_path: string
          file_url: string | null
          storage_bucket: string
          file_type: string
          file_size_bytes: number | null
          spotify_track_id: string | null
          album_art_url: string | null
          created_at: string | null
          theme_id: string | null
        }
        Insert: {
          id?: string
          name: string
          file_path: string
          file_url?: string | null
          storage_bucket?: string
          file_type: string
          file_size_bytes?: number | null
          spotify_track_id?: string | null
          album_art_url?: string | null
          created_at?: string | null
          theme_id?: string | null
        }
        Update: {
          id?: string | null
          name?: string | null
          file_path?: string | null
          file_url?: string | null
          storage_bucket?: string | null
          file_type?: string | null
          file_size_bytes?: number | null
          spotify_track_id?: string | null
          album_art_url?: string | null
          created_at?: string | null
          theme_id?: string | null
        }
        Relationships: []
      }
      mix_analyses: {
        Row: {
          id: string
          user_id: string | null
          storage_uri: string
          original_filename: string | null
          mime_type: string
          byte_size: number | null
          duration_seconds: number | null
          status: string
          summary: Json
          error_message: string | null
          created_at: string
          started_at: string | null
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          storage_uri: string
          original_filename?: string | null
          mime_type?: string
          byte_size?: number | null
          duration_seconds?: number | null
          status?: string
          summary?: Json
          error_message?: string | null
          created_at?: string
          started_at?: string | null
          completed_at?: string | null
        }
        Update: {
          id?: string | null
          user_id?: string | null
          storage_uri?: string | null
          original_filename?: string | null
          mime_type?: string | null
          byte_size?: number | null
          duration_seconds?: number | null
          status?: string | null
          summary?: Json | null
          error_message?: string | null
          created_at?: string | null
          started_at?: string | null
          completed_at?: string | null
        }
        Relationships: []
      }
      played_songs: {
        Row: {
          id: string
          game_id: string
          playlist_song_id: string
          played_at: string | null
          round: number
        }
        Insert: {
          id?: string
          game_id: string
          playlist_song_id: string
          played_at?: string | null
          round?: number
        }
        Update: {
          id?: string | null
          game_id?: string | null
          playlist_song_id?: string | null
          played_at?: string | null
          round?: number | null
        }
        Relationships: []
      }
      played_tracks: {
        Row: {
          id: string
          game_id: string | null
          track_id: string | null
          played_at: string | null
        }
        Insert: {
          id?: string
          game_id?: string | null
          track_id?: string | null
          played_at?: string | null
        }
        Update: {
          id?: string | null
          game_id?: string | null
          track_id?: string | null
          played_at?: string | null
        }
        Relationships: []
      }
      player_game_sessions: {
        Row: {
          id: string
          game_id: string
          card_id: string
          identifier: string
          participation_awarded: boolean
          win_awarded: boolean
          created_at: string | null
        }
        Insert: {
          id?: string
          game_id: string
          card_id: string
          identifier: string
          participation_awarded?: boolean
          win_awarded?: boolean
          created_at?: string | null
        }
        Update: {
          id?: string | null
          game_id?: string | null
          card_id?: string | null
          identifier?: string | null
          participation_awarded?: boolean | null
          win_awarded?: boolean | null
          created_at?: string | null
        }
        Relationships: []
      }
      players: {
        Row: {
          id: string
          game_id: string | null
          name: string | null
          joined_at: string | null
          username: string
        }
        Insert: {
          id?: string
          game_id?: string | null
          name?: string | null
          joined_at?: string | null
          username: string
        }
        Update: {
          id?: string | null
          game_id?: string | null
          name?: string | null
          joined_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      playlist_songs: {
        Row: {
          id: string
          playlist_id: string
          youtube_id: string | null
          title: string | null
          position: number
          created_at: string | null
          source: string
          file_url: string | null
          spotify_track_id: string | null
          album_art_url: string | null
        }
        Insert: {
          id?: string
          playlist_id: string
          youtube_id?: string | null
          title?: string | null
          position?: number
          created_at?: string | null
          source?: string
          file_url?: string | null
          spotify_track_id?: string | null
          album_art_url?: string | null
        }
        Update: {
          id?: string | null
          playlist_id?: string | null
          youtube_id?: string | null
          title?: string | null
          position?: number | null
          created_at?: string | null
          source?: string | null
          file_url?: string | null
          spotify_track_id?: string | null
          album_art_url?: string | null
        }
        Relationships: []
      }
      playlists: {
        Row: {
          id: string
          name: string
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          created_at?: string | null
        }
        Update: {
          id?: string | null
          name?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      prizes: {
        Row: {
          id: string
          game_id: string
          rank: number
          label: string
          image_url: string | null
          claim_url: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          game_id: string
          rank: number
          label: string
          image_url?: string | null
          claim_url?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string | null
          game_id?: string | null
          rank?: number | null
          label?: string | null
          image_url?: string | null
          claim_url?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      theme_songs: {
        Row: {
          id: string
          theme_id: string
          youtube_id: string
          title: string | null
          position: number
          created_at: string | null
        }
        Insert: {
          id?: string
          theme_id: string
          youtube_id: string
          title?: string | null
          position?: number
          created_at?: string | null
        }
        Update: {
          id?: string | null
          theme_id?: string | null
          youtube_id?: string | null
          title?: string | null
          position?: number | null
          created_at?: string | null
        }
        Relationships: []
      }
      themes: {
        Row: {
          id: string
          name: string
          category: string
          description: string | null
          artwork_url: string | null
          created_at: string | null
          genre_id: string | null
          era_id: string | null
        }
        Insert: {
          id?: string
          name: string
          category: string
          description?: string | null
          artwork_url?: string | null
          created_at?: string | null
          genre_id?: string | null
          era_id?: string | null
        }
        Update: {
          id?: string | null
          name?: string | null
          category?: string | null
          description?: string | null
          artwork_url?: string | null
          created_at?: string | null
          genre_id?: string | null
          era_id?: string | null
        }
        Relationships: []
      }
      tournament_entries: {
        Row: {
          id: string
          tournament_id: string
          player_email: string
          player_name: string
          player_identifier: string
          points: number
          rounds_played: number
          rank: number | null
          is_eliminated: boolean
          attendance_bonus_applied: boolean
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          tournament_id: string
          player_email: string
          player_name: string
          player_identifier: string
          points?: number
          rounds_played?: number
          rank?: number | null
          is_eliminated?: boolean
          attendance_bonus_applied?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string | null
          tournament_id?: string | null
          player_email?: string | null
          player_name?: string | null
          player_identifier?: string | null
          points?: number | null
          rounds_played?: number | null
          rank?: number | null
          is_eliminated?: boolean | null
          attendance_bonus_applied?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tournament_game_events: {
        Row: {
          id: string
          tournament_id: string
          game_id: string
          entry_id: string
          participation_applied: boolean
          win_applied: boolean
          fastest_applied: boolean
          created_at: string | null
        }
        Insert: {
          id?: string
          tournament_id: string
          game_id: string
          entry_id: string
          participation_applied?: boolean
          win_applied?: boolean
          fastest_applied?: boolean
          created_at?: string | null
        }
        Update: {
          id?: string | null
          tournament_id?: string | null
          game_id?: string | null
          entry_id?: string | null
          participation_applied?: boolean | null
          win_applied?: boolean | null
          fastest_applied?: boolean | null
          created_at?: string | null
        }
        Relationships: []
      }
      tournaments: {
        Row: {
          id: string
          name: string
          status: string
          start_date: Json
          end_date: Json
          theme_ids: string[]
          format: string
          rounds_total: number
          prize_description: string | null
          banner_url: string | null
          max_players: number | null
          winner_bonus_xp: number
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          status: string
          start_date: Json
          end_date: Json
          theme_ids?: string[]
          format?: string
          rounds_total?: number
          prize_description?: string | null
          banner_url?: string | null
          max_players?: number | null
          winner_bonus_xp?: number
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string | null
          name?: string | null
          status?: string | null
          start_date?: Json | null
          end_date?: Json | null
          theme_ids?: string[] | null
          format?: string | null
          rounds_total?: number | null
          prize_description?: string | null
          banner_url?: string | null
          max_players?: number | null
          winner_bonus_xp?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tracks: {
        Row: {
          id: string
          game_id: string | null
          youtube_id: string | null
          title: string
          artist: string | null
          position: number | null
          duration: number | null
          year: string | null
          isrc: string | null
          album: string | null
          label: string | null
          duration_seconds: number | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          game_id?: string | null
          youtube_id?: string | null
          title: string
          artist?: string | null
          position?: number | null
          duration?: number | null
          year?: string | null
          isrc?: string | null
          album?: string | null
          label?: string | null
          duration_seconds?: number | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string | null
          game_id?: string | null
          youtube_id?: string | null
          title?: string | null
          artist?: string | null
          position?: number | null
          duration?: number | null
          year?: string | null
          isrc?: string | null
          album?: string | null
          label?: string | null
          duration_seconds?: number | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      wins: {
        Row: {
          id: string
          game_id: string
          card_id: string
          player_identifier: string | null
          mode: string | null
          round: number
          created_at: string | null
          claimed_at: string | null
          prize_id: string | null
        }
        Insert: {
          id?: string
          game_id: string
          card_id: string
          player_identifier?: string | null
          mode?: string | null
          round?: number
          created_at?: string | null
          claimed_at?: string | null
          prize_id?: string | null
        }
        Update: {
          id?: string | null
          game_id?: string | null
          card_id?: string | null
          player_identifier?: string | null
          mode?: string | null
          round?: number | null
          created_at?: string | null
          claimed_at?: string | null
          prize_id?: string | null
        }
        Relationships: []
      }
      youtube_tests: {
        Row: {
          id: string
          mix_analysis_id: string
          track_id: string | null
          test_kind: string
          youtube_video_id: string | null
          channel_id: string | null
          result: Json
          notes: string | null
          tested_at: string
          created_at: string
        }
        Insert: {
          id?: string
          mix_analysis_id: string
          track_id?: string | null
          test_kind: string
          youtube_video_id?: string | null
          channel_id?: string | null
          result?: Json
          notes?: string | null
          tested_at?: string
          created_at?: string
        }
        Update: {
          id?: string | null
          mix_analysis_id?: string | null
          track_id?: string | null
          test_kind?: string | null
          youtube_video_id?: string | null
          channel_id?: string | null
          result?: Json | null
          notes?: string | null
          tested_at?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
