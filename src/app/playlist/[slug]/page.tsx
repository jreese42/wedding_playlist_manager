import { Database } from '@/lib/database.types'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PlaylistView } from '@/components/playlist/playlist-view'
import { checkIfAdmin } from '@/lib/auth/helpers'

type Playlist = Database['public']['Tables']['playlists']['Row']

async function getPlaylist(slug: string) {
    const supabase = await createClient()

    // 1. Find playlist by partial title match (simple way to map "morning" -> "Morning Background Music")
    // In a real app we might store the slug in the DB, but this works for now given our 6 specific playlists.
    let searchTerm = ''
    switch(slug) {
        case 'morning': searchTerm = 'Morning'; break;
        case 'ceremony': searchTerm = 'Ceremony'; break;
        case 'brunch': searchTerm = 'Brunch'; break;
        case 'boat': searchTerm = 'Boat'; break;
        case 'reception': searchTerm = 'Reception'; break;
        case 'moments': searchTerm = 'Specific'; break;
        default: return null
    }

    const { data: playlist } = await supabase
        .from('playlists')
        .select('*')
        .ilike('title', `%${searchTerm}%`)
        .single()
    
    if (!playlist) return null

    // 2. Get tracks with user profile data
    const { data: allTracks, error: tracksError } = await supabase
        .from('tracks')
        .select(`
            *,
            artist_spotify_uri,
            album_spotify_uri,
            added_by
        `)
        .eq('playlist_id', playlist.id)
        .order('position', { ascending: true }) // Order by our custom position
    
    if (tracksError) {
        console.error('Error fetching tracks:', tracksError)
        return { playlist, tracks: [] }
    }

    // 3. Fetch profile data for all tracks
    let enrichedTracks = allTracks || []
    if (enrichedTracks.length > 0) {
        const userIds = enrichedTracks
            .map((t: any) => t.added_by)
            .filter((id: any) => id !== null && id !== undefined)
            .filter((v: any, i: any, a: any) => a.indexOf(v) === i) // deduplicate
        
        if (userIds.length > 0) {
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, display_name, avatar_color')
                .in('id', userIds)
            
            const profileMap = new Map(profiles?.map((p: any) => [p.id, p]) || [])
            enrichedTracks = enrichedTracks.map((track: any) => ({
                ...track,
                profiles: track.added_by ? profileMap.get(track.added_by) : null
            }))
        }
    }
    
    return { playlist, tracks: enrichedTracks }
}

export default async function PlaylistPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    const data = await getPlaylist(slug)
    const isAdmin = await checkIfAdmin()
    
    if (!data) {
        notFound()
    }

    const { playlist, tracks } = data
    
    return (
        <PlaylistView playlist={playlist} tracks={tracks} isAdmin={isAdmin} />
    )
}
