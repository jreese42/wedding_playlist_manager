'use client'

import { useState, useEffect } from 'react'
import { Database } from '@/lib/database.types'
import { Star, Trash2, Plus, RefreshCw } from 'lucide-react'
import { updateRating, updateStatus } from '@/app/playlist/actions'

type Track = Database['public']['Tables']['tracks']['Row']

interface TrackRowProps {
  track: Track
  index: number
  dragHandleProps?: any
  draggableProps?: any
  innerRef?: (element: HTMLElement | null) => void
  isDragging?: boolean
  isMainList?: boolean
  playlistSpotifyId: string | null
  onClick?: () => void
}

function formatDuration(ms: number | null) {
  if (!ms) return '--:--'
  const minutes = Math.floor(ms / 60000)
  const seconds = ((ms % 60000) / 1000).toFixed(0)
  return `${minutes}:${Number(seconds) < 10 ? '0' : ''}${seconds}`
}

function Rating({ trackId, rating: initialRating }: { trackId: string, rating: number | null }) {
    const [rating, setRating] = useState(initialRating)

    useEffect(() => {
        setRating(initialRating)
    }, [initialRating])

    return (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
                <button 
                    key={star}
                    onClick={async (e) => {
                        e.stopPropagation() // Prevent row click
                        
                        // Optimistic Update
                        const prevRating = rating
                        setRating(star)
                        
                        try {
                           await updateRating(trackId, star)
                        } catch (error) {
                           console.error('Rating failed', error)
                           setRating(prevRating) // Revert
                        }
                    }}
                    className="focus:outline-none transition-transform hover:scale-110 active:scale-95"
                >
                    <Star 
                        className={`w-4 h-4 ${
                            (rating || 0) >= star 
                                ? 'fill-yellow-400 text-yellow-400' 
                                : 'text-zinc-600 hover:text-zinc-400'
                        }`} 
                    />
                </button>
            ))}
        </div>
    )
}

export function TrackRow({ track, index, dragHandleProps, draggableProps, innerRef, isDragging, isMainList = true, playlistSpotifyId, onClick }: TrackRowProps) {
  
  const trackSpotifyId = track.spotify_uri?.split(':').pop()
  const spotifyTrackUrl = track.spotify_uri && playlistSpotifyId 
    ? `https://open.spotify.com/playlist/${playlistSpotifyId}?highlight=${encodeURIComponent(track.spotify_uri)}`
    : `https://open.spotify.com/track/${track.spotify_uri?.split(':').pop()}`

  return (
    <div 
        ref={innerRef}
        {...draggableProps}
        {...dragHandleProps}
        onClick={onClick}
        className={`group grid grid-cols-[16px_4fr_2fr_140px_minmax(60px,1fr)] gap-4 px-4 py-2 text-sm text-zinc-400 hover:bg-white/10 rounded-md items-center transition-colors cursor-pointer ${isDragging ? 'bg-white/20 shadow-lg' : ''} ${!isMainList ? 'opacity-70 hover:opacity-100' : ''}`}
        style={draggableProps?.style}
    >
      <div className="flex justify-center items-center w-4 text-right tabular-nums">
        <span className="group-hover:hidden">{isMainList ? index + 1 : '-'}</span>
        <a 
          href={spotifyTrackUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()} // Prevent drag/row click events
          className="hidden group-hover:block text-white"
          title="Play on Spotify"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M8 5v14l11-7z" />
          </svg>
        </a>
      </div>
      
      <div className="flex items-center gap-4 min-w-0">
        {track.artwork_url ? (
            <img 
                src={track.artwork_url} 
                alt={track.album || 'Album Art'} 
                className="h-10 w-10 rounded shadow object-cover flex-shrink-0"
            />
        ) : (
            <div className="h-10 w-10 bg-zinc-800 rounded flex-shrink-0" />
        )}
        <div className="flex flex-col min-w-0 overflow-hidden">
          <span className="text-white font-medium truncate">{track.title}</span>
          <span className="truncate group-hover:text-white transition-colors">
              {track.artist}
              {track.status === 'rejected' && <span className="ml-2 text-xs text-red-500 font-bold uppercase">(Rejected)</span>}
              {track.status === 'suggested' && !isMainList && <span className="ml-2 text-xs text-blue-400 font-bold uppercase">(Suggested)</span>}
          </span>
        </div>
      </div>

      <div className="flex items-center truncate min-w-0">
        <span className="truncate group-hover:text-white transition-colors">
            {track.album}
        </span>
      </div>

      <div className="flex items-center justify-center">
        <Rating trackId={track.id} rating={track.rating} />
      </div>

      <div className="flex items-center justify-end font-variant-numeric tabular-nums gap-4">
        <span>{formatDuration(track.duration_ms)}</span>
        
        {isMainList ? (
            <button 
                className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-red-500"
                title="Move to Suggestions"
                onClick={(e) => {
                    e.stopPropagation()
                    // Soft delete to suggested
                    updateStatus(track.id, 'suggested')
                }}
            >
                <Trash2 className="w-4 h-4" />
            </button>
        ) : (
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                    className="text-zinc-500 hover:text-green-400"
                    title="Add to Playlist"
                    onClick={(e) => {
                        e.stopPropagation()
                        updateStatus(track.id, 'active')
                    }}
                >
                    <Plus className="w-4 h-4" />
                </button>
                {track.status !== 'rejected' && (
                    <button 
                        className="text-zinc-500 hover:text-red-500"
                        title="Reject Song"
                        onClick={(e) => {
                            e.stopPropagation()
                            updateStatus(track.id, 'rejected')
                        }}
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
            </div>
        )}
      </div>
    </div>
  )
}
