'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/lib/database.types'

type Track = Database['public']['Tables']['tracks']['Row'] & {
    profiles: Pick<Database['public']['Tables']['profiles']['Row'], 'display_name' | 'avatar_color'> | null
}

export function usePlaylistSubscription(playlistId: string, initialTracks: Track[]) {
    const [tracks, setTracks] = useState(initialTracks)

    useEffect(() => {
        setTracks(initialTracks)
    }, [initialTracks])

    useEffect(() => {
        const supabase = createClient()

        // Re-fetch tracks from DB to catch any inserts that happened
        // between server render and subscription establishment (e.g. background sync)
        const refreshTracks = async () => {
            // Note: can't use profiles:added_by() join because added_by references
            // auth.users, not profiles. Fetch tracks without profiles and preserve
            // existing profile data from the initial server render.
            const { data, error } = await supabase
                .from('tracks')
                .select('*')
                .eq('playlist_id', playlistId)
                .order('position', { ascending: true, nullsFirst: false })
            if (error || !data) return
            // Merge with existing profile data from initial tracks
            setTracks(currentTracks => {
                const profileMap = new Map(currentTracks.map(t => [t.id, t.profiles]))
                return (data as Track[]).map(t => ({
                    ...t,
                    profiles: profileMap.get(t.id) || null
                }))
            })
        }
        
        const channel = supabase
            .channel(`tracks-${playlistId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'tracks',
                    filter: `playlist_id=eq.${playlistId}`
                },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        const newTrack = payload.new as Track
                        setTracks(currentTracks => {
                            if (currentTracks.some(t => t.id === newTrack.id)) {
                                return currentTracks
                            }
                            return [...currentTracks, newTrack].sort((a, b) => (a.position || Infinity) - (b.position || Infinity))
                        })
                    }
                    else if (payload.eventType === 'UPDATE') {
                        const updatedTrack = payload.new as Track
                        setTracks(currentTracks => 
                            currentTracks
                                .map(t => {
                                    if (t.id === updatedTrack.id) {
                                        // Preserve the profiles data from the initial load, merge with updates
                                        return { ...t, ...updatedTrack, profiles: t.profiles }
                                    }
                                    return t
                                })
                                .sort((a, b) => (a.position || Infinity) - (b.position || Infinity))
                        )
                    }
                    else if (payload.eventType === 'DELETE') {
                        const deletedTrack = payload.old as Track
                        setTracks(currentTracks => currentTracks.filter(t => t.id !== deletedTrack.id))
                    }
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    refreshTracks()
                }
            })

        return () => {
            supabase.removeChannel(channel)
        }
    }, [playlistId])

    const addTrack = (track: Track) => {
        setTracks(currentTracks => {
            if (currentTracks.some(t => t.id === track.id)) {
                return currentTracks
            }
            return [...currentTracks, track].sort((a, b) => (a.position || Infinity) - (b.position || Infinity))
        })
    }

    return { tracks, addTrack }
}
