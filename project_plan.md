Project Plan: Wedding Music & Planning Web App

A high-level roadmap for building a Spotify-inspired wedding planning dashboard for collaborative use between you, your sister (Dana), and her fiancé.

🏁 Project Overview

Objective: A private, interactive dashboard to collaboratively curate, rank, and order 6 specific wedding playlists.

Users: Admin (jreese), Sister (Dana), and Fiancé.

Core Aesthetic: Spotify-clone UI (Dark mode, sidebar navigation, glassmorphism) with mobile-responsive design.

🏗 Technical Architecture & Data Logic

1. The "Audit" Engine

To ensure every change is tracked:

Trigger-based Logging: Instead of just updating a song, the app calls a single function updateTrackWithLog(). This function performs the update AND inserts a row into the audit_log.

History View: When a user clicks a song, the app queries audit_log where track_id = X, ordered by timestamp DESC.

2. The "Sync" Engine (Admin Only)

To bridge the gap between "Real" Spotify and the Web App:

Manual Trigger: A protected button available only to jreese that triggers a sync script.

Delta Sync Logic: The script fetches the current songs from the linked Spotify Playlist ID. It compares them against the database.

Append-Only: Any song found on Spotify that is not in the web app database is added to the end of the list.

Order Preservation: The script must not alter existing position indexes in the web app to avoid overwriting Dana's custom sorting.

3. Real-Time Sync

Supabase Realtime: Enable "Realtime" on the tracks and audit_log tables. Changes slide into position on other users' screens instantly.

🛠 Phase-by-Phase TODO List

Phase 1: Infrastructure & Auth

[x] Initialize Next.js app with Tailwind CSS and Shadcn UI.

[x] Set up Supabase Project and link to GitHub.

[x] Configure Supabase Auth to only allow the 3 specific email addresses. (Implemented via Middleware)

[x] Designate jreese as the super-user in the user metadata. (Implemented via Admin Client checks)

Phase 2: Database & Security (RLS)

[x] Create playlists (add spotify_playlist_id column), tracks, audit_log, and interactions tables.

[x] Write RLS rules: All users can Read/Write tracks, but only jreese can trigger the Sync Function.

[x] Create a Database Function to calculate total playlist duration. (Done in UI dynamically)

Phase 3: The Spotify UI (Desktop & Mobile)

[x] Build the Sidebar with the 6 wedding segments.

[x] Build the SongRow component:

[x] Drag handle, Artwork, Title/Artist, Star Rating, Metadata.

[ ] "History" button for the audit trail.

[x] Implement @hello-pangea/dnd for smooth reordering on mouse and touch.

Phase 4: Admin & Features

[x] Admin Panel: Build a hidden/protected route for jreese with the "Sync from Spotify" button.

[x] The Sync Script: Write the logic to fetch Spotify tracks, filter for new IDs, and append them with the next available position index.

[ ] The "Soft Delete" Logic: Code the button to change status from active to suggested and log the move.

[ ] Spotify Search: Build the search input for manual additions.

Phase 5: Final Polish & Deployment

[x] Connect Spotify API and handle OAuth tokens for the jreese account. (Implemented via Client Creds)

[x] Add "Glassmorphism" effects to the sidebar and player bar.

[ ] Deploy to Vercel.

📱 Mobile UX Specifics

Touch Targets: Buttons at least 44x44 pixels.

Context Menus: Long-press or info-tap for the History panel on mobile.

Duration Display: Pinned to the top header.

📈 Success Metrics (Requirements Check)

[ ] Admin Sync: jreese can pull in new songs from real Spotify playlists without ruining custom ordering.

[ ] Multi-User Audit: Logs show "Dana moved SONG_NAME from pos 10 to 14".

[ ] No Silent Deletions: "Deleted" songs move to the Suggestions list automatically.

[ ] Live Sync: Instant updates across all active users.