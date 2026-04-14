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
 * Pull current Spotify state into the webapp. Safe to call on page load — never
 * overwrites Spotify with webapp data, so it cannot race with user-triggered pushes.
 *
 * 1. New tracks in Spotify not in webapp → added as SUGGESTIONS, removed from Spotify
 * 2. Active tracks (spotify_pushed_at set) missing from Spotify → demoted to SUGGESTED
 * 3. Spotify track order differs from webapp order → webapp positions updated to match
 * 4. spotify_pushed_at updated for active tracks confirmed present in Spotify
 */
export async function pullFromSpotify(playlistId: string, playlistSpotifyId: string) {
  const supabase = await createAdminClient()

  // 0. Sync playlist metadata (title, description, cover) from Spotify
  await syncPlaylistMetadata(playlistId, playlistSpotifyId)

  // 1. Get ALL webapp tracks (all statuses) to know what URIs we already have
  const { data: allWebappTracks } = await supabase
    .from('tracks')
    .select('id, spotify_uri, status, position')
    .eq('playlist_id', playlistId)

  const knownUris = new Set(
    (allWebappTracks || [])
      .map(t => t.spotify_uri)
      .filter((uri): uri is string => uri !== null && uri !== undefined)
  )

  // 2. Get current tracks from Spotify
  const spotifyTracks = await getTracksFromSpotify(playlistSpotifyId)
  const spotifyUriSet = new Set(spotifyTracks.map(t => t.uri))

  // 3. Tracks in Spotify not in webapp → new suggestions, consumed from Spotify
  const newFromSpotify = spotifyTracks.filter(t => !knownUris.has(t.uri))

  if (newFromSpotify.length > 0) {
    // Re-check before inserting to guard against concurrent sync instances
    const candidateUris = newFromSpotify.map(t => t.uri)
    const { data: alreadyInserted } = await supabase
      .from('tracks')
      .select('spotify_uri')
      .eq('playlist_id', playlistId)
      .in('spotify_uri', candidateUris)
    const alreadyInsertedUris = new Set(
      (alreadyInserted || []).map(t => t.spotify_uri).filter((u): u is string => u !== null)
    )
    const trulyNew = newFromSpotify.filter(t => !alreadyInsertedUris.has(t.uri))

    if (trulyNew.length > 0) {
      const suggestionsToInsert = trulyNew.map((track) =>
        buildTrackRow(track.raw, {
          playlist_id: playlistId,
          status: 'suggested',
          position: null,
        })
      )
      await supabase.from('tracks').insert(suggestionsToInsert)
    }

    // Remove consumed tracks from Spotify (targeted removal — does not affect other tracks)
    await removeItemsFromPlaylist(playlistSpotifyId, candidateUris)
  }

  // 4. Active tracks with spotify_pushed_at set but now missing from Spotify → demoted to SUGGESTED
  //    (spotify_pushed_at null means never pushed — not a deletion)
  const { data: activeTracks } = await supabase
    .from('tracks')
    .select('id, spotify_uri, spotify_pushed_at')
    .eq('playlist_id', playlistId)
    .eq('status', 'active')
    .order('position', { ascending: true })

  const deletedFromSpotify = (activeTracks || []).filter(
    t => t.spotify_uri && t.spotify_pushed_at && !spotifyUriSet.has(t.spotify_uri)
  )

  if (deletedFromSpotify.length > 0) {
    const deletedIds = deletedFromSpotify.map(t => t.id)
    await supabase
      .from('tracks')
      .update({ status: 'suggested', position: null, spotify_pushed_at: null })
      .in('id', deletedIds)
      .eq('status', 'active')  // guard: don't override status the user already changed
  }

  // 5. Re-fetch remaining active tracks after any demotions
  const { data: remainingActive } = await supabase
    .from('tracks')
    .select('id, spotify_uri, spotify_pushed_at')
    .eq('playlist_id', playlistId)
    .eq('status', 'active')
    .order('position', { ascending: true })

  let orderedActive = remainingActive || []

  // 6. Capture Spotify reorder → update webapp positions to match
  //    Uses spotifyUriSet (real Spotify membership) rather than spotify_pushed_at
  //    so the capture works on the first pull after a reorder, not just the second.
  //    Falls through silently on any error, keeping existing webapp order.
  try {
    // After deletion detection, remaining active tracks in Spotify are the "pushed" set
    const pushedActive = orderedActive.filter(t => t.spotify_uri && spotifyUriSet.has(t.spotify_uri))

    if (pushedActive.length > 1) {
      const pushedUriToTrack = new Map(pushedActive.map(t => [t.spotify_uri as string, t]))
      const spotifyOrderOfPushed = spotifyTracks.filter(t => pushedUriToTrack.has(t.uri))

      // Count must match — if not, skip (deletion detection may not have fully settled)
      if (spotifyOrderOfPushed.length === pushedActive.length) {
        const webappUris = pushedActive.map(t => t.spotify_uri as string)
        const spotifyUris = spotifyOrderOfPushed.map(t => t.uri)
        const orderChanged = webappUris.some((uri, i) => uri !== spotifyUris[i])

        if (orderChanged) {
          // Tracks not in Spotify keep their relative webapp order, appended after
          const notPushed = orderedActive.filter(t => !t.spotify_uri || !spotifyUriSet.has(t.spotify_uri))
          const reordered = [
            ...spotifyOrderOfPushed.map(st => pushedUriToTrack.get(st.uri)!),
            ...notPushed,
          ]

          for (const [idx, track] of reordered.entries()) {
            const { error } = await supabase
              .from('tracks')
              .update({ position: idx + 1 })
              .eq('id', track.id)
            if (error) throw new Error(`Position update failed for track ${track.id}: ${error.message}`)
          }

          orderedActive = reordered
          console.log(`Captured Spotify reorder for playlist ${playlistId}`)
        }
      }
    }
  } catch (err) {
    console.error(`Failed to capture Spotify reorder for playlist ${playlistId}, using webapp order:`, err)
  }

  // 7. Update spotify_pushed_at for active tracks confirmed present in Spotify
  const confirmedIds = orderedActive
    .filter(t => t.spotify_uri && spotifyUriSet.has(t.spotify_uri))
    .map(t => t.id)
  if (confirmedIds.length > 0) {
    await supabase
      .from('tracks')
      .update({ spotify_pushed_at: new Date().toISOString() })
      .in('id', confirmedIds)
  }

  // 8. Update sync_timestamp
  await supabase
    .from('playlists')
    .update({ sync_timestamp: new Date().toISOString() })
    .eq('id', playlistId)
}

/**
 * Full bidirectional sync: pull Spotify state into webapp, then push webapp active
 * tracks back to Spotify. Used by periodic sync and the manual sync API endpoint.
 *
 * Do NOT call on page load — the push phase can race with concurrent user actions.
 * Page loads should call pullFromSpotify instead.
 */
export async function syncSpotifyToWebapp(playlistId: string, playlistSpotifyId: string) {
  await pullFromSpotify(playlistId, playlistSpotifyId)
  await syncWebappToSpotify(playlistId, playlistSpotifyId)
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
