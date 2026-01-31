import { Database } from '@/lib/database.types'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Clock } from 'lucide-react'
import { TrackList } from '@/components/playlist/track-list'

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
    const { data: tracks } = await supabase
        .from('tracks')
        .select('*')
        .eq('playlist_id', playlist.id)
        .order('position', { ascending: true }) // Order by our custom position
    
    return { playlist, tracks: tracks || [] }
}

export default async function PlaylistPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    const data = await getPlaylist(slug)
    
    if (!data) {
        notFound()
    }

    const { playlist, tracks } = data
    
    // Calculate total duration roughly
    const totalDurationMs = tracks.reduce((acc, t) => acc + (t.duration_ms || 0), 0)
    const hours = Math.floor(totalDurationMs / 3600000)
    const minutes = Math.floor((totalDurationMs % 3600000) / 60000)

    return (
        <div className="bg-gradient-to-b from-indigo-900/50 to-zinc-950 min-h-full pb-8">
            {/* Header */}
            <div className="flex items-end gap-6 p-8 pb-6">
                <div className="h-52 w-52 shadow-2xl bg-gradient-to-br from-indigo-500 to-purple-700 flex items-center justify-center text-6xl font-bold text-white/20 select-none">
                    {playlist.title.charAt(0)}
                </div>
                <div className="flex flex-col gap-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-white">Playlist</span>
                    <h1 className="text-7xl font-black text-white tracking-tight">{playlist.title}</h1>
                    <div className="flex items-center gap-2 text-sm text-zinc-300 font-medium">
                        <span className="text-white">{playlist.vibe}</span>
                        <span>•</span>
                        <span>{tracks.length} songs, {hours} hr {minutes} min</span>
                    </div>
                     <p className="text-zinc-400 max-w-2xl mt-1 text-sm">{playlist.description}</p>
                </div>
            </div>

            {/* Content */}
            <div className="relative min-h-[500px]">
                {/* Glass Background Layer */}
                <div className="absolute inset-0 bg-black/20 backdrop-blur-sm z-0 pointer-events-none" />

                {/* Content Layer */}
                <div className="relative z-10 p-8">
                    {/* Table Header */}
                    <div className="grid grid-cols-[16px_4fr_2fr_140px_minmax(60px,1fr)] gap-4 px-4 py-2 border-b border-white/10 text-xs font-medium text-zinc-400 uppercase tracking-wider mb-4 sticky top-0 bg-[#121212] z-10">
                        <div className="text-right">#</div>
                        <div>Title</div>
                        <div>Album</div>
                        <div className="text-center">Rating</div>
                        <div className="flex justify-end"><Clock className="w-4 h-4" /></div>
                    </div>

                    {/* List */}
                    <TrackList initialTracks={tracks} playlistId={playlist.id} />

                    {tracks.length === 0 && (
                         <div className="text-center py-20 text-zinc-500">
                            No songs yet. Ask the admin to sync from Spotify!
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
