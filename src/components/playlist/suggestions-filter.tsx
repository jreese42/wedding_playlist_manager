'use client'

import { Filter, X } from 'lucide-react'

interface SuggestionsFilterProps {
  filterText: string
  showRemoved: boolean
  onFilterTextChange: (text: string) => void
  onShowRemovedChange: (show: boolean) => void
  totalSuggestions: number
  totalRemoved: number
}

export function SuggestionsFilter({
  filterText,
  showRemoved,
  onFilterTextChange,
  onShowRemovedChange,
  totalSuggestions,
  totalRemoved,
}: SuggestionsFilterProps) {
  return (
    <div className="px-4 mb-6">
      <div className="flex gap-3 items-center max-w-xl">
        {/* Filter Text Input - Match SpotifySearch Style */}
        <div className="relative flex-1">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Filter..."
            value={filterText}
            onChange={(e) => onFilterTextChange(e.target.value)}
            className="w-full bg-black/20 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
          {filterText && (
            <button
              onClick={() => onFilterTextChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Show Removed Checkbox - Glassmorphism Style */}
        <label className="flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
          <div className="relative w-4 h-4">
            <input
              type="checkbox"
              checked={showRemoved}
              onChange={(e) => onShowRemovedChange(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-full h-full bg-white/10 backdrop-blur-md border border-white/20 rounded-md peer-checked:bg-indigo-500/50 peer-checked:border-indigo-400/50 transition-all peer-focus:border-white/40" />
            <svg
              className="absolute inset-0 w-full h-full text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <span className="text-xs text-white/70">Removed</span>
        </label>
      </div>
    </div>
  )
}
