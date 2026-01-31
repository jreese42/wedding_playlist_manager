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
          description: string | null
          vibe: string | null
          spotify_id: string | null
          display_order: number | null
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          vibe?: string | null
          spotify_id?: string | null
          display_order?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          vibe?: string | null
          spotify_id?: string | null
          display_order?: number | null
          created_at?: string
        }
        Relationships: []
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
          duration_ms: number | null
          status: 'active' | 'suggested' | 'rejected'
          position: number | null
          added_by: string | null
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
          duration_ms?: number | null
          status?: 'active' | 'suggested' | 'rejected'
          position?: number | null
          added_by?: string | null
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
          duration_ms?: number | null
          status?: 'active' | 'suggested' | 'rejected'
          position?: number | null
          added_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracks_playlist_id_fkey"
            columns: ["playlist_id"]
            referencedRelation: "playlists"
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
          }
        ]
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
