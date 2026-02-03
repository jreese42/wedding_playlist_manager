'use client'

import { useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { TrackRow } from './track-row'
import { Database } from '@/lib/database.types'
import { moveTrack } from '@/app/playlist/actions'

type Track = Database['public']['Tables']['tracks']['Row'] & {
    profiles: Pick<Database['public']['Tables']['profiles']['Row'], 'display_name' | 'avatar_color'> | null
}

interface TrackListProps {
    tracks: Track[]
    playlistId: string
    playlistSpotifyId: string | null
    onSelectTrack: (trackId: string) => void
}

export function TrackList({ tracks, playlistId, playlistSpotifyId, onSelectTrack }: TrackListProps) {
    const [isClient, setIsClient] = useState(false)
    const [localTracks, setLocalTracks] = useState(tracks)

    useEffect(() => {
        setIsClient(true)
    }, [])

    useEffect(() => {
        setLocalTracks(tracks)
    }, [tracks])

    async function onDragEnd(result: DropResult) {
        if (!result.destination) return

        const sourceIndex = result.source.index
        const destinationIndex = result.destination.index

        if (sourceIndex === destinationIndex) return

        const movedTrack = localTracks[sourceIndex]
        const targetTrack = localTracks[destinationIndex]
        
        if (!movedTrack || !targetTrack) return

        // 1. Optimistic Update: Reorder the list locally immediately
        const newTracks = Array.from(localTracks)
        const [removed] = newTracks.splice(sourceIndex, 1)
        newTracks.splice(destinationIndex, 0, removed)
        setLocalTracks(newTracks)

        // 2. Server Update: Use DB positions to handle gaps correctly
        const trackId = movedTrack.id
        // Use actual DB positions. Fallback to index logic only if null.
        const oldPosition = movedTrack.position ?? (sourceIndex + 1)
        const newPosition = targetTrack.position ?? (destinationIndex + 1)
        
        try {
            await moveTrack(playlistId, trackId, newPosition, oldPosition)
        } catch (e) {
            console.error('Failed to reorder track:', e)
            // Revert optimistic update on error
            setLocalTracks(tracks)
            alert('An error occurred while reordering the track.')
        }
    }

    // Render a static list for SSR and initial client render to prevent hydration errors.
    if (!isClient) {
        return (
            <div className="space-y-1">
                {tracks.map((track, i) => (
                    <TrackRow 
                        key={track.id} 
                        track={track} 
                        index={i} 
                        playlistSpotifyId={playlistSpotifyId}
                        onClick={() => onSelectTrack(track.id)}
                    />
                ))}
            </div>
        )
    }

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="playlist-tracks">
                {(provided) => (
                    <div 
                        {...provided.droppableProps} 
                        ref={provided.innerRef}
                        className="space-y-1"
                    >
                        {localTracks.map((track, index) => (
                            <Draggable key={track.id} draggableId={track.id} index={index}>
                                {(provided, snapshot) => (
                                    <TrackRow
                                        track={track}
                                        index={index}
                                        playlistSpotifyId={playlistSpotifyId}
                                        onClick={() => onSelectTrack(track.id)}
                                        innerRef={provided.innerRef}
                                        draggableProps={provided.draggableProps}
                                        dragHandleProps={provided.dragHandleProps}
                                        isDragging={snapshot.isDragging}
                                    />
                                )}
                            </Draggable>
                        ))}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </DragDropContext>
    )
}
