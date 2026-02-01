// Tour Service - Uses localStorage for tour completion tracking
// Once database schema is updated with tour_completed field, this can be migrated to Supabase

const TOUR_STORAGE_KEY = 'wedding_playlist_tour_completed'
const TOUR_TIMESTAMP_KEY = 'wedding_playlist_tour_completed_at'
const TOUR_IN_PROGRESS_KEY = 'wedding_playlist_tour_in_progress'

/**
 * Mark tour as in progress to prevent re-triggering
 */
export function markTourInProgress() {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOUR_IN_PROGRESS_KEY, 'true')
  }
}

/**
 * Clear the in-progress flag
 */
export function clearTourInProgress() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOUR_IN_PROGRESS_KEY)
  }
}

/**
 * Check if tour is already in progress
 */
export function isTourInProgress(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  return localStorage.getItem(TOUR_IN_PROGRESS_KEY) === 'true'
}

/**
 * Mark tour as completed in localStorage
 * Will sync to Supabase once database schema is updated
 */
export function markTourAsCompleted() {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOUR_STORAGE_KEY, 'true')
    localStorage.setItem(TOUR_TIMESTAMP_KEY, new Date().toISOString())
    clearTourInProgress()
  }
}

/**
 * Reset tour completion status
 */
export function resetTourCompletion() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOUR_STORAGE_KEY)
    localStorage.removeItem(TOUR_TIMESTAMP_KEY)
    clearTourInProgress()
  }
}

/**
 * Check if user has completed the tour
 */
export function hasTourBeenCompleted(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  return localStorage.getItem(TOUR_STORAGE_KEY) === 'true'
}
