'use client'

import Link from 'next/link'
import { useActionState, useState, useEffect } from 'react'
import { seedPlaylists, syncTracksFromSpotify, syncMetadataOnly, type ActionState } from '@/app/admin/actions'
import { saveDemoCheckpoint, clearDemoActivity, resetDemoDatabase } from '@/app/demo/actions'
import { Users, Save, Trash2, RefreshCw, Info } from 'lucide-react'
import { AdminSettingsClient } from './admin-settings-client'

interface AppSetting {
  key: string
  value: string | null
  description: string | null
}

interface AdminClientPageProps {
  initialSettings?: AppSetting[]
}

const initialState: ActionState = {
    results: [],
    success: false,
    error: undefined,
    logs: []
}

export function AdminClientPage({ initialSettings = [] }: AdminClientPageProps) {
    const [seedState, seedAction, isSeeding] = useActionState(seedPlaylists, initialState)
    const [syncState, syncAction, isSyncing] = useActionState(syncTracksFromSpotify, initialState)
    const [metaState, metaAction, isMetaSyncing] = useActionState(syncMetadataOnly, initialState)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isDemo, setIsDemo] = useState(false)

    useEffect(() => {
        setIsDemo(document.cookie.includes('site_mode=demo'))
    }, [])

    useEffect(() => {
        if (seedState.success) {
            setIsModalOpen(false)
        }
    }, [seedState.success])

    return (
        <div className="p-8 max-w-4xl mx-auto text-white">
            <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

            {/* Demo Mode Management */}
            {isDemo && (
                <div className="mb-8 bg-zinc-900 border border-amber-500/30 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <h2 className="text-xl font-semibold text-amber-300">Demo Mode Management</h2>
                    </div>
                    <p className="text-zinc-400 text-sm mb-6">
                        Use these tools to manage the state of the demo database. These actions only affect the demo environment.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <form action={saveDemoCheckpoint} className="flex-1">
                            <button 
                                type="submit"
                                className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium py-2 px-4 rounded-md transition-colors"
                            >
                                <Save size={16} />
                                Save Current State as Checkpoint
                            </button>
                        </form>
                        <form action={resetDemoDatabase} className="flex-1">
                            <button 
                                type="submit"
                                className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium py-2 px-4 rounded-md transition-colors"
                            >
                                <RefreshCw size={16} />
                                Reset to Checkpoint
                            </button>
                        </form>
                        <form action={clearDemoActivity} className="flex-1">
                            <button 
                                type="submit"
                                className="w-full flex items-center justify-center gap-2 border border-zinc-700 hover:bg-zinc-800 text-white text-sm font-medium py-2 px-4 rounded-md transition-colors"
                            >
                                <Trash2 size={16} />
                                Clear All Activity
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Navigation Links */}
            <div className="mb-8 flex gap-4">
                <Link href="/admin/users" className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors">
                    <Users size={18} />
                    Manage Users
                </Link>
            </div>

            {/* App Settings Section */}
            {initialSettings.length > 0 && (
                <div className="mb-8 bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <h2 className="text-xl font-semibold mb-6">App Settings</h2>
                    <AdminSettingsClient initialSettings={initialSettings} />
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="bg-zinc-900 border border-red-500/50 p-6 rounded-xl max-w-md w-full shadow-2xl">
                        <h3 className="text-xl font-bold text-red-500 mb-2">Warning: Destructive Action</h3>
                        <p className="text-zinc-300 mb-6">
                            This will <strong>permanently delete all existing playlists and tracks</strong> from the database and re-seed them from the Markdown files. 
                            <br /><br />
                            Are you sure you want to proceed?
                        </p>
                        <div className="flex gap-4 justify-end">
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 rounded-md hover:bg-zinc-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <form action={seedAction}>
                        <button 
                            disabled={isSeeding}
                            className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-md transition-colors"
                        >
                            {isSeeding ? 'Seeding (This may take a moment)...' : 'Yes, Overwrite Database'}
                        </button>
                    </form>
                </div>
            </div>
            </div>
            )}

            <div className="grid gap-8">
            {/* Seed Playlists Card */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <h2 className="text-xl font-semibold mb-2">1. Seed Playlists</h2>
                <p className="text-zinc-400 text-sm mb-6">
                    Read the Markdown files from the <code>/Playlists</code> folder and populate the database.
                    This will create or update the playlist titles and Spotify IDs.
                </p>
                
                <button 
                    onClick={() => setIsModalOpen(true)}
                    disabled={isSeeding}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
                    {isSeeding ? 'Seeding...' : 'Run Seed Script'}
                </button>

                {seedState?.logs && seedState.logs.length > 0 && (
                    <div className="mt-4 bg-black/50 rounded p-4 text-xs font-mono max-h-40 overflow-y-auto border border-zinc-700">
                         <h4 className="font-bold text-zinc-400 mb-1">Server Logs:</h4>
                        {seedState.logs.map((log: string, i: number) => (
                            <div key={i} className="text-zinc-300 border-b border-white/5 pb-0.5 mb-0.5">
                                {log}
                            </div>
                        ))}
                    </div>
                )}

                {seedState?.results && seedState.results.length > 0 && (
                        <div className="mt-4 bg-black/30 rounded p-4 text-xs font-mono max-h-40 overflow-y-auto">
                            {seedState.results.map((res: any, i: number) => (
                                <div key={i} className={res.status === 'success' ? 'text-green-400' : 'text-red-400'}>
                                    [{res.status}] {res.file} {res.reason ? `- ${res.reason}` : ''}
                                </div>
                            ))}
                        </div>
                    )}
                    {seedState?.error && (
                        <div className="mt-4 text-red-400 text-sm">
                            Error: {seedState.error}
                        </div>
                    )}
                </div>

                {/* Sync Tracks Card */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <h2 className="text-xl font-semibold mb-2">2. Sync from Spotify</h2>
                    <p className="text-zinc-400 text-sm mb-6">
                        Connect to Spotify API using the IDs in the database. Fetch all tracks and add new ones to the app.
                        Preserves existing order.
                    </p>
                    
                    <div className="flex flex-col gap-4">
                        <form action={syncAction}>
                            <button 
                                disabled={isSyncing}
                                className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-md transition-colors"
                            >
                                {isSyncing ? 'Syncing...' : 'Run Full Spotify Sync'}
                            </button>
                        </form>
                        
                        <form action={metaAction}>
                             <button 
                                disabled={isMetaSyncing}
                                className="w-full bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-2"
                            >
                                <Info size={16} />
                                {isMetaSyncing ? 'Fetching...' : 'Fetch Metadata Only (Titles/Descriptions)'}
                            </button>
                        </form>
                    </div>

                    {syncState?.results && syncState.results.length > 0 && (
                        <div className="mt-4 bg-black/30 rounded p-4 text-xs font-mono max-h-40 overflow-y-auto">
                            <div className="font-bold mb-2 text-zinc-400">Full Sync Results:</div>
                            {syncState.results.map((res: any, i: number) => (
                                <div key={i} className={res.error ? 'text-red-400' : 'text-green-400'}>
                                    {res.playlist}: {res.error ? res.error : `Added ${res.added} / Updated ${res.updated} / Total ${res.total}`}
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {metaState?.results && metaState.results.length > 0 && (
                        <div className="mt-4 bg-black/30 rounded p-4 text-xs font-mono max-h-40 overflow-y-auto">
                             <div className="font-bold mb-2 text-zinc-400">Metadata Sync Results:</div>
                            {metaState.results.map((res: any, i: number) => (
                                <div key={i} className={res.status === 'success' ? 'text-green-400' : 'text-red-400'}>
                                    {res.playlist}: {res.status} {res.reason ? `(${res.reason})` : ''}
                                </div>
                            ))}
                        </div>
                    )}
                     
                     {(syncState?.error || metaState?.error) && (
                        <div className="mt-4 text-red-400 text-sm">
                            Error: {syncState.error || metaState.error}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
