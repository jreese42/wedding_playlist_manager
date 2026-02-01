'use client'

import { useTour } from '@/lib/tour-context'
import { WELCOME_TOUR_STEPS } from '@/lib/tour-steps'
import { resetTourCompletion, markTourInProgress } from '@/lib/tour-service'
import { HelpCircle } from 'lucide-react'
import { useState } from 'react'

export function RestartTourButton() {
  const { startTour } = useTour()
  const [isLoading, setIsLoading] = useState(false)

  const handleRestart = async () => {
    setIsLoading(true)
    try {
      // Reset completion status
      resetTourCompletion()
      markTourInProgress()
      
      // Check if we're on a playlist page
      const isOnPlaylist = typeof window !== 'undefined' && window.location.pathname.includes('/playlist/')
      
      if (isOnPlaylist) {
        // Already on playlist, start tour immediately
        startTour(WELCOME_TOUR_STEPS)
      } else {
        // Navigate to first playlist
        if (typeof window !== 'undefined') {
          const firstPlaylistLink = document.querySelector('[data-tour="navigation"] a[href*="/playlist/"]') as HTMLAnchorElement
          if (firstPlaylistLink) {
            const href = firstPlaylistLink.getAttribute('href')
            if (href) {
              // Store flag to start tour after navigation
              sessionStorage.setItem('tour_start_after_navigation', 'true')
              window.location.href = href
              return
            }
          }
        }
        
        // Fallback: start tour here
        startTour(WELCOME_TOUR_STEPS)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleRestart}
      disabled={isLoading}
      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <HelpCircle size={18} />
      {isLoading ? 'Starting...' : 'View Welcome Tour'}
    </button>
  )
}
