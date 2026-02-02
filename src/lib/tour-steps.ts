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
      'When you click a song, its activity panel opens here. View comments from collaborators and leave your own.',
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
  },
  {
    id: 'pinned-comments',
    title: 'Pin Important Comments',
    description:
      'In the activity panel, click the pin icon next to any comment to pin it. Pinned comments appear directly in the playlist view so everyone sees important notes about that song.',
    targetSelector: '[data-tour="activity-panel"]',
    position: 'left',
    highlightPadding: 0,
    showHighlight: false,
    onExit: () => {
      // Close activity panel when exiting this step
      if (typeof window !== 'undefined') {
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
    id: 'ai-assistant',
    title: 'AI-Powered Song Suggestions',
    description:
      'Need help finding songs? Click the sparkle icon (✨) to open the AI Assistant. Tell it what kind of songs you want—describe the mood, artist, genre, or vibe—and it will suggest songs to add to the playlist automatically.',
    targetSelector: '[data-tour="add-songs-bar"]',
    position: 'bottom',
    highlightPadding: 8,
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
