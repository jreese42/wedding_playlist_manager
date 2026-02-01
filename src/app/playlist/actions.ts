'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSpotifyClient } from '@/lib/spotify'
import { checkIfAdmin } from '@/lib/auth/helpers'
import { revalidatePath } from 'next/cache'
import { addTrackToSpotify, syncWebappToSpotify } from '@/lib/spotify-sync'

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

    // Sync reordered tracks to Spotify
    try {
        const { data: playlist } = await supabase
            .from('playlists')
            .select('spotify_id')
            .eq('id', playlistId)
            .single()

        if (playlist?.spotify_id) {
            await syncWebappToSpotify(playlistId, playlist.spotify_id)
        }
    } catch (err) {
        console.error('Failed to sync reorder to Spotify:', err)
        // Don't throw - the track was reordered in webapp successfully
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

    // Get the track and its current status
    const { data: track } = await supabase
        .from('tracks')
        .select('playlist_id, spotify_uri, status')
        .eq('id', trackId)
        .single()

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

    // 3. Sync if status changed to/from active
    if (track?.playlist_id && (track.status === 'active' || status === 'active')) {
        try {
            const { data: playlist } = await supabase
                .from('playlists')
                .select('spotify_id')
                .eq('id', track.playlist_id)
                .single()

            if (playlist?.spotify_id) {
                await syncWebappToSpotify(track.playlist_id, playlist.spotify_id)
            }
        } catch (err) {
            console.error('Failed to sync status change to Spotify:', err)
            // Don't throw - the status was updated in webapp successfully
        }
    }

    revalidatePath('/playlist/[slug]', 'layout')
}

export async function getTrackHistory(trackId: string) {
    const supabase = await createClient()

    // Fetch audit logs for this track
    const { data: logs, error } = await supabase
        .from('audit_log')
        .select('*')
        .eq('track_id', trackId)
        .order('created_at', { ascending: false })

    if (error) {
        console.error("Error fetching track history:", error)
        throw new Error(error.message)
    }

    // Extract unique user IDs and fetch their profiles
    let enrichedLogs = logs || []
    if (enrichedLogs.length > 0) {
        const userIds = enrichedLogs
            .map((log: any) => log.user_id)
            .filter((id: any) => id !== null && id !== undefined)
            .filter((v: any, i: any, a: any) => a.indexOf(v) === i) // deduplicate

        if (userIds.length > 0) {
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, display_name, avatar_color')
                .in('id', userIds)

            const profileMap = new Map(profiles?.map((p: any) => [p.id, p]) || [])
            enrichedLogs = enrichedLogs.map((log: any) => ({
                ...log,
                profiles: log.user_id ? profileMap.get(log.user_id) : null
            }))
        }
    }

    return enrichedLogs
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

    const { data: insertedTrack, error } = await supabase.from('tracks').insert({
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
    }).select().single()

    if (error) {
        console.error('Failed to add track:', error)
        throw new Error(error.message)
    }

    // Log to Audit with track_id
    await supabase.from('audit_log').insert({
        track_id: insertedTrack.id,
        user_id: user.id,
        action: 'add',
        details: { title: track.name, status }
    })

    // If adding to active list, sync with Spotify
    if (status === 'active') {
        try {
            const { data: playlist } = await supabase
                .from('playlists')
                .select('spotify_id')
                .eq('id', playlistId)
                .single()

            if (playlist?.spotify_id && track.uri) {
                await addTrackToSpotify(playlist.spotify_id, track.uri)
            }
        } catch (err) {
            console.error('Failed to sync track to Spotify:', err)
            // Don't throw - the track was added to webapp successfully
        }
    }

    revalidatePath('/playlist/[slug]', 'layout')
}

export async function deleteTrack(trackId: string) {
    const isAdmin = await checkIfAdmin()
    if (!isAdmin) throw new Error('Unauthorized')

    const supabase = await createClient()
    
    // Get track info before deletion
    const { data: track } = await supabase
        .from('tracks')
        .select('playlist_id, spotify_uri, status')
        .eq('id', trackId)
        .single()

    const { error } = await supabase.from('tracks').delete().eq('id', trackId)

    if (error) {
        console.error('Failed to delete track:', error)
        throw new Error(error.message)
    }

    // If track was active, sync removal with Spotify
    if (track?.status === 'active' && track?.spotify_uri && track?.playlist_id) {
        try {
            const { data: playlist } = await supabase
                .from('playlists')
                .select('spotify_id')
                .eq('id', track.playlist_id)
                .single()

            if (playlist?.spotify_id) {
                await syncWebappToSpotify(track.playlist_id, playlist.spotify_id)
            }
        } catch (err) {
            console.error('Failed to sync deletion to Spotify:', err)
            // Don't throw - the track was deleted from webapp successfully
        }
    }

    revalidatePath('/playlist/[slug]', 'layout')
}

export async function updateProfile(displayName: string, avatarColor: string) {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    if (!displayName || displayName.trim().length === 0) {
        throw new Error('Display name cannot be empty')
    }

    const { error } = await supabase
        .from('profiles')
        .update({
            display_name: displayName.trim(),
            avatar_color: avatarColor
        })
        .eq('id', user.id)

    if (error) {
        console.error('Failed to update profile:', error)
        throw new Error(error.message)
    }

    revalidatePath('/', 'layout')
}

export async function adminUpdateUserProfile(userId: string, displayName: string, avatarColor: string) {
    const isAdmin = await checkIfAdmin()
    if (!isAdmin) throw new Error('Unauthorized')

    const supabase = await createClient()

    if (!displayName || displayName.trim().length === 0) {
        throw new Error('Display name cannot be empty')
    }

    const { error } = await supabase
        .from('profiles')
        .update({
            display_name: displayName.trim(),
            avatar_color: avatarColor
        })
        .eq('id', userId)

    if (error) {
        console.error('Failed to update user profile:', error)
        throw new Error(error.message)
    }

    revalidatePath('/admin/users', 'page')
}

export async function updatePassword(currentPassword: string, newPassword: string) {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    if (!currentPassword || !newPassword) {
        throw new Error('Both passwords are required')
    }

    if (newPassword.length < 6) {
        throw new Error('Password must be at least 6 characters')
    }

    if (currentPassword === newPassword) {
        throw new Error('New password must be different from current password')
    }

    // Verify current password by attempting to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: currentPassword
    })

    if (signInError) {
        throw new Error('Current password is incorrect')
    }

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
    })

    if (updateError) {
        console.error('Failed to update password:', updateError)
        throw new Error(updateError.message)
    }

    revalidatePath('/settings', 'page')
}



