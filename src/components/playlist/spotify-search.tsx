'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import { Search, Plus, Loader2 } from 'lucide-react'
import { searchSpotify, addTrack } from '@/app/playlist/actions'

interface SpotifySearchProps {
    playlistId: string
    status: 'active' | 'suggested'
    placeholder?: string
    className?: string
    onTrackAdded?: (track: any) => void
}

export function SpotifySearch({ playlistId, status, placeholder, className, onTrackAdded }: SpotifySearchProps) {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<any[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [isAdding, startTransition] = useTransition()
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    // Handle clicks outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    // Handle Escape key
    useEffect(() => {
        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setIsOpen(false)
            }
        }
        document.addEventListener("keydown", handleKeyDown)
        return () => document.removeEventListener("keydown", handleKeyDown)
    }, [])

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.trim().length > 2) {
                setIsSearching(true)
                setIsOpen(true) // Open when searching
                try {
                    const tracks = await searchSpotify(query)
                    setResults(tracks)
                } catch (e) {
                    // Search failed silently
                } finally {
                    setIsSearching(false)
                }
            } else {
                setResults([])
                setIsOpen(false)
            }
        }, 500)

        return () => clearTimeout(timer)
    }, [query])

    const handleSelect = (track: any) => {
        startTransition(async () => {
            try {
                const addedTrack = await addTrack(playlistId, track, status)
                setQuery('')
                setResults([])
                setIsOpen(false)
                // Notify parent of the new track with the database record (if callback provided)
                // Note: This is optional now - realtime subscription handles UI updates
                if (onTrackAdded && addedTrack) {
                    onTrackAdded(addedTrack)
                }
            } catch (e) {
                alert('Failed to add track')
            }
        })
    }

    return (
        <div ref={containerRef} className={className || "relative mb-4 md:mb-6 w-full md:max-w-xl mx-auto"}>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => {
                        if (results.length > 0) setIsOpen(true)
                    }}
                    placeholder={placeholder || "Search Spotify for a song..."}
                    className="w-full bg-black/20 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    disabled={isAdding}
                />
                {(isSearching || isAdding) && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="h-4 w-4 text-indigo-500 animate-spin" />
                    </div>
                )}
            </div>

            {isOpen && results.length > 0 && (
                <div className="absolute z-50 w-full mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto">
                    {results.map((track) => (
                        <button
                            key={track.id}
                            onClick={() => handleSelect(track)}
                            className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors text-left group"
                            disabled={isAdding}
                        >
                            <img 
                                src={track.album.images[2]?.url || track.album.images[0]?.url} 
                                alt={track.album.name}
                                className="h-10 w-10 rounded object-cover flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-white truncate group-hover:text-indigo-400 transition-colors">
                                    {track.name}
                                </div>
                                <div className="text-xs text-zinc-400 truncate">
                                    {track.artists.map((a: any) => a.name).join(', ')}
                                </div>
                            </div>
                            <div className="p-2 text-zinc-500 group-hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all">
                                <Plus className="h-4 w-4" />
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
