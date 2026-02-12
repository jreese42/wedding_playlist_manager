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

// ============================================================
// Shared Track Row Builder
// ============================================================

/**
 * Build a complete track DB row from a Spotify API track object.
 * Works with both search results (spotify-web-api-node) and raw API items.
 * 
 * This is the SINGLE SOURCE OF TRUTH for mapping Spotify data → DB columns.
 * All code that inserts tracks should use this to guarantee every field is populated.
 */
export function buildTrackRow(
  spotifyTrack: any,
  overrides: {
    playlist_id: string
    status: 'active' | 'suggested' | 'rejected'
    position: number | null
    added_by?: string | null
    suggested_by?: string | null
  }
) {
  return {
    playlist_id: overrides.playlist_id,
    title: spotifyTrack.name || 'Unknown',
    artist: spotifyTrack.artists?.map((a: any) => a.name).join(', ')
      || spotifyTrack.artist  // fallback for our normalized shape
      || 'Unknown',
    album: spotifyTrack.album?.name
      || (typeof spotifyTrack.album === 'string' ? spotifyTrack.album : null)  // fallback for normalized shape where album is a string
      || null,
    artwork_url: spotifyTrack.album?.images?.[0]?.url
      || spotifyTrack.artwork_url  // fallback for our normalized shape
      || null,
    spotify_uri: spotifyTrack.uri || null,
    artist_spotify_uri: spotifyTrack.artists?.[0]?.uri
      || spotifyTrack.artist_uri  // fallback
      || null,
    album_spotify_uri: spotifyTrack.album?.uri
      || spotifyTrack.album_uri  // fallback
      || null,
    duration_ms: spotifyTrack.duration_ms || 0,
    status: overrides.status,
    position: overrides.position,
    added_by: overrides.added_by ?? null,
    suggested_by: overrides.suggested_by ?? null,
  }
}

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
): Promise<Array<{ uri: string; name: string; artist: string; album: string; artwork_url: string | null; duration_ms: number; artist_uri: string | null; album_uri: string | null; raw: any }>> {
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
            raw: item, // preserve raw Spotify object for buildTrackRow
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
 * Sync FROM Spotify TO webapp, then push webapp → Spotify.
 * 
 * The webapp is ALWAYS the source of truth. This function:
 * 1. Fetches the current Spotify playlist
 * 2. Any songs in Spotify but NOT in the webapp → added as SUGGESTIONS
 * 3. Those new songs are REMOVED from the Spotify playlist (consumed)
 * 4. Detects tracks deleted from Spotify:
 *    - If a track has spotify_pushed_at set (was previously pushed) but is
 *      now missing from Spotify → someone deleted it from Spotify → demote to 'rejected'
 *    - If a track has spotify_pushed_at null → new in webapp, needs first push
 * 5. Pushes remaining active tracks to Spotify and marks spotify_pushed_at
 * 6. Updates sync_timestamp
 */
export async function syncSpotifyToWebapp(playlistId: string, playlistSpotifyId: string) {
  const supabase = await createAdminClient()

  try {
    // 0. Sync playlist metadata (title, description) from Spotify
    await syncPlaylistMetadata(playlistId, playlistSpotifyId)

    // 1. Get ALL tracks in webapp (active + suggested + rejected) to know what we already have
    const { data: allWebappTracks } = await supabase
      .from('tracks')
      .select('id, spotify_uri, status, position')
      .eq('playlist_id', playlistId)

    const knownUris = new Set(
      (allWebappTracks || [])
        .map(t => t.spotify_uri)
        .filter((uri): uri is string => uri !== null && uri !== undefined)
    )

    // 2. Get current tracks in Spotify playlist
    const spotifyTracks = await getTracksFromSpotify(playlistSpotifyId)

    // 3. Find songs in Spotify that we don't know about at all → new suggestions
    const newFromSpotify = spotifyTracks.filter(t => !knownUris.has(t.uri))

    if (newFromSpotify.length > 0) {
      // Add them as suggestions in the webapp using buildTrackRow for complete data
      const suggestionsToInsert = newFromSpotify.map((track) =>
        buildTrackRow(track.raw, {
          playlist_id: playlistId,
          status: 'suggested',
          position: null,
        })
      )

      await supabase.from('tracks').insert(suggestionsToInsert)

      // Remove these new tracks from the Spotify playlist (we've consumed them)
      const urisToRemove = newFromSpotify.map(t => t.uri)
      await removeItemsFromPlaylist(playlistSpotifyId, urisToRemove)
    }

    // 4. Detect deletions from Spotify and push remaining active tracks
    //    - Tracks with spotify_pushed_at set but missing from Spotify → deleted from Spotify → demote
    //    - Tracks with spotify_pushed_at null → new in webapp, need first push
    const spotifyUriSet = new Set(spotifyTracks.map(t => t.uri))

    const { data: activeTracks } = await supabase
      .from('tracks')
      .select('id, spotify_uri, spotify_pushed_at')
      .eq('playlist_id', playlistId)
      .eq('status', 'active')
      .order('position', { ascending: true })

    const deletedFromSpotify = (activeTracks || []).filter(
      t => t.spotify_uri && t.spotify_pushed_at && !spotifyUriSet.has(t.spotify_uri)
    )

    // Demote tracks that were deleted from Spotify
    if (deletedFromSpotify.length > 0) {
      const deletedIds = deletedFromSpotify.map(t => t.id)
      await supabase
        .from('tracks')
        .update({ status: 'rejected', position: null, spotify_pushed_at: null })
        .in('id', deletedIds)
    }

    // Re-fetch remaining active tracks after demotions
    const { data: remainingActive } = await supabase
      .from('tracks')
      .select('id, spotify_uri')
      .eq('playlist_id', playlistId)
      .eq('status', 'active')
      .order('position', { ascending: true })

    const activeUris = (remainingActive || [])
      .map(t => t.spotify_uri)
      .filter((uri): uri is string => uri !== null && uri !== undefined)

    await replacePlaylistItems(playlistSpotifyId, activeUris)

    // Mark all pushed tracks with spotify_pushed_at
    const pushedIds = (remainingActive || [])
      .filter(t => t.spotify_uri)
      .map(t => t.id)
    if (pushedIds.length > 0) {
      await supabase
        .from('tracks')
        .update({ spotify_pushed_at: new Date().toISOString() })
        .in('id', pushedIds)
    }

    // 5. Update sync_timestamp
    await supabase
      .from('playlists')
      .update({ sync_timestamp: new Date().toISOString() })
      .eq('id', playlistId)

  } catch (error) {
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
      .select('id, spotify_uri')
      .eq('playlist_id', playlistId)
      .eq('status', 'active')
      .order('position', { ascending: true })

    const tracksWithUri = (tracks || []).filter(
      (t): t is typeof t & { spotify_uri: string } => t.spotify_uri !== null && t.spotify_uri !== undefined
    )
    const trackUris = tracksWithUri.map(t => t.spotify_uri)

    // Replace Spotify playlist with webapp active tracks
    const success = await reorderTracksInSpotify(playlistSpotifyId, trackUris)
    
    if (success) {
      // Mark all pushed tracks with spotify_pushed_at
      const pushedIds = tracksWithUri.map(t => t.id)
      if (pushedIds.length > 0) {
        await supabase
          .from('tracks')
          .update({ spotify_pushed_at: new Date().toISOString() })
          .in('id', pushedIds)
      }

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
      description: playlist.description || null,
      cover_url: playlist.images?.[0]?.url || null,
    }

    await supabase
      .from('playlists')
      .update(updateData)
      .eq('id', playlistId)
    
    return true
  } catch (error) {
    console.error(`Failed to sync metadata for playlist ${playlistId}:`, error)
    return false
  }
}
