import { Database } from '@/lib/database.types'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PlaylistView } from '@/components/playlist/playlist-view'
import { checkIfAdmin } from '@/lib/auth/helpers'

type Playlist = Database['public']['Tables']['playlists']['Row']
type Track = Database['public']['Tables']['tracks']['Row'] & {
    profiles: Pick<Database['public']['Tables']['profiles']['Row'], 'display_name' | 'avatar_color'> | null
}

async function getPlaylist(slug: string) {
    const supabase = await createClient()

    let playlist = null

    // First, try to find by ID (for dynamic playlists)
    if (slug.match(/^[0-9a-f-]{36}$/)) {
        const { data } = await supabase
            .from('playlists')
            .select('*')
            .eq('id', slug)
            .single()
        playlist = data
    }

    // If not found by ID, try to find by matching the slug to playlist titles
    // This handles both legacy hardcoded playlists and new dynamic playlists
    if (!playlist) {
        // Get all playlists and find one that matches the slug
        const { data: playlists } = await supabase
            .from('playlists')
            .select('*')
            .order('display_order', { ascending: true })
        
        if (playlists && playlists.length > 0) {
            // Helper function to slugify titles the same way the homepage does
            const slugify = (text: string) => {
                return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
            }
            
            // Try to find a playlist whose slug matches
            playlist = playlists.find(p => slugify(p.title.split(' ')[0]) === slug) || null
        }
    }
    
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
    let enrichedTracks: Track[] = []
    if (allTracks && allTracks.length > 0) {
        const userIds = allTracks
            .map((t: any) => t.added_by)
            .filter((id: any) => id !== null && id !== undefined)
            .filter((v: any, i: any, a: any) => a.indexOf(v) === i) // deduplicate
        
        if (userIds.length > 0) {
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, display_name, avatar_color')
                .in('id', userIds)
            
            const profileMap = new Map(profiles?.map((p: any) => [p.id, p]) || [])
            enrichedTracks = allTracks.map((track: any) => ({
                ...track,
                profiles: track.added_by ? profileMap.get(track.added_by) : null
            }))
        } else {
            // No user IDs to fetch, but still need to add null profiles
            enrichedTracks = allTracks.map((track: any) => ({
                ...track,
                profiles: null
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
