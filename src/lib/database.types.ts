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
      playlists: {
        Row: {
          id: string
          title: string
          spotify_title: string | null
          description: string | null
          vibe: string | null
          spotify_id: string | null
          cover_url: string | null
          display_order: number | null
          sync_timestamp: string | null
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          spotify_title?: string | null
          description?: string | null
          vibe?: string | null
          spotify_id?: string | null
          cover_url?: string | null
          display_order?: number | null
          sync_timestamp?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          spotify_title?: string | null
          description?: string | null
          vibe?: string | null
          spotify_id?: string | null
          cover_url?: string | null
          display_order?: number | null
          sync_timestamp?: string | null
          created_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          email: string | null
          display_name: string | null
          avatar_color: string | null
          created_at: string
        }
        Insert: {
          id: string
          email?: string | null
          display_name?: string | null
          avatar_color?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          display_name?: string | null
          avatar_color?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      tracks: {
        Row: {
          id: string
          playlist_id: string | null
          title: string
          artist: string
          album: string | null
          artwork_url: string | null
          spotify_uri: string | null
          artist_spotify_uri: string | null
          album_spotify_uri: string | null
          duration_ms: number | null
          status: 'active' | 'suggested' | 'rejected'
          rating: number | null
          position: number | null
          pinned_comment: string | null
          added_by: string | null
          suggested_by: string | null
          spotify_pushed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          playlist_id?: string | null
          title: string
          artist: string
          album?: string | null
          artwork_url?: string | null
          spotify_uri?: string | null
          artist_spotify_uri?: string | null
          album_spotify_uri?: string | null
          duration_ms?: number | null
          status?: 'active' | 'suggested' | 'rejected'
          rating?: number | null
          position?: number | null
          pinned_comment?: string | null
          added_by?: string | null
          spotify_pushed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          playlist_id?: string | null
          title?: string
          artist?: string
          album?: string | null
          artwork_url?: string | null
          spotify_uri?: string | null
          artist_spotify_uri?: string | null
          album_spotify_uri?: string | null
          duration_ms?: number | null
          status?: 'active' | 'suggested' | 'rejected'
          rating?: number | null
          position?: number | null
          pinned_comment?: string | null
          added_by?: string | null
          suggested_by?: string | null
          spotify_pushed_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracks_playlist_id_fkey"
            columns: ["playlist_id"]
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracks_added_by_fkey"
            columns: ["added_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      audit_log: {
        Row: {
          id: string
          track_id: string | null
          user_id: string | null
          action: string
          details: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          track_id?: string | null
          user_id?: string | null
          action: string
          details?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          track_id?: string | null
          user_id?: string | null
          action?: string
          details?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_track_id_fkey"
            columns: ["track_id"]
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      spotify_tokens: {
        Row: {
          id: number
          access_token: string
          refresh_token: string
          expires_at: string
          spotify_user_id: string | null
          spotify_display_name: string | null
          updated_at: string
        }
        Insert: {
          id?: number
          access_token: string
          refresh_token: string
          expires_at: string
          spotify_user_id?: string | null
          spotify_display_name?: string | null
          updated_at?: string
        }
        Update: {
          id?: number
          access_token?: string
          refresh_token?: string
          expires_at?: string
          spotify_user_id?: string | null
          spotify_display_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      reorder_track: {
        Args: {
          p_track_id: string
          p_new_position: number
          p_old_position: number
          p_playlist_id: string
          p_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// App Settings type
export interface AppSetting {
  id: string
  key: string
  value: string | null
  description: string | null
  created_at: string
  updated_at: string
}
