/**
 * Periodic Sync Service
 * Handles automatic bidirectional syncing between webapp and Spotify at regular intervals
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { syncSpotifyToWebapp } from './spotify-sync'

/**
 * Start the periodic sync service
 * Syncs all playlists with Spotify every interval (default: 10 minutes)
 */
export async function startPeriodicSync(intervalMs: number = 10 * 60 * 1000) {
  // Run initial sync on startup
  console.log('Starting periodic sync service...')
  await runFullSync()

  // Set up recurring syncs
  setInterval(async () => {
    try {
      await runFullSync()
    } catch (err) {
      console.error('Error during periodic sync:', err)
    }
  }, intervalMs)

  console.log(`Periodic sync configured for every ${intervalMs / 1000 / 60} minutes`)
}

/**
 * Run a full sync of all playlists with Spotify
 */
export async function runFullSync() {
  try {
    const supabase = await createAdminClient()

    // Get all playlists that have Spotify IDs
    const { data: playlists, error } = await supabase
      .from('playlists')
      .select('id, spotify_id, sync_timestamp')
      .not('spotify_id', 'is', null)

    if (error) {
      console.error('Error fetching playlists for sync:', error)
      return
    }

    if (!playlists || playlists.length === 0) {
      console.log('No playlists to sync')
      return
    }

    console.log(`Syncing ${playlists.length} playlists with Spotify...`)

    // Sync each playlist
    const results = await Promise.allSettled(
      playlists.map(async (playlist) => {
        try {
          if (!playlist.spotify_id) {
            throw new Error('Playlist missing Spotify ID')
          }
          await syncSpotifyToWebapp(playlist.id, playlist.spotify_id)
          console.log(`✓ Synced playlist: ${playlist.id}`)
          return { success: true, playlistId: playlist.id }
        } catch (err) {
          console.error(`✗ Failed to sync playlist ${playlist.id}:`, err)
          return { success: false, playlistId: playlist.id, error: err }
        }
      })
    )

    const successful = results.filter(
      (r) => r.status === 'fulfilled' && r.value.success
    ).length
    const failed = results.filter(
      (r) => r.status === 'rejected' || !r.value?.success
    ).length

    console.log(`Sync complete: ${successful} succeeded, ${failed} failed`)
  } catch (err) {
    console.error('Fatal error during full sync:', err)
  }
}


