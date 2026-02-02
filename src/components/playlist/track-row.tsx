'use client'

import { useState, useEffect } from 'react'
import { Database } from '@/lib/database.types'
import { Star, Trash2, Plus, RefreshCw, Pin, Trash } from 'lucide-react'
import { updateRating, updateStatus, deleteTrack } from '@/app/playlist/actions'

type Track = Database['public']['Tables']['tracks']['Row'] & {
    profiles: Pick<Database['public']['Tables']['profiles']['Row'], 'display_name' | 'avatar_color'> | null
}

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
  isAdmin?: boolean
  onStatusChange?: (trackId: string, newStatus: 'active' | 'suggested' | 'rejected') => void
  onTrackDeleted?: (trackId: string) => void
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
                                : 'text-zinc-500 hover:text-zinc-400'
                        }`} 
                    />
                </button>
            ))}
        </div>
    )
}

export function TrackRow({ track, index, dragHandleProps, draggableProps, innerRef, isDragging, isMainList = true, playlistSpotifyId, onClick, isAdmin, onStatusChange, onTrackDeleted }: TrackRowProps) {
  
  const trackSpotifyId = track.spotify_uri?.split(':').pop()
  const spotifyTrackUrl = track.spotify_uri && playlistSpotifyId && isMainList
    ? `https://open.spotify.com/playlist/${playlistSpotifyId}?highlight=${encodeURIComponent(track.spotify_uri)}`
    : `https://open.spotify.com/track/${track.spotify_uri?.split(':').pop()}`

  const artistSpotifyUrl = track.artist_spotify_uri ? `https://open.spotify.com/artist/${track.artist_spotify_uri.split(':').pop()}` : '#'
  const albumSpotifyUrl = track.album_spotify_uri ? `https://open.spotify.com/album/${track.album_spotify_uri.split(':').pop()}` : '#'

  return (
    <>
      {/* Desktop View */}
      <div 
          ref={innerRef}
          {...draggableProps}
          {...dragHandleProps}
          onClick={onClick}
          className={`group hidden md:grid grid-cols-[16px_4fr_2fr_140px_minmax(60px,1fr)] gap-4 px-4 py-2 text-sm text-zinc-300 hover:bg-white/10 rounded-md items-center transition-colors cursor-pointer ${isDragging ? 'bg-white/20 shadow-lg' : ''} ${!isMainList ? 'opacity-70 hover:opacity-100' : ''}`}
          style={draggableProps?.style}
          data-tour={isMainList ? "track-row" : undefined}
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
            <a 
              href={spotifyTrackUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-white font-medium truncate hover:underline"
            >
              {track.title}
            </a>
            <span className="truncate group-hover:text-white transition-colors">
                <a 
                  href={artistSpotifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="hover:underline"
                >
                  {track.artist}
                </a>
                {track.status === 'rejected' && <span className="ml-2 text-xs text-red-500 font-bold uppercase">(Rejected)</span>}
                {track.status === 'suggested' && !isMainList && (
                  track.suggested_by === 'ai-assistant' 
                    ? <span className="ml-2 text-xs font-bold uppercase bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">(✨ AI Suggestion)</span>
                    : <span className="ml-2 text-xs text-blue-400 font-bold uppercase">(Suggested)</span>
                )}
            </span>
            {track.pinned_comment && (
              <div className="flex items-center gap-1.5 mt-1 text-xs text-indigo-300">
                  <Pin className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate italic">
                      {track.pinned_comment}
                  </span>
              </div>
            )}
            {(track.profiles || track.suggested_by === 'ai-assistant') && (
              <div className="flex items-center gap-1.5 mt-1 text-xs text-zinc-400">
                  {track.suggested_by === 'ai-assistant' ? (
                      <AIAssistantAvatar />
                  ) : track.profiles ? (
                      <UserAvatar profile={track.profiles} />
                  ) : null}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center truncate min-w-0">
          <a 
            href={albumSpotifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="truncate group-hover:text-white transition-colors hover:underline"
          >
              {track.album}
          </a>
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
                      onStatusChange?.(track.id, 'suggested')
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
                          onStatusChange?.(track.id, 'active')
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
                              onStatusChange?.(track.id, 'rejected')
                          }}
                      >
                          <Trash2 className="w-4 h-4" />
                      </button>
                  )}
                  {isAdmin && (
                      <button 
                          className="text-zinc-500 hover:text-red-700"
                          title="Permanently Delete"
                          onClick={(e) => {
                              e.stopPropagation()
                              if (window.confirm('Are you sure you want to permanently delete this track?')) {
                                  deleteTrack(track.id)
                                  onTrackDeleted?.(track.id)
                              }
                          }}
                      >
                          <Trash className="w-4 h-4" />
                      </button>
                  )}
              </div>
          )}
        </div>
      </div>

      {/* Mobile View */}
      <div 
        ref={innerRef}
        {...draggableProps}
        {...dragHandleProps}
        onClick={onClick}
        className={`md:hidden group flex flex-row gap-2 px-2 py-2 text-sm text-zinc-300 hover:bg-white/10 rounded-md transition-colors cursor-pointer ${isDragging ? 'bg-white/20 shadow-lg' : ''} ${!isMainList ? 'opacity-70 hover:opacity-100' : ''}`}
        style={draggableProps?.style}
      >
        {/* Album Artwork - spans height */}
        <div className="flex-shrink-0">
          {track.artwork_url ? (
            <img 
              src={track.artwork_url}
              alt={track.album || 'Album Art'} 
              className="h-14 w-14 rounded shadow object-cover"
            />
          ) : (
            <div className="h-14 w-14 bg-zinc-800 rounded" />
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          {/* Title, Artist, Album, Duration */}
          <div className="min-w-0">
            <a 
              href={spotifyTrackUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-white font-medium text-sm line-clamp-2 hover:underline"
            >
              {track.title}
            </a>
            <a 
              href={artistSpotifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-zinc-400 text-xs truncate hover:text-white hover:underline block mt-0.5"
            >
              {track.artist}
            </a>
            {/* Album and Duration under artist */}
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 truncate mt-0.5">
              {track.album && (
                <a 
                  href={albumSpotifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="truncate hover:text-white hover:underline"
                >
                  {track.album}
                </a>
              )}
              {track.album && track.duration_ms && <span>•</span>}
              {track.duration_ms && (
                <span className="flex-shrink-0">{formatDuration(track.duration_ms)}</span>
              )}
            </div>
          </div>

          {/* Added/Suggested By Info with Pinned Comment */}
          {(track.profiles || track.suggested_by === 'ai-assistant' || track.pinned_comment) && (
            <div className="pt-1 flex items-center gap-2 flex-wrap">
              {track.suggested_by === 'ai-assistant' ? (
                <AIAssistantAvatar />
              ) : track.profiles ? (
                <UserAvatar profile={track.profiles} />
              ) : null}
              {track.pinned_comment && (track.profiles || track.suggested_by === 'ai-assistant') && (
                <span className="text-zinc-500">•</span>
              )}
              {track.pinned_comment && (
                <div className="flex items-center gap-1 text-indigo-300 text-xs">
                  <Pin className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate italic">{track.pinned_comment}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column - Rating and Actions */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {/* Rating */}
          <div>
            <Rating trackId={track.id} rating={track.rating} />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            {isMainList ? (
              <button 
                className="text-zinc-500 hover:text-red-500 p-1"
                title="Move to Suggestions"
                onClick={(e) => {
                  e.stopPropagation()
                  updateStatus(track.id, 'suggested')
                  onStatusChange?.(track.id, 'suggested')
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            ) : (
              <>
                <button 
                  className="text-zinc-500 hover:text-green-400 p-1"
                  title="Add to Playlist"
                  onClick={(e) => {
                    e.stopPropagation()
                    updateStatus(track.id, 'active')
                    onStatusChange?.(track.id, 'active')
                  }}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                {track.status !== 'rejected' && (
                  <button 
                    className="text-zinc-500 hover:text-red-500 p-1"
                    title="Reject Song"
                    onClick={(e) => {
                      e.stopPropagation()
                      updateStatus(track.id, 'rejected')
                      onStatusChange?.(track.id, 'rejected')
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                {isAdmin && (
                  <button 
                    className="text-zinc-500 hover:text-red-700 p-1"
                    title="Permanently Delete"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (window.confirm('Are you sure you want to permanently delete this track?')) {
                        deleteTrack(track.id)
                        onTrackDeleted?.(track.id)
                      }
                    }}
                  >
                    <Trash className="w-3.5 h-3.5" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Status Badge - full width below */}
      {(track.status === 'rejected' || (track.status === 'suggested' && !isMainList)) && (
        <div className="md:hidden flex items-center gap-2 text-xs px-4 py-1 text-zinc-300">
          {track.status === 'rejected' && (
            <span className="text-red-500 font-bold uppercase">(Rejected)</span>
          )}
          {track.status === 'suggested' && !isMainList && (
            <span className={track.suggested_by === 'ai-assistant' 
              ? 'font-bold uppercase bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent'
              : 'text-blue-400 font-bold uppercase'}>
              {track.suggested_by === 'ai-assistant' ? '(✨ AI Suggestion)' : '(Suggested)'}
            </span>
          )}
        </div>
      )}
    </>
  )
}

function UserAvatar({ profile }: { profile: { display_name: string | null, avatar_color: string | null } | null }) {
    if (!profile || !profile.display_name) {
        return null
    }

    return (
        <div className="flex items-center gap-1.5" title={`Added by ${profile.display_name}`}>
            <div 
                className="w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ backgroundColor: profile.avatar_color || '#6366f1' }}
            >
                {profile.display_name.charAt(0).toUpperCase()}
            </div>
            <span className="text-zinc-400">{profile.display_name}</span>
        </div>
    )
}

function AIAssistantAvatar() {
    return (
        <div className="flex items-center gap-1.5" title="Suggested by AI Assistant">
            <div className="w-4 h-4 rounded-full flex items-center justify-center text-xs bg-gradient-to-r from-purple-500 to-pink-500">
                ✨
            </div>
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent font-medium">AI Assistant</span>
        </div>
    )
}