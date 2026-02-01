'use client'

import { useEffect, useState, useTransition } from 'react'
import { X, History, Clock, User, MousePointerClick, MessageSquare } from 'lucide-react'
import { getTrackHistory, addComment } from '@/app/playlist/actions'

interface HistoryPanelProps {
    trackId: string | null
    onClose: () => void
}

type HistoryItem = {
    id: string
    created_at: string
    action: string
    details: any
    user_email: string
}

export function HistoryPanel({ trackId, onClose }: HistoryPanelProps) {
    const [history, setHistory] = useState<HistoryItem[]>([])
    const [loading, setLoading] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const [currentTrackId, setCurrentTrackId] = useState<string | null>(null)

    const fetchHistory = () => {
        if (!trackId) return;
        setLoading(true)
        getTrackHistory(trackId)
            .then((data) => {
                setHistory(data as HistoryItem[])
            })
            .catch((err) => console.error(err))
            .finally(() => setLoading(false))
    }

    useEffect(() => {
        if (trackId) {
            setCurrentTrackId(trackId)
            
            // Allow the component to mount in its hidden state first
            setTimeout(() => {
                setIsOpen(true)
            }, 10) // A tiny delay is all that's needed

            fetchHistory()
        } else {
            setIsOpen(false)
        }
    }, [trackId])

    const handleTransitionEnd = () => {
        if (!isOpen) {
            setCurrentTrackId(null)
        }
    }

    if (!currentTrackId) return null

    return (
        <>
            {/* Backdrop */}
            <div 
                className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />

            {/* Panel */}
            <div 
                onTransitionEnd={handleTransitionEnd}
                className={`fixed top-0 right-0 h-full w-96 bg-[#18181b] border-l border-white/10 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
            >
                <div className="p-6 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white font-bold text-lg">
                        <History className="w-5 h-5" />
                        <span>History</span>
                    </div>
                    <button 
                        onClick={onClose}
                        className="text-zinc-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {loading ? (
                        <div className="flex justify-center items-center text-zinc-500 py-10">
                            <Spinner />
                        </div>
                    ) : history.length === 0 ? (
                        <div className="text-center text-zinc-500 py-10">
                            No history found.
                        </div>
                    ) : (
                        history.map((item) => (
                            <div key={item.id} className="relative pl-6 border-l border-zinc-700 pb-4 last:pb-0">
                                <div className="absolute -left-2 top-0.5 w-4 h-4 rounded-full bg-[#18181b] flex items-center justify-center">
                                    <ActionIcon action={item.action} />
                                </div>
                                
                                <div className="flex flex-col gap-0.5">
                                    <div className="text-sm text-zinc-300">
                                        <FormatDetails action={item.action} details={item.details} />
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                                        <div className="flex items-center gap-1">
                                            <User className="w-3 h-3" />
                                            <span>{item.user_email}</span>
                                        </div>
                                        <span>•</span>
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            <span>{new Date(item.created_at).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <CommentForm trackId={currentTrackId} onCommentAdded={fetchHistory} />
            </div>
        </>
    )
}

function CommentForm({ trackId, onCommentAdded }: { trackId: string, onCommentAdded: () => void }) {
    const [comment, setComment] = useState('')
    const [isPending, startTransition] = useTransition()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!comment.trim() || !trackId) return

        startTransition(async () => {
            try {
                await addComment(trackId, comment)
                setComment('')
                onCommentAdded()
            } catch (error) {
                console.error('Failed to add comment', error)
                alert('Could not post comment.')
            }
        })
    }

    return (
        <form onSubmit={handleSubmit} className="p-4 border-t border-white/10">
            <div className="relative">
                <input
                    type="text"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="w-full bg-zinc-800 rounded-full py-2 pl-4 pr-12 text-sm text-zinc-300 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    disabled={isPending}
                />
                <button
                    type="submit"
                    className="absolute right-1 top-1/2 -translate-y-1/2 bg-indigo-600 hover:bg-indigo-500 rounded-full h-7 w-7 flex items-center justify-center text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isPending || !comment.trim()}
                >
                    {isPending ? <Spinner /> : <SendIcon className="w-4 h-4" />}
                </button>
            </div>
        </form>
    )
}

function ActionIcon({ action }: { action: string }) {
    switch (action) {
        case 'comment': return <MessageSquare className="w-4 h-4 text-gray-400" />
        case 'move': return <MousePointerClick className="w-4 h-4 text-blue-400" />
        case 'rate': return <StarIcon className="w-4 h-4 text-yellow-400" />
        case 'status_change': return <RefreshCwIcon className="w-4 h-4 text-green-400" />
        default: return <History className="w-4 h-4 text-zinc-400" />
    }
}

function StarIcon({ className }: { className?: string }) {
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
}

function RefreshCwIcon({ className }: { className?: string }) {
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
}

function FormatDetails({ action, details }: { action: string, details: any }) {
    if (!details) return null

    if (action === 'move') {
        return (
            <span>
                Moved from position <span className="text-white font-mono">{details.from}</span> to <span className="text-white font-mono">{details.to}</span>
            </span>
        )
    }

    if (action === 'rate') {
        return (
            <span>
                Rated <span className="text-yellow-400 font-bold">{details.rating} stars</span>
            </span>
        )
    }

    if (action === 'status_change') {
        return (
            <span>
                Changed status to <span className={`font-bold ${details.status === 'active' ? 'text-green-400' : 'text-red-400'}`}>{details.status}</span>
            </span>
        )
    }

    if (action === 'comment') {
        return (
            <div className="bg-zinc-800 p-2 rounded-md text-zinc-300">
                {details.comment}
            </div>
        )
    }

    return <pre className="whitespace-pre-wrap">{JSON.stringify(details, null, 2)}</pre>
}

function Spinner() {
    return (
        <svg className="animate-spin h-5 w-5 text-zinc-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    )
}

function SendIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
    )
}
