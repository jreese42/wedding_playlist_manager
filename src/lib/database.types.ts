export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
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
      }
    }
  }
}
