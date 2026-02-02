'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Send, Loader } from 'lucide-react'
import { getSongSuggestionsFromAI } from '@/app/ai/actions'
import { searchSpotifyForSongs, addAISuggestedTracks } from '@/app/ai/spotify-actions'
import { Database } from '@/lib/database.types'

type Playlist = Database['public']['Tables']['playlists']['Row']
type Track = Database['public']['Tables']['tracks']['Row']

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  suggestedSongs?: Array<{
    title: string
    artist: string
    reason?: string
    selected?: boolean
    spotifyUri?: string
    artworkUrl?: string
    album?: string
    durationMs?: number
    albumSpotifyUri?: string
    artistSpotifyUri?: string
  }>
}

interface AIAssistantModalProps {
  isOpen: boolean
  onClose: () => void
  playlist: Playlist
  existingTracks: Track[]
  onSongsAdded?: (songs: Track[]) => void
}

export function AIAssistantModal({
  isOpen,
  onClose,
  playlist,
  existingTracks,
  onSongsAdded,
}: AIAssistantModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hello! I'm your AI music assistant. I'll help you find amazing songs for "${playlist.title}". What kind of songs would you like to add to this playlist?`,
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [thinkingPhrase, setThinkingPhrase] = useState('Thinking...')
  const [selectedSongs, setSelectedSongs] = useState<Set<string>>(new Set())
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const latestAIResponseRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const thinkingPhrases = ['Thinking...', 'Pondering...', 'Searching...', 'Planning...', 'Plotting...']

  // Auto-focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  // Cycle through thinking phrases while loading
  useEffect(() => {
    if (!loading) return
    
    let phraseIndex = 0
    const interval = setInterval(() => {
      phraseIndex = (phraseIndex + 1) % thinkingPhrases.length
      setThinkingPhrase(thinkingPhrases[phraseIndex])
    }, 3500) // Change every 3.5 seconds
    
    return () => clearInterval(interval)
  }, [loading])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const scrollToLatestAIResponse = () => {
    latestAIResponseRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  useEffect(() => {
    if (messages.length === 0) return
    
    const lastMessage = messages[messages.length - 1]
    
    // If the latest message is from AI and has song suggestions, scroll to show it at the top
    if (lastMessage.role === 'assistant' && lastMessage.suggestedSongs && lastMessage.suggestedSongs.length > 0) {
      // Use a small delay to ensure the DOM is updated
      setTimeout(() => scrollToLatestAIResponse(), 100)
    } else {
      // For other messages, scroll to bottom as usual
      scrollToBottom()
    }
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      // Get AI suggestions
      const aiResponse = await getSongSuggestionsFromAI(playlist, input, existingTracks)

      // Search Spotify for each suggestion
      const spotifyResults = await searchSpotifyForSongs(
        aiResponse.suggestions.map(s => ({ title: s.title, artist: s.artist })),
        existingTracks
      )

      // Create assistant message with suggested songs
      const assistantMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: aiResponse.userMessage,
        timestamp: new Date(),
        suggestedSongs: spotifyResults.map(song => ({
          title: song.title,
          artist: song.artist,
          reason: aiResponse.suggestions.find(s => s.title === song.title)?.reason,
          selected: false,
          spotifyUri: song.spotifyUri,
          artworkUrl: song.artworkUrl,
          album: song.album,
          durationMs: song.durationMs,
          albumSpotifyUri: song.albumSpotifyUri,
          artistSpotifyUri: song.artistSpotifyUri,
        })),
      }
      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      let errorContent = 'Sorry, I encountered an error. Please try again.'
      
      if (error instanceof Error) {
        const errorMessage = error.message
        
        // Use the user-friendly error messages from the AI actions
        if (errorMessage.includes('busy') || errorMessage.includes('few minutes')) {
          errorContent = 'I\'m a bit overwhelmed right now. Please try again in a few minutes.'
        } else if (errorMessage.includes('daily limit') || errorMessage.includes('tomorrow')) {
          errorContent = 'I\'ve reached my daily thinking limit. Please try again tomorrow!'
        } else if (errorMessage.includes('configuration') || errorMessage.includes('support')) {
          errorContent = 'There seems to be a setup issue. Please contact support for help.'
        } else if (errorMessage.includes('unavailable') || errorMessage.includes('try again later')) {
          errorContent = 'I\'m temporarily offline. Please check back in a bit.'
        } else if (errorMessage.includes('trouble right now') || errorMessage.includes('moment')) {
          errorContent = 'I\'m having a small hiccup. Give me a moment and try again.'
        }
      }
      
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: errorContent,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const toggleSongSelection = (songIndex: number) => {
    const key = `${songIndex}`
    const newSelected = new Set(selectedSongs)
    if (newSelected.has(key)) {
      newSelected.delete(key)
    } else {
      newSelected.add(key)
    }
    setSelectedSongs(newSelected)
  }

  const handleAcceptSongs = async () => {
    setLoading(true)
    try {
      // Get the last assistant message with songs
      const lastSongMessage = [...messages].reverse().find(m => m.suggestedSongs?.length)
      if (!lastSongMessage?.suggestedSongs) return

      const selectedSongsList = lastSongMessage.suggestedSongs
        .map((song, index) => (selectedSongs.has(index.toString()) ? song : null))
        .filter((song): song is NonNullable<typeof song> => song !== null)

      if (selectedSongsList.length === 0) return

      // Add songs to database
      const addedTracks = await addAISuggestedTracks(
        playlist.id,
        selectedSongsList.map(song => ({
          title: song.title,
          artist: song.artist,
          spotifyUri: song.spotifyUri,
          artworkUrl: song.artworkUrl,
          album: song.album,
          durationMs: song.durationMs,
          albumSpotifyUri: song.albumSpotifyUri,
          artistSpotifyUri: song.artistSpotifyUri,
        }))
      )

      // Clear selection
      setSelectedSongs(new Set())

      // Notify parent (if callback provided)
      // Note: This is optional now - realtime subscription handles UI updates
      if (onSongsAdded) {
        onSongsAdded(addedTracks)
      }

      // Add confirmation message
      const confirmMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Great! I've added ${selectedSongsList.length} song(s) to your playlist. Would you like more suggestions?`,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, confirmMessage])
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Sorry, I had trouble adding those songs. Please try again.',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const lastMessage = messages[messages.length - 1]
  const hasSelectedSongs = selectedSongs.size > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md h-[600px] bg-zinc-900 border border-white/10 rounded-lg flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>✨ AI Assistant</span>
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, messageIndex) => (
            <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                ref={message.role === 'assistant' && message.suggestedSongs && message.suggestedSongs.length > 0 && messageIndex === messages.length - 1 ? latestAIResponseRef : undefined}
                className={`max-w-[70%] rounded-lg px-3 py-2 ${
                  message.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-zinc-800 text-zinc-100 border border-white/10'
                }`}
              >
                <p className="text-sm">{message.content}</p>

                {/* Suggested Songs */}
                {message.suggestedSongs && message.suggestedSongs.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {message.suggestedSongs.map((song, index) => (
                      <label
                        key={`${index}-${song.title}`}
                        className="flex items-start gap-3 p-2 rounded bg-zinc-700/50 hover:bg-zinc-700 transition-colors cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedSongs.has(index.toString())}
                          onChange={() => toggleSongSelection(index)}
                          className="mt-0.5 rounded"
                        />
                        {song.artworkUrl && (
                          <img 
                            src={song.artworkUrl} 
                            alt={song.title}
                            className="w-10 h-10 rounded object-cover flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-white truncate">{song.title}</p>
                          <p className="text-xs text-zinc-400 truncate">{song.artist}</p>
                          {song.reason && <p className="text-xs text-zinc-300 italic mt-1">{song.reason}</p>}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {/* Thinking indicator */}
          {loading && (
            <div className="flex justify-start animate-fade-in">
              <div className="max-w-[70%] rounded-lg px-3 py-2 bg-zinc-800 text-zinc-100 border border-white/10 animate-pulse">
                <p className="text-sm text-zinc-400 italic transition-all duration-500 animate-bounce-subtle">{thinkingPhrase}</p>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Actions */}
        {lastMessage?.suggestedSongs && hasSelectedSongs && (
          <div className="px-4 py-2 border-t border-white/10">
            <button
              onClick={handleAcceptSongs}
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-700 text-white text-sm font-medium py-2 rounded transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Adding...
                </>
              ) : (
                `Add ${selectedSongs.size} Song${selectedSongs.size !== 1 ? 's' : ''} to Suggestions`
              )}
            </button>
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask for song suggestions..."
              disabled={loading}
              className="flex-1 bg-zinc-800 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-700 text-white rounded px-3 py-2 transition-colors flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
