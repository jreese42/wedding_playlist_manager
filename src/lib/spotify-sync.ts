/**
 * Spotify Sync Utilities
 * Handles bidirectional synchronization between the webapp and Spotify playlists
 * 
 * Updated for Feb 2026 Spotify API changes:
 * - All playlist track endpoints renamed from /tracks to /items
 * - Response fields renamed: tracks → items, track → item
 * - Playlist items only returned for owner's playlists (requires admin OAuth)
 */

import {
  getPlaylistItems,
  addItemsToPlaylist,
  removeItemsFromPlaylist,
  replacePlaylistItems,
  isSpotifyConnected,
  spotifyFetch,
} from './spotify'
import { createAdminClient } from './supabase/admin'

/**
 * Extract Spotify URI from various formats
 * e.g., "spotify:track:123" or "https://open.spotify.com/track/123" -> "123"
 */
export function extractSpotifyId(uri: string): string | null {
  if (!uri) return null
  
  // Handle spotify:track:ID format
  if (uri.includes('spotify:track:')) {
    return uri.split('spotify:track:')[1]
  }
  
  // Handle https://open.spotify.com/track/ID format
  const match = uri.match(/track\/([a-zA-Z0-9]+)/)
  if (match) return match[1]
  
  // Assume it's already just the ID
  if (uri.length === 22 || uri.match(/^[a-zA-Z0-9]+$/)) {
    return uri
  }
  
  return null
}

/**
 * Add a single track to a Spotify playlist.
 * Uses POST /playlists/{id}/items (Feb 2026 API).
 */
export async function addTrackToSpotify(
  playlistSpotifyId: string,
  trackSpotifyUri: string
): Promise<boolean> {
  const connected = await isSpotifyConnected()
  if (!connected) {
    console.log('Spotify not connected. Track added to webapp only.')
    return false
  }

  try {
    await addItemsToPlaylist(playlistSpotifyId, [trackSpotifyUri])
    console.log(`Added track ${trackSpotifyUri} to Spotify playlist ${playlistSpotifyId}`)
    return true
  } catch (error) {
    console.error('Failed to add track to Spotify:', error)
    return false
  }
}

/**
 * Remove a single track from a Spotify playlist.
 * Uses DELETE /playlists/{id}/items (Feb 2026 API).
 */
export async function removeTrackFromSpotify(
  playlistSpotifyId: string,
  trackSpotifyUri: string
): Promise<boolean> {
  const connected = await isSpotifyConnected()
  if (!connected) {
    console.log('Spotify not connected. Track removed from webapp only.')
    return false
  }

  try {
    await removeItemsFromPlaylist(playlistSpotifyId, [trackSpotifyUri])
    console.log(`Removed track ${trackSpotifyUri} from Spotify playlist ${playlistSpotifyId}`)
    return true
  } catch (error) {
    console.error('Failed to remove track from Spotify:', error)
    return false
  }
}

/**
 * Replace all tracks in a Spotify playlist to match the given order.
 * Uses PUT /playlists/{id}/items (Feb 2026 API).
 */
export async function reorderTracksInSpotify(
  playlistSpotifyId: string,
  trackSpotifyUris: string[]
): Promise<boolean> {
  const connected = await isSpotifyConnected()
  if (!connected) {
    console.log('Spotify not connected. Tracks reordered in webapp only.')
    return false
  }

  try {
    await replacePlaylistItems(playlistSpotifyId, trackSpotifyUris)
    console.log(`Replaced ${trackSpotifyUris.length} tracks in Spotify playlist ${playlistSpotifyId}`)
    return true
  } catch (error) {
    console.error('Failed to reorder tracks in Spotify:', error)
    return false
  }
}

/**
 * Fetch current tracks from a Spotify playlist.
 * Uses GET /playlists/{id}/items (Feb 2026 API).
 * Response fields: items[].item (was items[].track)
 */
export async function getTracksFromSpotify(
  playlistSpotifyId: string
): Promise<Array<{ uri: string; name: string; artist: string; album: string; artwork_url: string | null; duration_ms: number; artist_uri: string | null; album_uri: string | null }>> {
  try {
    const connected = await isSpotifyConnected()
    if (!connected) {
      console.log('Spotify not connected. Cannot fetch tracks.')
      return []
    }

    const tracks: any[] = []
    let offset = 0
    const limit = 50

    while (true) {
      const result = await getPlaylistItems(playlistSpotifyId, { offset, limit })
      const items = result.items || []
      
      for (const entry of items) {
        // Feb 2026 API: field is now "item" instead of "track"
        const item = entry.item || (entry as any).track
        if (item && item.uri) {
          tracks.push({
            uri: item.uri,
            name: item.name,
            artist: item.artists?.map((a: any) => a.name).join(', ') || 'Unknown',
            album: item.album?.name || '',
            artwork_url: item.album?.images?.[0]?.url || null,
            duration_ms: item.duration_ms || 0,
            artist_uri: item.artists?.[0]?.uri || null,
            album_uri: item.album?.uri || null,
          })
        }
      }

      offset += limit
      if (!result.next) break
    }

    return tracks
  } catch (error) {
    console.error('Failed to fetch tracks from Spotify:', error)
    return []
  }
}

/**
 * Sync tracks FROM Spotify TO webapp
 * Non-destructive: 
 * - Songs added on Spotify are added to webapp active list
 * - Songs removed from Spotify are moved to suggested (not deleted)
 * - Webapp is the SOURCE OF TRUTH for active songs
 */
export async function syncSpotifyToWebapp(playlistId: string, playlistSpotifyId: string) {
  const supabase = await createAdminClient()

  try {
    // 1. Get current active tracks in webapp
    const { data: webappTracks } = await supabase
      .from('tracks')
      .select('id, spotify_uri, status, position')
      .eq('playlist_id', playlistId)
      .eq('status', 'active')
      .order('position', { ascending: true })

    // 2. Get current tracks in Spotify playlist
    const spotifyTracks = await getTracksFromSpotify(playlistSpotifyId)
    const spotifyTrackUris = new Set(spotifyTracks.map(t => t.uri))

    // 3. Find songs removed from Spotify (were active in webapp but not in Spotify)
    // Move these to suggested to avoid data loss
    const webappActiveUris = new Set(
      (webappTracks || [])
        .map(t => t.spotify_uri)
        .filter((uri): uri is string => uri !== null && uri !== undefined)
    )
    const removedFromSpotify = (webappTracks || []).filter(
      t => t.spotify_uri && !spotifyTrackUris.has(t.spotify_uri)
    )

    if (removedFromSpotify.length > 0) {
      await supabase
        .from('tracks')
        .update({ status: 'suggested', position: null })
        .in('id', removedFromSpotify.map(t => t.id))
      
      console.log(`Moved ${removedFromSpotify.length} tracks from Spotify to suggested`)
    }

    // 4. Find songs added in Spotify (not in webapp active, but in Spotify)
    // Add them to webapp with highest position
    const addedToSpotify = spotifyTracks.filter(t => !webappActiveUris.has(t.uri))

    if (addedToSpotify.length > 0) {
      const maxPosition = Math.max(...(webappTracks?.map(t => t.position || 0) || [0]))
      const tracksToAdd = addedToSpotify.map((track, index) => ({
        playlist_id: playlistId,
        spotify_uri: track.uri,
        title: track.name,
        artist: track.artist,
        status: 'active' as const,
        position: maxPosition + index + 1,
        added_by: null // System sync
      }))

      await supabase.from('tracks').insert(tracksToAdd)
      console.log(`Added ${addedToSpotify.length} tracks from Spotify to webapp`)
    }

    // 5. Update sync_timestamp
    await supabase
      .from('playlists')
      .update({ sync_timestamp: new Date().toISOString() })
      .eq('id', playlistId)

  } catch (error) {
    console.error('Failed to sync Spotify to webapp:', error)
    throw error
  }
}

/**
 * Sync tracks FROM webapp TO Spotify
 * Called whenever a user modifies the active track list
 */
export async function syncWebappToSpotify(playlistId: string, playlistSpotifyId: string) {
  const supabase = await createAdminClient()

  try {
    // Get all active tracks in webapp
    const { data: tracks } = await supabase
      .from('tracks')
      .select('spotify_uri')
      .eq('playlist_id', playlistId)
      .eq('status', 'active')
      .order('position', { ascending: true })

    const trackUris = (tracks || [])
      .map(t => t.spotify_uri)
      .filter((uri): uri is string => uri !== null && uri !== undefined)

    // Replace Spotify playlist with webapp active tracks
    const success = await reorderTracksInSpotify(playlistSpotifyId, trackUris)
    
    if (success) {
      // Update sync_timestamp
      await supabase
        .from('playlists')
        .update({ sync_timestamp: new Date().toISOString() })
        .eq('id', playlistId)
    }

    return success
  } catch (error) {
    console.error('Failed to sync webapp to Spotify:', error)
    return false
  }
}

/**
 * Sync ONLY metadata (Title, Description) from Spotify to Webapp.
 * Uses GET /playlists/{id} which is still available (Feb 2026 API).
 */
export async function syncPlaylistMetadata(playlistId: string, playlistSpotifyId: string) {
  const supabase = await createAdminClient()

  try {
    // Use raw fetch since getPlaylist() via the library may have field changes
    const playlist = await spotifyFetch(`/playlists/${playlistSpotifyId}`)
    
    const updateData: any = {
      spotify_title: playlist.name,
    }

    if (playlist.description) {
      updateData.description = playlist.description
    }

    if (Object.keys(updateData).length > 0) {
      await supabase
        .from('playlists')
        .update(updateData)
        .eq('id', playlistId)
      
      console.log(`Updated metadata for playlist ${playlistId}`)
    }
    
    return true
  } catch (error) {
    console.error(`Failed to sync metadata for playlist ${playlistId}:`, error)
    return false
  }
}
