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

    // 2. Get tracks
    const { data: allTracks } = await supabase
        .from('tracks')
        .select(`
            id, 
            playlist_id, 
            title, 
            artist, 
            album, 
            artwork_url, 
            spotify_uri, 
            duration_ms, 
            status, 
            rating, 
            position, 
            pinned_comment, 
            added_by, 
            created_at,
            artist_spotify_uri,
            album_spotify_uri
        `)
        .eq('playlist_id', playlist.id)
        .order('position', { ascending: true }) // Order by our custom position
    
    return { playlist, tracks: allTracks || [] }
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
