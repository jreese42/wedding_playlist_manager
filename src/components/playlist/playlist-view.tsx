'use client'

import { useState } from 'react'
import { Database } from '@/lib/database.types'
import { Clock, Music, Play } from 'lucide-react'
import { TrackList } from '@/components/playlist/track-list'
import { TrackRow } from '@/components/playlist/track-row'
import { HistoryPanel } from '@/components/playlist/history-panel'
import { SpotifySearch } from '@/components/playlist/spotify-search'
import { SyncStatus } from '@/components/playlist/sync-status'
import { SuggestionsFilter } from '@/components/playlist/suggestions-filter'

type Playlist = Database['public']['Tables']['playlists']['Row']
type Track = Database['public']['Tables']['tracks']['Row'] & {
    profiles: Pick<Database['public']['Tables']['profiles']['Row'], 'display_name' | 'avatar_color'> | null
}

interface PlaylistViewProps {
    playlist: Playlist
    tracks: Track[]
    isAdmin: boolean
}

export function PlaylistView({ playlist, tracks, isAdmin }: PlaylistViewProps) {
    const [selectedTrack, setSelectedTrack] = useState<Track | null>(null)
    const [filterText, setFilterText] = useState('')
    const [showRemoved, setShowRemoved] = useState(false)
    
    const activeTracks = tracks.filter(t => t.status === 'active')
    const inactiveTracks = tracks.filter(t => t.status !== 'active')
    
    // Filter logic for suggestions
    const suggestedTracks = inactiveTracks.filter(t => 
        t.status === 'suggested' || (showRemoved && t.status === 'rejected')
    )
    
    const filteredSuggestions = suggestedTracks.filter(t => {
        if (!filterText) return true
        const searchLower = filterText.toLowerCase()
        return (
            t.title.toLowerCase().includes(searchLower) ||
            t.artist.toLowerCase().includes(searchLower)
        )
    })
    
    const removedCount = inactiveTracks.filter(t => t.status === 'rejected').length
    
    const totalDurationMs = activeTracks.reduce((acc, t) => acc + (t.duration_ms || 0), 0)
    const hours = Math.floor(totalDurationMs / 3600000)
    const minutes = Math.floor((totalDurationMs % 3600000) / 60000)

    return (
        <div className="bg-gradient-to-b from-indigo-950/80 to-zinc-950 min-h-full pb-8">
            <HistoryPanel 
                track={selectedTrack} 
                onClose={() => setSelectedTrack(null)} 
            />

            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-end gap-4 md:gap-6 p-4 md:p-8 md:pb-6 pt-16 md:pt-0" data-tour="playlist-header">
                <div className="h-40 md:h-52 w-40 md:w-52 shadow-2xl bg-gradient-to-br from-indigo-500 to-purple-700 flex items-center justify-center text-4xl md:text-6xl font-bold text-white/20 select-none flex-shrink-0">
                    {playlist.title.charAt(0)}
                </div>
                <div className="flex flex-col gap-3 flex-1 w-full md:w-auto">
                    <span className="text-xs font-bold uppercase tracking-wider text-white">Playlist</span>
                    <h1 className="text-3xl md:text-7xl font-black text-white tracking-tight break-words">{playlist.title}</h1>
                    <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm text-zinc-300 font-medium">
                            <span className="text-white">{playlist.vibe}</span>
                            <span>•</span>
                            <span>{tracks.length} songs, {hours} hr {minutes} min</span>
                        </div>
                        {playlist.spotify_id && (
                            <a
                                href={`https://open.spotify.com/playlist/${playlist.spotify_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/30 rounded transition-colors w-fit"
                                title="View on Spotify"
                            >
                                <span>•</span>
                                <img src="/icons8-spotify.svg" alt="Spotify" className="w-3.5 h-3.5" />
                                <span>View in Spotify</span>
                            </a>
                        )}
                    </div>
                    <p className="text-zinc-400 max-w-2xl mt-1 text-xs md:text-sm">{playlist.description}</p>
                    <div className="mt-2">
                        <SyncStatus playlist={playlist} isAdmin={isAdmin} />
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="relative min-h-[500px]">
                {/* Glass Background Layer */}
                <div className="absolute inset-0 bg-black/20 backdrop-blur-sm z-0 pointer-events-none" />

                {/* Content Layer */}
                <div className="relative z-10 p-4 md:p-8">
                    {/* Table Header */}
                    <div className="hidden md:grid grid-cols-[16px_4fr_2fr_140px_minmax(60px,1fr)] gap-4 px-4 py-2 border-b border-white/10 text-xs font-medium text-zinc-300 uppercase tracking-wider mb-4 sticky top-16 bg-black/30 backdrop-blur-sm z-20">
                        <div className="text-right">#</div>
                        <div>Title</div>
                        <div>Album</div>
                        <div className="text-center">Rating</div>
                        <div className="flex justify-end"><Clock className="w-4 h-4" /></div>
                    </div>

                    {/* Active List */}
                    <TrackList 
                        initialTracks={activeTracks} 
                        playlistId={playlist.id} 
                        playlistSpotifyId={playlist.spotify_id} 
                        onSelectTrack={(trackId) => setSelectedTrack(tracks.find(t => t.id === trackId) || null)}
                    />

                    <div className="mt-4" data-tour="add-songs-bar">
                        <SpotifySearch 
                            playlistId={playlist.id} 
                            status="active" 
                            placeholder="Add a song to this playlist..."
                        />
                    </div>

                    {activeTracks.length === 0 && (
                         <div className="text-center py-20 text-zinc-500">
                            No active songs. Check suggestions below!
                        </div>
                    )}

                    {/* Suggestions & Rejected Section */}
                    <div className="mt-12" data-tour="suggested-section">
                        <h2 className="text-xl font-bold text-white mb-4 px-4">Suggestions & Removed</h2>
                        
                        {inactiveTracks.length > 0 ? (
                            <>
                                <SuggestionsFilter
                                    filterText={filterText}
                                    showRemoved={showRemoved}
                                    onFilterTextChange={setFilterText}
                                    onShowRemovedChange={setShowRemoved}
                                    totalSuggestions={inactiveTracks.filter(t => t.status === 'suggested').length}
                                    totalRemoved={removedCount}
                                />
                                
                                {filteredSuggestions.length > 0 ? (
                                    <div className="space-y-1 opacity-60 hover:opacity-100 transition-opacity">
                                        {filteredSuggestions.map((track, i) => (
                                            <TrackRow 
                                                key={track.id} 
                                                track={track} 
                                                index={i} 
                                                isMainList={false}
                                                playlistSpotifyId={playlist.spotify_id}
                                                onClick={() => setSelectedTrack(track)}
                                                isAdmin={isAdmin}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-6 text-zinc-500 px-4">
                                        {filterText ? 'No suggestions match your search.' : 'No suggestions yet.'}
                                    </div>
                                )}

                                <div className="px-4 mt-4">
                                    <SpotifySearch 
                                        playlistId={playlist.id} 
                                        status="suggested" 
                                        placeholder="Suggest a song..."
                                    />
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-12 text-zinc-500 px-4">
                                Nothing here!
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
