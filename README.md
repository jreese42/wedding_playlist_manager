# Collaborative Music Planning App

This is a private, web-based dashboard designed to help collaboratively plan the music for a wedding. It provides a Spotify-inspired interface where a small group of approved users can curate, reorder, and rate songs across six distinct wedding playlists.

*   **Collaborative Playlisting**: Multiple users can view and edit playlists in real-time.
*   **Drag-and-Drop Reordering**: Intuitively change the song order for each playlist.
*   **Song Ratings**: A 5-star rating system to gather feedback on each track.
*   **Suggestions & History**: "Deleted" songs are moved to a suggestions list for review, and a full audit trail tracks every change.
*   **Spotify Integration**: Playlists are seeded and synced from existing Spotify playlists.

*   **Frontend**: [Next.js](https://nextjs.org/) with [React](https://reactjs.org/) and [Tailwind CSS](https://tailwindcss.com/) for a dynamic, server-rendered application.
*   **Backend & Database**: [Supabase](https://supabase.io/) provides the PostgreSQL database, user authentication, and real-time capabilities.
*   **Authentication**: Secure authentication is handled by Supabase, limited to a specific allowlist of users.
*   **Deployment**: The application is designed for easy deployment on [Vercel](https://vercel.com/).

## Design Principles

1.  **The "Audit" Engine**: Every significant action (reordering, rating, status change) is logged in an `audit_log` table, providing a complete history of changes for each track.
2.  **The "Sync" Engine**: An admin-only feature allows for pulling in the latest tracks from a linked Spotify playlist, appending new songs without disrupting the existing curated order.
3.  **Real-Time Sync**: Leveraging Supabase Realtime, any changes made by one user are instantly reflected on the screens of all other active users without needing a page refresh.
