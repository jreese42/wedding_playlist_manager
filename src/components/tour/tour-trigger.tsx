'use client'

import { useEffect } from 'react'
import { useTour } from '@/lib/tour-context'
import { WELCOME_TOUR_STEPS } from '@/lib/tour-steps'
import { hasTourBeenCompleted, isTourInProgress, markTourInProgress } from '@/lib/tour-service'

/**
 * This component should be placed in the root layout
 * It automatically starts the tour if the user hasn't completed it before
 */
export function TourTrigger() {
  const { startTour } = useTour()

  useEffect(() => {
    // Check if tour has been completed or is already in progress
    const completed = hasTourBeenCompleted()
    const inProgress = isTourInProgress()
    
    // Only show tour on first visit (when localStorage is empty and not already running)
    if (!completed && !inProgress && typeof window !== 'undefined') {
      // Mark as in progress to prevent re-triggering on navigation
      markTourInProgress()
      
      // Check if we're on a playlist page already
      const isOnPlaylist = window.location.pathname.includes('/playlist/')
      
      if (isOnPlaylist) {
        // We're already on a playlist, start tour immediately
        const timer = setTimeout(() => {
          console.log('Starting welcome tour...')
          startTour(WELCOME_TOUR_STEPS)
        }, 500)
        return () => clearTimeout(timer)
      } else {
        // Navigate to first playlist and start tour after navigation
        const timer = setTimeout(() => {
          console.log('Navigating to first playlist to start tour...')
          
          // Get first playlist link from DOM
          const firstPlaylistLink = document.querySelector('[data-tour="navigation"] a[href*="/playlist/"]') as HTMLAnchorElement
          if (firstPlaylistLink) {
            const href = firstPlaylistLink.getAttribute('href')
            if (href) {
              // Store flag that we should start tour after navigation
              sessionStorage.setItem('tour_start_after_navigation', 'true')
              window.location.href = href
            }
          } else {
            // No playlist found, just start tour on home
            console.log('No playlist found, starting tour on home...')
            startTour(WELCOME_TOUR_STEPS)
          }
        }, 500)
        return () => clearTimeout(timer)
      }
    }
    
    // Check if we should start tour after navigation
    if (isTourInProgress() && typeof window !== 'undefined') {
      const shouldStart = sessionStorage.getItem('tour_start_after_navigation')
      if (shouldStart === 'true') {
        sessionStorage.removeItem('tour_start_after_navigation')
        const timer = setTimeout(() => {
          console.log('Starting tour after navigation...')
          startTour(WELCOME_TOUR_STEPS)
        }, 1000)
        return () => clearTimeout(timer)
      }
    }
  }, [startTour])

  return null
}
