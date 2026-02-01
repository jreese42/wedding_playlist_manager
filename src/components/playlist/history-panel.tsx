'use client'

import { useEffect, useState } from 'react'
import { X, History, Clock, User, MousePointerClick } from 'lucide-react'
import { getTrackHistory } from '@/app/playlist/actions'

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

    useEffect(() => {
        if (trackId) {
            setCurrentTrackId(trackId)
            
            // Allow the component to mount in its hidden state first
            setTimeout(() => {
                setIsOpen(true)
            }, 10) // A tiny delay is all that's needed

            setLoading(true)
            getTrackHistory(trackId)
                .then((data) => {
                    setHistory(data as HistoryItem[])
                })
                .catch((err) => console.error(err))
                .finally(() => setLoading(false))
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
                        <h2>Track History</h2>
                    </div>
                    <button 
                        onClick={onClose}
                        className="text-zinc-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {loading ? (
                        <div className="text-center text-zinc-500 py-10">
                            Loading history...
                        </div>
                    ) : history.length === 0 ? (
                        <div className="text-center text-zinc-500 py-10">
                            No history found.
                        </div>
                    ) : (
                        history.map((item) => (
                            <div key={item.id} className="relative pl-6 border-l border-zinc-700 pb-6 last:pb-0">
                                <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-zinc-600 ring-4 ring-[#18181b]" />
                                
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {new Date(item.created_at).toLocaleString()}
                                        </span>
                                    </div>
                                    
                                    <div className="text-sm font-medium text-white flex items-center gap-2">
                                        <ActionIcon action={item.action} />
                                        <span className="capitalize">{item.action.replace('_', ' ')}</span>
                                    </div>

                                    <div className="text-xs text-zinc-400 mt-1 bg-zinc-800/50 p-2 rounded">
                                        <FormatDetails action={item.action} details={item.details} />
                                    </div>

                                    <div className="flex items-center gap-1 mt-2 text-xs text-zinc-500">
                                        <User className="w-3 h-3" />
                                        <span>{item.user_email}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </>
    )
}

function ActionIcon({ action }: { action: string }) {
    switch (action) {
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

    return <pre className="whitespace-pre-wrap">{JSON.stringify(details, null, 2)}</pre>
}
