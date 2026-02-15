# 🎵 Collaborative Playlist Manager

A modern web app for teams that want to **plan playlists together** with **full discussion, auditing, and clarity of changes**.

Ever tried to create a collaborative Spotify playlist with friends? You get chaos: duplicate suggestions, random deletions, no context for why songs were chosen, and no way to discuss before adding. **This app fixes that.**

## Why Use This Instead of Spotify Collaborative Playlists?

| Feature | Spotify Collab | This App |
|---------|---|---|
| **Comments & Discussion** | ❌ | ✅ Pin comments directly to songs |
| **Suggestions Before Adding** | ❌ | ✅ Suggest → Discuss → Approve workflow |
| **Full Audit Trail** | ❌ | ✅ See who changed what, when, and why |
| **AI Song Suggestions** | ❌ | ✅ Ask AI to find songs matching your vibe |
| **Reject & Revisit** | ❌ | ✅ Reject suggestions without losing them |
| **Quality Control** | ❌ | ✅ Approve songs before they're added |
| **Real-Time Sync** | ✅ | ✅ Instant updates for all users |
| **Mobile Support** | ✅ | ✅ Full mobile experience |

## Who Is This For?

This app is perfect for:

- 👰 **Wedding Planning** - Coordinate ceremony, reception, and dinner music with your partner and friends
- 🎉 **Event Playlists** - DJ a birthday party, corporate event, or road trip with full team input
- 🎓 **Club/Organization Curation** - Build a collective music library with discussion and voting
- 🎬 **Film/Project Soundtracks** - Collaborate on curated music for creative projects

**Key requirement**: You care about the final result and want **meaningful discussion** before music is added.

---

## Features

### 💬 Collaborative Discussion
- **Pin comments** on any song to highlight important context
- **Comment history** shows who said what and when
- Comments stay with the track so context is never lost

### 📊 Quality Control
- Add songs as **suggestions** first
- **Team reviews** before moving to active playlist
- **Reject** songs without losing them in the ether
- **Approve** when everyone agrees

### 🔍 Full Auditing
- Complete history of every change
- See **who** added, reordered, or rated each song
- Understand **why** decisions were made through comments
- Export audit logs for reference

### 🤖 AI-Powered Suggestions
- Describe the vibe: *"upbeat 80s rock"* or *"chill acoustic love songs"*
- AI finds matching tracks from Spotify
- Auto-adds to suggestions for team review

### ⭐ Rating System
- 5-star ratings for team feedback
- See at a glance what tracks need discussion

### 🔄 Real-Time Sync
- Changes appear instantly for all users
- No refresh needed
- Works on desktop and mobile

### 🎯 Spotify Integration
- Seed playlists from your existing Spotify playlists
- Sync new songs from Spotify without losing your curation
- Push final playlist back to Spotify

---

## Tech Stack

- **Frontend**: [Next.js 14](https://nextjs.org/) + [React 18](https://react.dev/) + [Tailwind CSS](https://tailwindcss.com/)
- **Backend**: [Supabase](https://supabase.com/) (PostgreSQL + Auth + Realtime)
- **APIs**: [Spotify Web API](https://developer.spotify.com/) + [Claude AI](https://claude.ai/)
- **Deployment**: [Vercel](https://vercel.com/) (one-click)
- **Drag & Drop**: [@hello-pangea/dnd](https://github.com/hello-pangea/dnd)

---

## Quick Start

### Prerequisites
- Node.js 18+
- Spotify Developer account
- Supabase account
- Vercel account (for deployment)

### Local Development

```bash
# 1. Clone and install
git clone <your-repo>
cd collaborative-playlist-manager
npm install

# 2. Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your Spotify and Supabase keys

# 3. Run dev server
npm run dev

# Open http://localhost:3000
```

### Full Setup Guide

See **[docs/SETUP.md](docs/SETUP.md)** for detailed instructions on:
- Setting up Supabase database
- Configuring Spotify integration
- Deploying to Vercel
- Adding users and playlists

---

## Environment Setup

Create `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Spotify
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SPOTIFY_REDIRECT_URI=http://localhost:3000/api/auth/spotify/callback

# AI
GOOGLE_GEMINI_API_KEY=your_gemini_api_key

# Admin Email
ADMIN_EMAIL=admin@example.com
```

See **[docs/SETUP.md](docs/SETUP.md)** for where to get each key.

---

## Deployment

### Vercel (Recommended)

```bash
git push  # Push to GitHub
# Go to vercel.com and import your repo
# Add environment variables
# Deploy!
```

Your app is live. Share the URL with your team.

See **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** for more options.

---

## Contributing

Found a bug? Have a feature idea? Issues and PRs welcome!

---

## License

[MIT](LICENSE)

---

## The Story

This app was built for real-world collaborative music planning. After struggling with Spotify's limited collaboration features, we built a tool that actually lets teams **discuss and decide together** on music.

Perfect for weddings, events, and any project where music matters and so does the team.

**Ready to plan together?** [Get Started](docs/SETUP.md)
