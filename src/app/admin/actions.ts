'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSpotifyClient } from '@/lib/spotify'
import fs from 'fs'
import path from 'path'
import { revalidatePath } from 'next/cache'

// Helper to parse frontmatter crudely (since we don't have a library installed for it yet and it's simple)
function parseFrontmatter(content: string) {
    const match = content.match(/^---\s*([\s\S]*?)\s*---/)
    if (!match) return {}
    const frontmatterRaw = match[1]
    const spotifyIdMatch = frontmatterRaw.match(/spotify_id:\s*(.+)/)
    return {
        spotify_id: spotifyIdMatch ? spotifyIdMatch[1].trim() : null
    }
}

// Helper to remove frontmatter
function removeFrontmatter(content: string) {
    return content.replace(/^---\s*[\s\S]*?\s*---/, '').trim()
}

export type ActionState = {
    success: boolean
    results: any[]
    error?: string
    logs?: string[]
}

export async function seedPlaylists(prevState: ActionState): Promise<ActionState> {
    const logs: string[] = []
    const log = (msg: string) => {
        console.log(msg)
        logs.push(msg)
    }

    log('--- STARTING SEED SCRIPT ---')
    
    // Check Env Vars
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        log('CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing.')
        return { success: false, results: [], error: 'Missing SUPABASE_SERVICE_ROLE_KEY', logs }
    }

    try {
        // Use Admin Client to bypass RLS and ensure we can DELETE ALL
        const supabase = await createAdminClient()
        const playlistsDir = path.join(process.cwd(), 'Playlists')
        log(`Scanning directory: ${playlistsDir}`)
        
        // 1. Purge existing data
        log('Attempting to purge database...')
        const { error: deleteError, count } = await supabase.from('playlists').delete({ count: 'exact' }).neq('id', '00000000-0000-0000-0000-000000000000')
        
        if (deleteError) {
             console.error('Delete failed:', deleteError)
             log(`Delete failed: ${deleteError.message}`)
             throw new Error(`Failed to purge database: ${deleteError.message}`)
        }
        log(`Database purged. Deleted ${count} rows.`)

        const files = fs.readdirSync(playlistsDir).filter(f => f.endsWith('.md'))
        log(`Found ${files.length} markdown files to process.`)
        
        const results = []

        for (const file of files) {
            const content = fs.readFileSync(path.join(playlistsDir, file), 'utf-8')
            const metadata = parseFrontmatter(content)
            
            // Extract title from the first H1
            const titleMatch = content.match(/^#\s+(.+)$/m)
            const title = titleMatch ? titleMatch[1].trim() : file.replace('.md', '').replace(/_/g, ' ')
            
            // Extract description and vibe roughly
            const descriptionMatch = content.match(/\*\*Purpose:\*\*\s*(.+)$/m)
            const description = descriptionMatch ? descriptionMatch[1].trim() : null
            
            const vibeMatch = content.match(/\*\*Vibe:\*\*\s*(.+)$/m)
            const vibe = vibeMatch ? vibeMatch[1].trim() : null

            // Determine display order based on filename (01_, 02_)
            const orderMatch = file.match(/^(\d+)_/)
            const display_order = orderMatch ? parseInt(orderMatch[1]) : 99

            log(`Processing ${file}... Title: ${title}, Spotify ID: ${metadata.spotify_id}`)

            if (metadata.spotify_id) {
                // Since we purged, we can just insert
                const { error, data } = await supabase.from('playlists').insert({
                    title,
                    description,
                    vibe,
                    spotify_id: metadata.spotify_id,
                    display_order
                }).select()

                if (error) {
                    console.error(`Error inserting ${file}:`, error)
                    log(`Error inserting ${file}: ${error.message}`)
                    results.push({ file, status: 'error', error: error.message })
                } else {
                    log(`Successfully inserted ${file}.`)
                    results.push({ file, status: 'success' })
                }
            } else {
                log(`Skipping ${file}: No spotify_id found.`)
                results.push({ file, status: 'skipped', reason: 'No spotify_id found' })
            }
        }
        revalidatePath('/admin')
        return { success: true, results, logs }
    } catch (e: any) {
        log(`CRITICAL SEED ERROR: ${e.message}`)
        console.error('CRITICAL SEED ERROR:', e)
        return { success: false, results: [], error: e.message, logs }
    }
}

import { syncPlaylistMetadata } from '@/lib/spotify-sync'

// ... existing imports

export async function syncTracksFromSpotify(prevState: ActionState): Promise<ActionState> {
    const supabase = await createClient()
    const spotify = await getSpotifyClient()
    
    // 1. Get all playlists from DB
    const { data: playlists, error: dbError } = await supabase.from('playlists').select('*')
    if (dbError) return { success: false, results: [], error: dbError.message }

    const results = []

    for (const playlist of playlists) {
        if (!playlist.spotify_id) continue;

        try {
            // 0. Sync Metadata First
            await syncPlaylistMetadata(playlist.id, playlist.spotify_id)

            // 2. Fetch tracks from Spotify
            let allTracks = []
            let offset = 0
            let limit = 50
            let hasMore = true

            while (hasMore) {
                const response = await spotify.getPlaylistTracks(playlist.spotify_id, { offset, limit })
                allTracks.push(...response.body.items)
                if (response.body.next) {
                    offset += limit
                } else {
                    hasMore = false
                }
            }

            // 3. Insert into DB
            // We want to APPEND new songs, but not mess up existing order if possible.
            // For now, let's just ensure they exist.
            
            let addedCount = 0;
            let updatedCount = 0;
            
            // Get current max position
            const { data: maxPosData } = await supabase.from('tracks')
                .select('position')
                .eq('playlist_id', playlist.id)
                .order('position', { ascending: false })
                .limit(1)
                .single()
            
            let currentPosition = (maxPosData?.position || 0) + 1

            for (const item of allTracks) {
                if (!item.track || !item.track.uri) continue;
                
                const track = item.track as SpotifyApi.TrackObjectFull;
                const spotify_uri = track.uri;

                const trackData = {
                    playlist_id: playlist.id,
                    title: track.name,
                    artist: track.artists.map(a => a.name).join(', '),
                    album: track.album.name,
                    artwork_url: track.album.images[0]?.url,
                    spotify_uri: spotify_uri,
                    artist_spotify_uri: track.artists[0]?.uri, // Link to primary artist
                    album_spotify_uri: track.album.uri,
                    duration_ms: track.duration_ms,
                }

                // Check if exists
                const { data: existing } = await supabase.from('tracks')
                    .select('id')
                    .eq('playlist_id', playlist.id)
                    .eq('spotify_uri', spotify_uri)
                    .single()

                if (!existing) {
                    // Add new track
                    await supabase.from('tracks').insert({
                        ...trackData,
                        status: 'active', // Sync from Spotify is considered "Approved/Active" by default
                        position: currentPosition
                    })
                    currentPosition++;
                    addedCount++;
                } else {
                    // Update existing track
                    await supabase.from('tracks').update(trackData).eq('id', existing.id)
                    updatedCount++;
                }
            }
            results.push({ playlist: playlist.title, added: addedCount, updated: updatedCount, total: allTracks.length })

        } catch (e: any) {
            console.error(`Error syncing playlist ${playlist.title}:`, e)
            results.push({ playlist: playlist.title, error: e.message })
        }
    }
    
    revalidatePath('/admin')
    return { success: true, results }
}

export async function syncMetadataOnly(prevState: ActionState): Promise<ActionState> {
    const supabase = await createClient()
    
    // 1. Get all playlists from DB
    const { data: playlists, error: dbError } = await supabase.from('playlists').select('*')
    if (dbError) return { success: false, results: [], error: dbError.message }

    const results = []

    for (const playlist of playlists) {
        if (!playlist.spotify_id) {
            results.push({ playlist: playlist.title, status: 'skipped', reason: 'No Spotify ID' })
            continue;
        }

        try {
            const success = await syncPlaylistMetadata(playlist.id, playlist.spotify_id)
            if (success) {
                results.push({ playlist: playlist.title, status: 'success' })
            } else {
                results.push({ playlist: playlist.title, status: 'error', reason: 'Failed to fetch metadata' })
            }
        } catch (e: any) {
            console.error(`Error syncing metadata for ${playlist.title}:`, e)
            results.push({ playlist: playlist.title, status: 'error', reason: e.message })
        }
    }
    
    revalidatePath('/admin')
    revalidatePath('/')
    return { success: true, results }
}
