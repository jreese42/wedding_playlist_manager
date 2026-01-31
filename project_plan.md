Project Plan: Wedding Music & Planning Web App

A high-level roadmap for building a Spotify-inspired wedding planning dashboard for collaborative use between you, your sister (Dana), and her fiancé.

🏁 Project Overview

Objective: A private, interactive dashboard to collaboratively curate, rank, and order 6 specific wedding playlists.

Users: Admin (You), Sister (Dana), and Fiancé.

Core Aesthetic: Spotify-clone UI (Dark mode, sidebar navigation, glassmorphism) with mobile-responsive design.

🏗 Technical Architecture & Data Logic

1. The "Audit" Engine

To ensure every change is tracked:

Trigger-based Logging: Instead of just updating a song, the app calls a single function updateTrackWithLog(). This function performs the update AND inserts a row into the audit_log.

History View: When a user clicks a song, the app queries audit_log where track_id = X, ordered by timestamp DESC.

2. Spotify API Integration

Client-Side Search: The search box hits a Next.js API Route.

Server-Side Auth: The API route uses your CLIENT_ID and CLIENT_SECRET to get a temporary access token from Spotify to fetch song data/artwork.

3. Real-Time Sync

Supabase Realtime: We will enable "Realtime" on the tracks and audit_log tables. If you move a song, it will physically slide into the new position on Dana’s screen instantly.

🛠 Phase-by-Phase TODO List

Phase 1: Infrastructure & Auth

[ ] Initialize Next.js app with Tailwind CSS and Shadcn UI.

[ ] Set up Supabase Project and link to GitHub.

[ ] TODO: Configure Supabase Auth to only allow 3 specific email addresses (Allow-list).

[ ] TODO: Create a "Login" landing page that matches the Spotify aesthetic.

Phase 2: Database & Security (RLS)

[ ] Create playlists, tracks, audit_log, and interactions tables.

[ ] TODO: Write Postgres Row Level Security (RLS) rules so only authenticated users can edit.

[ ] TODO: Create a "Database Function" to calculate total playlist duration across all active songs.

Phase 3: The Spotify UI (Desktop & Mobile)

[ ] Build the Sidebar with the 6 wedding segments.

[ ] Build the SongRow component:

[ ] Drag handle (left side).

[ ] Artwork + Title/Artist.

[ ] Star Rating (interactive).

[ ] Metadata (Duration, Spotify Link).

[ ] "More Info" button (triggers History panel).

[ ] TODO: Implement "Mobile Mode": Switch from a table view to a stack view for better touch targets.

[ ] TODO: Implement @hello-pangea/dnd for smooth reordering on both mouse and touch.

Phase 4: Features & Business Logic

[ ] The "Soft Delete" Logic: Code the button to change status from active to suggested and log the move.

[ ] Spotify Search: Build the search input with "Type-to-search" debouncing (waits 300ms before hitting API).

[ ] History Sidebar: Build a slide-out panel that displays a chronological feed of logs for a specific song.

Phase 5: Final Polish & Deployment

[ ] Connect Spotify API to fetch high-res album art.

[ ] Add "Glassmorphism" effects (blurred backgrounds) to the sidebar and player bar.

[ ] Deploy to Vercel and verify environment variables.

[ ] TODO: Performance test—ensure reordering 50+ songs doesn't lag the UI.

📱 Mobile UX Specifics

Touch Targets: Ensure the "Delete" and "Star" buttons are at least 44x44 pixels.

Context Menus: On mobile, instead of a "More Info" button, consider a long-press or a simple "tap for details" to save screen real estate.

Duration Display: Total duration should be pinned to the top header so it's always visible while scrolling.

📈 Success Metrics (Requirements Check)

[ ] Multi-User: Logs show "User X did Y".

[ ] Audit Trail: Every reorder event is saved in the History panel.

[ ] No Silent Deletions: "Deleted" songs appear in the Suggestions footer.

[ ] Live Sync: Changes appear on other devices within <1 second.