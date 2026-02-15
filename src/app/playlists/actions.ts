'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkIfAdmin } from '@/lib/auth/helpers'
import { getSpotifyClient } from '@/lib/spotify'
import { revalidatePath } from 'next/cache'

async function fetchSpotifyPlaylistTitle(spotifyId: string): Promise<string | null> {
    try {
        const spotify = await getSpotifyClient()
        if (!spotify) return null
        const playlist = await spotify.getPlaylist(spotifyId)
        return playlist.body.name || null
    } catch (error) {
        console.error('Failed to fetch Spotify playlist title:', error)
        return null
    }
}

export async function createPlaylist(name: string, spotifyUri: string) {
    const isAdmin = await checkIfAdmin()
    if (!isAdmin) throw new Error('Unauthorized: admin access required')

    const supabase = await createAdminClient()

    if (!name || !name.trim()) {
        throw new Error('Playlist name is required')
    }

    if (!spotifyUri || !spotifyUri.trim()) {
        throw new Error('Spotify URI is required')
    }

    // Extract Spotify ID from URI (e.g., "spotify:playlist:37i9dQZF1DX4UtSsGT1Sbe" -> "37i9dQZF1DX4UtSsGT1Sbe")
    const spotifyId = spotifyUri.split(':').pop()
    if (!spotifyId) {
        throw new Error('Invalid Spotify URI format')
    }

    // Fetch the actual Spotify playlist title
    const spotifyTitle = await fetchSpotifyPlaylistTitle(spotifyId)

    // Get max display order
    const { data: maxOrderData } = await supabase
        .from('playlists')
        .select('display_order')
        .order('display_order', { ascending: false })
        .limit(1)
        .single()

    const nextOrder = (maxOrderData?.display_order || 0) + 1

    const { error } = await supabase.from('playlists').insert({
        title: name.trim(),
        spotify_title: spotifyTitle,
        spotify_id: spotifyId,
        display_order: nextOrder
    })

    if (error) {
        console.error('Failed to create playlist:', error)
        throw new Error(error.message)
    }

    revalidatePath('/', 'layout')
}

export async function updatePlaylist(playlistId: string, name: string, spotifyUri?: string) {
    const isAdmin = await checkIfAdmin()
    if (!isAdmin) throw new Error('Unauthorized: admin access required')

    const supabase = await createAdminClient()

    if (!name || !name.trim()) {
        throw new Error('Playlist name is required')
    }

    const updateData: any = {
        title: name.trim()
    }

    if (spotifyUri && spotifyUri.trim()) {
        const spotifyId = spotifyUri.split(':').pop()
        if (!spotifyId) {
            throw new Error('Invalid Spotify URI format')
        }
        updateData.spotify_id = spotifyId
        // Fetch and update the Spotify playlist title
        const spotifyTitle = await fetchSpotifyPlaylistTitle(spotifyId)
        if (spotifyTitle) {
            updateData.spotify_title = spotifyTitle
        }
    }

    const { error } = await supabase
        .from('playlists')
        .update(updateData)
        .eq('id', playlistId)

    if (error) {
        console.error('Failed to update playlist:', error)
        throw new Error(error.message)
    }

    revalidatePath('/', 'layout')
}

export async function deletePlaylist(playlistId: string) {
    const isAdmin = await checkIfAdmin()
    if (!isAdmin) throw new Error('Unauthorized: admin access required')

    const supabase = await createAdminClient()

    const { error } = await supabase
        .from('playlists')
        .delete()
        .eq('id', playlistId)

    if (error) {
        console.error('Failed to delete playlist:', error)
        throw new Error(error.message)
    }

    revalidatePath('/', 'layout')
}

export async function reorderPlaylists(playlistOrder: Array<{ id: string; order: number }>) {
    const isAdmin = await checkIfAdmin()
    if (!isAdmin) throw new Error('Unauthorized: admin access required')

    const supabase = await createAdminClient()

    // Update each playlist's display_order
    for (const { id, order } of playlistOrder) {
        const { error } = await supabase
            .from('playlists')
            .update({ display_order: order })
            .eq('id', id)

        if (error) {
            console.error('Failed to reorder playlist:', error)
            throw new Error(error.message)
        }
    }

    revalidatePath('/', 'layout')
}

export async function getAllPlaylists() {
    const supabase = await createClient()

    const { data: playlists, error } = await supabase
        .from('playlists')
        .select('*')
        .order('display_order', { ascending: true })

    if (error) {
        console.error('Error fetching playlists:', error)
        throw new Error(error.message)
    }

    return playlists || []
}
