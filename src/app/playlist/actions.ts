'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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

