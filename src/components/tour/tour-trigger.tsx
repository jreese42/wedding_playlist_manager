'use client'

import { useEffect } from 'react'
import { useTour } from '@/lib/tour-context'
import { WELCOME_TOUR_STEPS } from '@/lib/tour-steps'
import { hasTourBeenCompleted, isTourInProgress, markTourInProgress } from '@/lib/tour-service'
import { createClient } from '@/lib/supabase/client'

/**
 * This component should be placed in the root layout
 * It automatically starts the tour if the user hasn't completed it before
 */
export function TourTrigger() {
  const { startTour } = useTour()

  useEffect(() => {
    const checkAuthAndStartTour = async () => {
      // Check if user is authenticated
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      // Only proceed if user is logged in
      if (!user) {
        return
      }
      
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
            startTour(WELCOME_TOUR_STEPS)
          }, 500)
          return () => clearTimeout(timer)
        } else {
          // Navigate to first playlist and start tour after navigation
          const timer = setTimeout(() => {
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
            startTour(WELCOME_TOUR_STEPS)
          }, 1000)
          return () => clearTimeout(timer)
        }
      }
    }
    
    checkAuthAndStartTour()
  }, [startTour])

  return null
}
