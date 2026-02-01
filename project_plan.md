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

[x] **History Panel**: Tapping a song slides open a right-side panel showing its audit log history.

[x] **Comments**: Track a list of comments by users on the tracks. Show these comments in the History panel. Allow a user to make a comment from in the history panel. The comments should be in line with other history, so we can see a scrolling log like "Dana commented I dont like this song" "Dana removed this song"

[x] **Play Song**: A play button on each track opens the song in the external Spotify app via a URI. It should open to show the song selected within the playlist.

[ ] **Notifications Panel**: Add a notifications panel, present a review of ALL recent events across all songs to allow for quick catch up with additions, deletions, reordering, and comments.

[ ] **Display Who Added or Suggested By User**: In the track view, display which user added or suggested the song originally. Note the connection with the AI Assistant feature, there is one bonus valid "user" which is that it was suggested by the AI Assistant.

[ ] Real User Names: Modify the user list to allow for adding a real name, which is used in display instead of the user login. So I can show 'Dana', 'Kyle', or 'James' in Activity History and 'Who added this song' views.

[x] Implement @hello-pangea/dnd for smooth reordering on mouse and touch.

Phase 4: Admin & Features

[x] Admin Panel: Build a hidden/protected route for jreese with the "Sync from Spotify" button.

[x] The Sync Script: Write the logic to fetch Spotify tracks, filter for new IDs, and append them with the next available position index.

[x] The "Soft Delete" Logic: Code the button to change status from active to suggested and log the move.

[ ] Spotify Search: Build the search input for manual additions. This appears as a search bar underneat the song list but above the Suggestions list. Searching there will search spotify and present the top song options. Tapping one will add that song to the song list at the bottom. Tapping 

Phase 5: Final Polish & Deployment

[x] Connect Spotify API and handle OAuth tokens for the jreese account. (Implemented via Client Creds)

[x] Add "Glassmorphism" effects to the sidebar and player bar.

[x] Deploy to Vercel.

Phase 6: Optional Future Features

[ ] **Publish Playlists**: A sidebar button that pushes the current playlist order to the real Spotify playlist. This action first syncs from Spotify, adding any new remote tracks as 'suggestions' to avoid data loss, then overwrites the Spotify playlist with the app's tracklist and order. his is a button in the left sidebar which will cause the playlists to be published out to Spotify. Important: when this happens, it should then automatically sync the playlist back. This takes the webapp song list and outputs it to the spotify playlist. If songs exist in the real spotify playlist but not in song list, it should automatically pull those in as suggestions first so they are not lost.

[ ] **Publish Playlists Automatically**: Extend upon the Publish Playlists optional feautre so that this process is entirely automatic. Periodically while the page is loaded, fetch the playlist from spotify and update the database. Any 'new' items in spotify not in the database already should be marked as suggested. Then, automatically publish the playlist back out to spotify any time it changes including ordering or song list. Be careful to avoid data loss as a result of pushing songs to the list and overwriting without having immediately synced inward before. This should also perform an infrequent update of the playlist metadata like name, artwork, description, etc. 

[ ] **AI Assistant**: A button on each playlist opens a chat window with a Gemini-powered AI assistant. The assistant is pre-prompted to suggest 5-10 new songs based on the playlist's vibe and user requests. Accepted suggestions are added to the 'suggestions' list, flagged with a ✨ emoji to indicate they are AI-generated. here is a button on the playlist which opens a text window to chat with an AI assistant. This is connected to Google Gemini and is conviged for the environment with an API key. There is a default prompt set up which tells the assistant it should help suggest 5-10 new songs based on the users request. The user can make a request, and the agent will suggest songs, search for them on spotify, and insert them into the suggested songs. It should flag these songs as AI suggesstions with a small sparkle emoji, which is distinct from the normal 'Suggestion' indicator. The tracks suggested by the AI Assistant should be stored in the database as 'suggested', but with a new field tracking who suggested the track by user. The AI Assistant should have a special value there, which is used to know when the AI suggested the song by user. Display this as 'AI Assistant' in the fields showing who added the song, and when this is present also change the 'Suggested' text on the page to show 'AI Suggestion' with a sparkle emoji and rainbow text.

[ ] **Page Tour Onboarding**: Add an onboarding feature the first time a user logs in that shows a page tour. Explain to the user how to see playlists, reorder add and remove songs, review recommendations, use the AI assistant, and rate songs. Include a button to trigger the tour again.

[ ] More Clickable Links: When storing a track in the database, also store links to the artist so the artist name can be clickable and opens the artist profile in spotify.

[x] Pinned Comment: Allow for pinning one comment from the history of a song. When a comment is pinned, it should appear directly in the track view row without needing to open the activity panel. This is useful to clearly tag some songs with a short comment like 'First Dance Song'.

[ ] Improve Homescreen: The current home screen is not very useful or beautiful. Improve it to be more elegant and useful.

📱 Mobile UX Specifics

Touch Targets: Buttons at least 44x44 pixels.

Context Menus: Long-press or info-tap for the History panel on mobile.

Duration Display: Pinned to the top header.

📈 Success Metrics (Requirements Check)

[ ] Admin Sync: jreese can pull in new songs from real Spotify playlists without ruining custom ordering.

[ ] Multi-User Audit: Logs show "Dana moved SONG_NAME from pos 10 to 14".

[x] No Silent Deletions: "Deleted" songs move to the Suggestions list automatically.

[ ] Live Sync: Instant updates across all active users.