'use client'

import { useEffect, useRef } from 'react'
import { useTour } from '@/lib/tour-context'
import { WELCOME_TOUR_STEPS } from '@/lib/tour-steps'
import { hasTourBeenCompleted, isTourInProgress, markTourInProgress, resetTourCompletion } from '@/lib/tour-service'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'

/**
 * This component should be placed in the root layout
 * It automatically starts the tour if the user hasn't completed it before
 */
export function TourTrigger() {
  const { startTour } = useTour()
  const searchParams = useSearchParams()
  const hasCheckedRef = useRef(false)

  useEffect(() => {
    const supabase = createClient()

    const runTourCheck = (user: any) => {
      // If we've already checked and started the tour in this session mount, skip
      if (hasCheckedRef.current) return
      
      const shouldForceTour = document.cookie.includes('start_tour=true') || searchParams.get('tour') === 'true'

      if (shouldForceTour) {
        // Clear cookie if present
        if (document.cookie.includes('start_tour=true')) {
            document.cookie = 'start_tour=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
        }
        
        // Reset tour completion so it runs fresh for this demo session
        resetTourCompletion()
        
        // Wait for Sidebar to hydrate and find a playlist to navigate to
        let attempts = 0
        const findAndNavigate = setInterval(() => {
            attempts++
            const firstPlaylistLink = document.querySelector('[data-tour="navigation"] a[href*="/playlist/"]') as HTMLAnchorElement
            
            if (firstPlaylistLink?.getAttribute('href')) {
                clearInterval(findAndNavigate)
                sessionStorage.setItem('tour_start_after_navigation', 'true')
                window.location.href = firstPlaylistLink.getAttribute('href')!
            } else if (attempts > 10) {
                // Give up after 5 seconds, start on home
                clearInterval(findAndNavigate)
                startTour(WELCOME_TOUR_STEPS)
                hasCheckedRef.current = true
            }
        }, 500)
        return
      }

      // For normal checks, require user
      if (!user) return

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
          setTimeout(() => {
            startTour(WELCOME_TOUR_STEPS)
            hasCheckedRef.current = true
          }, 500)
        } else {
          // Navigate to first playlist and start tour after navigation
          setTimeout(() => {
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
              hasCheckedRef.current = true
            }
          }, 500)
        }
      }
      
      // Check if we should start tour after navigation
      if (isTourInProgress() && typeof window !== 'undefined') {
        const shouldStart = sessionStorage.getItem('tour_start_after_navigation')
        if (shouldStart === 'true') {
          sessionStorage.removeItem('tour_start_after_navigation')
          setTimeout(() => {
            startTour(WELCOME_TOUR_STEPS)
            hasCheckedRef.current = true
          }, 1000)
        }
      }
    }

    // Check immediately
    supabase.auth.getUser().then(({ data: { user }, error }) => {
        if (user) {
            runTourCheck(user)
        } else {
            runTourCheck(null)
        }
    })

    // Listen for auth changes (this handles the latency issue)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (session?.user) {
            runTourCheck(session.user)
        }
    })

    return () => {
        subscription.unsubscribe()
    }
  }, [startTour, searchParams])

  return null
}
