'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSpotifyClient } from '@/lib/spotify'
import { checkIfAdmin } from '@/lib/auth/helpers'
import { revalidatePath } from 'next/cache'

export async function moveTrack(playlistId: string, trackId: string, newPosition: number, oldPosition: number) {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { error } = await supabase.rpc('reorder_track', {
        p_track_id: trackId,
        p_new_position: newPosition,
        p_old_position: oldPosition,
        p_playlist_id: playlistId,
        p_user_id: user.id
    })

    if (error) {
        console.error('Reorder failed:', error)
        throw new Error(error.message)
    }

    revalidatePath('/playlist/[slug]', 'layout')
}

export async function updateRating(trackId: string, rating: number) {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    // 1. Update the track
    const { error } = await supabase.from('tracks')
        .update({ rating })
        .eq('id', trackId)

    if (error) throw new Error(error.message)

    // 2. Log to Audit
    await supabase.from('audit_log').insert({
        track_id: trackId,
        user_id: user.id,
        action: 'rate',
        details: { rating }
    })

    revalidatePath('/playlist/[slug]', 'layout')
}

export async function updateStatus(trackId: string, status: 'active' | 'suggested' | 'rejected') {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    // 1. Update the track
    const { error } = await supabase.from('tracks')
        .update({ status })
        .eq('id', trackId)

    if (error) throw new Error(error.message)

    // 2. Log to Audit
    await supabase.from('audit_log').insert({
        track_id: trackId,
        user_id: user.id,
        action: 'status_change',
        details: { status }
    })

    revalidatePath('/playlist/[slug]', 'layout')
}

export async function getTrackHistory(trackId: string) {
    const supabase = await createClient()
    const adminAuthClient = createAdminClient() // Needed to get user emails from auth.users

    // 1. Get logs
    const { data: logs, error } = await supabase
        .from('audit_log')
        .select('*')
        .eq('track_id', trackId)
        .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    if (!logs) return []

    // 2. Hydrate with user emails (inefficient n+1 but fine for small scale)
    const hydratedLogs = await Promise.all(logs.map(async (log) => {
        let userEmail = 'Unknown'
        if (log.user_id) {
            const { data: { user }, error: userError } = await adminAuthClient.auth.admin.getUserById(log.user_id)
            if (user) userEmail = user.email || 'No Email'
        }
        return {
            ...log,
            user_email: userEmail
        }
    }))

    return hydratedLogs
}

export async function addComment(trackId: string, comment: string) {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    if (!comment || comment.trim().length === 0) {
        throw new Error('Comment cannot be empty')
    }

    const { error } = await supabase.from('audit_log').insert({
        track_id: trackId,
        user_id: user.id,
        action: 'comment',
        details: { comment: comment.trim() }
    })

    if (error) {
        console.error('Failed to add comment:', error)
        throw new Error(error.message)
    }

    revalidatePath('/playlist/[slug]', 'layout')
}

export async function pinComment(trackId: string, comment: string | null) {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { error } = await supabase.from('tracks')
        .update({ pinned_comment: comment })
        .eq('id', trackId)

    if (error) {
        console.error('Failed to pin comment:', error)
        throw new Error(error.message)
    }

    revalidatePath('/playlist/[slug]', 'layout')
}

export async function searchSpotify(query: string) {
    const spotify = await getSpotifyClient()
    const response = await spotify.searchTracks(query, { limit: 5 })
    return response.body.tracks?.items || []
}

export async function addTrack(playlistId: string, track: any, status: 'active' | 'suggested') {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    // Get max position if adding to active list
    let position = 0
    if (status === 'active') {
        const { data: maxPosData } = await supabase.from('tracks')
            .select('position')
            .eq('playlist_id', playlistId)
            .order('position', { ascending: false })
            .limit(1)
            .single()
        position = (maxPosData?.position || 0) + 1
    }

    const { error } = await supabase.from('tracks').insert({
        playlist_id: playlistId,
        title: track.name,
        artist: track.artists.map((a: any) => a.name).join(', '),
        album: track.album.name,
        artwork_url: track.album.images[0]?.url,
        spotify_uri: track.uri,
        artist_spotify_uri: track.artists[0]?.uri,
        album_spotify_uri: track.album.uri,
        duration_ms: track.duration_ms,
        status: status,
        position: status === 'active' ? position : null,
        added_by: user.id
    })

    if (error) {
        console.error('Failed to add track:', error)
        throw new Error(error.message)
    }

    // Log to Audit
    await supabase.from('audit_log').insert({
        track_id: undefined, // We don't have the ID easily here without a second query, skipping for now or could select back
        user_id: user.id,
        action: 'add',
        details: { title: track.name, status }
    })

    revalidatePath('/playlist/[slug]', 'layout')
}

export async function deleteTrack(trackId: string) {
    const isAdmin = await checkIfAdmin()
    if (!isAdmin) throw new Error('Unauthorized')

    const supabase = await createClient()
    const { error } = await supabase.from('tracks').delete().eq('id', trackId)

    if (error) {
        console.error('Failed to delete track:', error)
        throw new Error(error.message)
    }

    revalidatePath('/playlist/[slug]', 'layout')
}



