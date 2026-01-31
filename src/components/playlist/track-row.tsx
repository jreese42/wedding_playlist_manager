import { Database } from '@/lib/database.types'

type Track = Database['public']['Tables']['tracks']['Row']

interface TrackRowProps {
  track: Track
  index: number
}

function formatDuration(ms: number | null) {
  if (!ms) return '--:--'
  const minutes = Math.floor(ms / 60000)
  const seconds = ((ms % 60000) / 1000).toFixed(0)
  return `${minutes}:${Number(seconds) < 10 ? '0' : ''}${seconds}`
}

export function TrackRow({ track, index }: TrackRowProps) {
  return (
    <div className="group grid grid-cols-[16px_4fr_3fr_minmax(120px,1fr)] gap-4 px-4 py-2 text-sm text-zinc-400 hover:bg-white/10 rounded-md items-center transition-colors">
      <div className="flex justify-center items-center w-4 text-right tabular-nums">
        <span className="group-hover:hidden">{index + 1}</span>
        <button className="hidden group-hover:block text-white">
             {/* Simple Play Icon Placeholder */}
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M8 5v14l11-7z" />
            </svg>
        </button>
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
          <span className="truncate group-hover:text-white transition-colors">{track.artist}</span>
        </div>
      </div>

      <div className="flex items-center truncate min-w-0">
        <span className="truncate group-hover:text-white transition-colors">
            {track.album}
        </span>
      </div>

      <div className="flex items-center justify-end font-variant-numeric tabular-nums">
        {formatDuration(track.duration_ms)}
      </div>
    </div>
  )
}
