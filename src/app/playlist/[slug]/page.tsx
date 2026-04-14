import { Database } from '@/lib/database.types'
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { PlaylistView } from '@/components/playlist/playlist-view'
import { checkIfAdmin } from '@/lib/auth/helpers'
import { isSpotifyConnected } from '@/lib/spotify'
import { pullFromSpotify } from '@/lib/spotify-sync'

type Track = Database['public']['Tables']['tracks']['Row'] & {
    profiles: Pick<Database['public']['Tables']['profiles']['Row'], 'display_name' | 'avatar_color'> | null
}

/**
 * Find a playlist row by slug (UUID or title-derived slug).
 * Returns just the playlist metadata — no tracks.
 */
async function findPlaylist(slug: string) {
    const supabase = await createClient()

    // Try to find by UUID first
    if (slug.match(/^[0-9a-f-]{36}$/)) {
        const { data } = await supabase
            .from('playlists')
            .select('*')
            .eq('id', slug)
            .single()
        if (data) return data
    }

    // Fall back to title-derived slug match
    const { data: playlists } = await supabase
        .from('playlists')
        .select('*')
        .order('display_order', { ascending: true })

    if (!playlists?.length) return null

    const slugify = (text: string) =>
        text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')

    return playlists.find(p => slugify(p.title.split(' ')[0]) === slug) || null
}

/**
 * Fetch tracks for a playlist with enriched profile data.
 */
async function getPlaylistTracks(playlistId: string): Promise<Track[]> {
    const supabase = await createClient()

    const { data: allTracks, error } = await supabase
        .from('tracks')
        .select(`*, artist_spotify_uri, album_spotify_uri, added_by`)
        .eq('playlist_id', playlistId)
        .order('position', { ascending: true })

    if (error || !allTracks?.length) {
        if (error) console.error('Error fetching tracks:', error)
        return (allTracks || []).map((t: any) => ({ ...t, profiles: null }))
    }

    // Collect unique user IDs (skip 'ai-assistant' and nulls)
    const userIds = [...new Set(
        allTracks.flatMap((t: any) => [
            t.added_by && t.added_by !== 'ai-assistant' ? t.added_by : null,
            t.suggested_by && t.suggested_by !== 'ai-assistant' ? t.suggested_by : null,
        ]).filter(Boolean)
    )]

    let profileMap = new Map()
    if (userIds.length > 0) {
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, display_name, avatar_color')
            .in('id', userIds)
        profileMap = new Map(profiles?.map((p: any) => [p.id, p]) || [])
    }

    return allTracks.map((track: any) => ({
        ...track,
        profiles: track.added_by ? profileMap.get(track.added_by) || null : null,
    }))
}

export default async function PlaylistPage({ params }: { params: Promise<{ slug: string }> }) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (!user || authError) redirect('/login')

    const { slug } = await params

    // Fetch playlist metadata and auth checks in parallel
    const [playlist, isAdmin, spotifyConnected] = await Promise.all([
        findPlaylist(slug),
        checkIfAdmin(),
        isSpotifyConnected(),
    ])

    if (!playlist) notFound()

    // Pull from Spotify BEFORE fetching tracks.
    // Awaiting here guarantees the pull completes (not killed by serverless function teardown)
    // and ensures positions are updated before the initial server render — no Realtime race.
    if (spotifyConnected && playlist.spotify_id) {
        await pullFromSpotify(playlist.id, playlist.spotify_id).catch((err: unknown) => {
            console.error(`[on-load sync] Failed for playlist ${playlist.id}:`, err)
        })
    }

    // Fetch tracks after pull so rendered positions are always current
    const tracks = await getPlaylistTracks(playlist.id)

    return (
        <PlaylistView playlist={playlist} tracks={tracks} isAdmin={isAdmin} />
    )
}
