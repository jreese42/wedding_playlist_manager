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
            .subscribe()

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
