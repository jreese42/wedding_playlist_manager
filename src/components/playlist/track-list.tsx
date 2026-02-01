'use client'

import { useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { TrackRow } from './track-row'
import { Database } from '@/lib/database.types'
import { moveTrack } from '@/app/playlist/actions'

type Track = Database['public']['Tables']['tracks']['Row']

interface TrackListProps {
    initialTracks: Track[]
    playlistId: string
    playlistSpotifyId: string | null
    onSelectTrack: (trackId: string) => void
}

export function TrackList({ initialTracks, playlistId, playlistSpotifyId, onSelectTrack }: TrackListProps) {
    // We need to ensure we only render DnD on the client to avoid hydration mismatch
    const [enabled, setEnabled] = useState(false)
    const [tracks, setTracks] = useState(initialTracks)

    useEffect(() => {
        const animation = requestAnimationFrame(() => setEnabled(true))
        return () => {
            cancelAnimationFrame(animation)
            setEnabled(false)
        }
    }, [])
    
    useEffect(() => {
        setTracks(initialTracks)
    }, [initialTracks])

    async function onDragEnd(result: DropResult) {
        if (!result.destination) return

        const sourceIndex = result.source.index
        const destinationIndex = result.destination.index

        if (sourceIndex === destinationIndex) return

        // Optimistic Update
        const newTracks = Array.from(tracks)
        const [movedTrack] = newTracks.splice(sourceIndex, 1)
        newTracks.splice(destinationIndex, 0, movedTrack)
        
        setTracks(newTracks)

        const trackId = movedTrack.id
        const oldPosition = sourceIndex + 1 // Assuming 1-based
        const newPosition = destinationIndex + 1
        
        try {
            await moveTrack(playlistId, trackId, newPosition, oldPosition)
        } catch (e) {
            console.error('Failed to move track', e)
            // Revert on error
            setTracks(tracks) 
            alert('Failed to save order. Check console.')
        }
    }

    if (!enabled) {
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
                        {tracks.map((track, index) => (
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
