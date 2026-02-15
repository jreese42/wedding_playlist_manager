'use server'

import SpotifyWebApi from 'spotify-web-api-node'
import { createClient } from '@/lib/supabase/server'
import { Database } from '@/lib/database.types'

type Track = Database['public']['Tables']['tracks']['Row']

interface SongSearchResult {
  title: string
  artist: string
  spotifyUri?: string
  artworkUrl?: string
  albumSpotifyUri?: string
  artistSpotifyUri?: string
  album?: string
  durationMs?: number
}

/**
 * Search Spotify for songs and return results with deduplication
 */
export async function searchSpotifyForSongs(
  queries: Array<{ title: string; artist: string }>,
  existingTracks: Track[]
): Promise<SongSearchResult[]> {
  // Auth check: require authenticated user
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized: you must be logged in to search Spotify')

  const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  })

  try {
    // Authenticate with Spotify using client credentials
    const credentials = await spotifyApi.clientCredentialsGrant()
    spotifyApi.setAccessToken(credentials.body['access_token'])

    const results: SongSearchResult[] = []
    const existingUris = new Set(
      existingTracks.filter(t => t.spotify_uri).map(t => t.spotify_uri)
    )

    for (const query of queries) {
      try {
        const searchResults = await spotifyApi.searchTracks(`track:${query.title} artist:${query.artist}`, {
          limit: 5,
        })

        if (searchResults.body.tracks?.items && searchResults.body.tracks.items.length > 0) {
          const track = searchResults.body.tracks.items[0]

          // Skip if already in playlist
          if (existingUris.has(track.uri)) {
            continue
          }

          results.push({
            title: track.name,
            artist: track.artists[0]?.name || 'Unknown Artist',
            spotifyUri: track.uri,
            artworkUrl: track.album?.images?.[0]?.url,
            albumSpotifyUri: track.album?.uri,
            artistSpotifyUri: track.artists[0]?.uri,
            album: track.album?.name,
            durationMs: track.duration_ms,
          })

          // Add to existingUris set to avoid duplicates within results
          existingUris.add(track.uri)
        }
      } catch (error) {
        console.error(`Failed to search for ${query.title} by ${query.artist}:`, error)
        // Continue with next query on error
      }
    }

    return results
  } catch (error) {
    console.error('Error authenticating with Spotify:', error)
    throw new Error('Failed to search Spotify: ' + (error instanceof Error ? error.message : 'Unknown error'))
  }
}

/**
 * Add songs to playlist as AI suggestions
 */
export async function addAISuggestedTracks(
  playlistId: string,
  songs: SongSearchResult[]
): Promise<Track[]> {
  const supabase = await createClient()

  try {
    // Get the current max position in playlist
    const { data: maxPositionTrack } = await supabase
      .from('tracks')
      .select('position')
      .eq('playlist_id', playlistId)
      .order('position', { ascending: false })
      .limit(1)
      .single()

    const nextPosition = (maxPositionTrack?.position || 0) + 1

    // Insert all songs
    const tracksToInsert = songs.map((song, index) => ({
      playlist_id: playlistId,
      title: song.title,
      artist: song.artist,
      album: song.album || null,
      artwork_url: song.artworkUrl || null,
      spotify_uri: song.spotifyUri || null,
      artist_spotify_uri: song.artistSpotifyUri || null,
      album_spotify_uri: song.albumSpotifyUri || null,
      duration_ms: song.durationMs || null,
      status: 'suggested' as const,
      suggested_by: 'ai-assistant',
      position: nextPosition + index,
    }))

    const { data: insertedTracks, error } = await supabase
      .from('tracks')
      .insert(tracksToInsert as any)
      .select()

    if (error) {
      throw error
    }

    return insertedTracks || []
  } catch (error) {
    console.error('Error adding AI suggested tracks:', error)
    throw new Error('Failed to add tracks: ' + (error instanceof Error ? error.message : 'Unknown error'))
  }
}
