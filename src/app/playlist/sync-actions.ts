/**
 * Spotify Sync Actions
 * Server actions for manual syncing triggered from the UI
 */

'use server'

import { syncPlaylistManually } from '@/lib/spotify-periodic-sync'
import { checkIfAdmin } from '@/lib/auth/helpers'

export async function triggerPlaylistSync(playlistId: string) {
  // Only admins can trigger manual syncs
  const isAdmin = await checkIfAdmin()
  if (!isAdmin) {
    throw new Error('Unauthorized: Only admins can trigger syncs')
  }

  try {
    await syncPlaylistManually(playlistId)
    return { success: true, message: 'Playlist synced successfully' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to sync playlist'
    console.error('Manual sync error:', error)
    throw new Error(message)
  }
}
