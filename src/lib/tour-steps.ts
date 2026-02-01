import { TourStep } from '@/lib/tour-context'

export const WELCOME_TOUR_STEPS: TourStep[] = [
  {
    id: 'navigation',
    title: 'Navigation',
    description:
      'The left sidebar shows all available playlists. Click any playlist to edit it. You can also access your profile settings from here.',
    targetSelector: '[data-tour="navigation"]',
    position: 'right',
    highlightPadding: 8,
  },
  {
    id: 'playlist-view',
    title: 'Playlist Editor',
    description:
      'This is where you edit a playlist. You can view active tracks, manage suggestions, and organize everything for this specific playlist.',
    targetSelector: '[data-tour="playlist-header"]',
    position: 'right',
    highlightPadding: 12,
  },
  {
    id: 'track-row',
    title: 'Songs',
    description:
      'Click a song row to view its activity and comments. Rate with stars. Use the play icon to preview. Drag rows to reorder the playlist. Delete with the trash icon.',
    targetSelector: '[data-tour="track-row"]',
    position: 'right',
    highlightPadding: 4,
  },
  {
    id: 'activity-view',
    title: 'Activity & Comments',
    description:
      'When you click a song, its activity panel opens here. View comments from collaborators, leave your own, and see pinned important messages.',
    targetSelector: '[data-tour="activity-panel"]',
    position: 'left',
    highlightPadding: 0,
    showHighlight: false,
    onEnter: () => {
      // Click first track to open activity panel
      if (typeof window !== 'undefined') {
        const firstTrack = document.querySelector('[data-tour="track-row"]')
        if (firstTrack instanceof HTMLElement) {
          firstTrack.click()
        }
      }
    },
    onExit: () => {
      // Close activity panel when exiting this step
      if (typeof window !== 'undefined') {
        // Try multiple selectors to find the close button
        const closeButton = 
          document.querySelector('[data-tour="activity-panel"] button:first-of-type') ||
          document.querySelector('[data-tour="activity-panel"] button[class*="top"]') ||
          document.querySelector('[data-tour="activity-panel"] [class*="close"]')
        
        if (closeButton instanceof HTMLElement) {
          closeButton.click()
        }
      }
    },
  },
  {
    id: 'add-songs',
    title: 'Add Songs',
    description:
      "Use the search bar to add new songs to the active playlist. Search by song title, artist, or album name.",
    targetSelector: '[data-tour="add-songs-bar"]',
    position: 'bottom',
    highlightPadding: 8,
  },
  {
    id: 'suggested-songs',
    title: 'Suggestions',
    description:
      'Songs suggested by collaborators appear here. Click the + button to add them to the active playlist, or click the trash icon to reject them.',
    targetSelector: '[data-tour="suggested-section"]',
    position: 'top',
    highlightPadding: 8,
  },
]
