/**
 * Manual sync endpoint
 * POST /api/sync/[playlistId] - Syncs a specific playlist from Spotify to webapp
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { syncSpotifyToWebapp } from '@/lib/spotify-sync'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { playlistId: string } }
) {
  try {
    const playlistId = params.playlistId

    // Get the playlist to find its Spotify ID
    const supabase = await createAdminClient()
    const { data: playlist, error } = await supabase
      .from('playlists')
      .select('id, spotify_id')
      .eq('id', playlistId)
      .single()

    if (error || !playlist) {
      return NextResponse.json(
        { error: 'Playlist not found' },
        { status: 404 }
      )
    }

    if (!playlist.spotify_id) {
      return NextResponse.json(
        { error: 'Playlist does not have a Spotify ID' },
        { status: 400 }
      )
    }

    // Perform the sync
    await syncSpotifyToWebapp(playlistId, playlist.spotify_id)

    return NextResponse.json({
      success: true,
      message: 'Playlist synced from Spotify'
    })
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json(
      { error: 'Failed to sync playlist' },
      { status: 500 }
    )
  }
}
