# Collaborative Playlist App - Setup Guide

This guide walks you through setting up the Collaborative Playlist App from scratch, including database configuration, environment setup, and deployment.

## Prerequisites

- Node.js 18+ and npm/yarn
- A GitHub account
- A Spotify Developer account (for API access)
- A Vercel account (for deployment)

---

## Step 1: Database Setup (Supabase)

### 1.1 Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up or log in
2. Click "New Project"
3. Choose a project name (e.g., "collaborative-playlist")
4. Set a database password (save this securely)
5. Select a region closest to your users
6. Click "Create new project"

### 1.2 Load the Database Schema

1. From your Supabase dashboard, go to the **SQL Editor**
2. Click "New Query"
3. Copy and paste the contents of `schema.sql` from the project root
4. Click "Run"
5. Verify all tables are created:
   - `profiles` - User profile information
   - `playlists` - Playlist metadata
   - `tracks` - Individual songs with status (active/suggested/rejected)
   - `audit_log` - Complete history of all changes
   - `playlist_collaborators` - Track who can access which playlists

### 1.3 Set Up Row-Level Security (RLS)

1. In Supabase, go to **Authentication > Policies**
2. For each table, enable RLS by clicking the toggle
3. The policies are pre-configured in `schema.sql` to:
   - Allow users to only see playlists they're a collaborator on
   - Prevent unauthorized data access
   - Allow admins full access

This enables instant updates across all connected clients.

---

## Step 2: Spotify Integration

### 2.1 Create a Spotify Developer App

1. Go to [developer.spotify.com](https://developer.spotify.com/dashboard)
2. Sign up or log in with your Spotify account
3. Click "Create an App"
4. Accept the terms and create the app
5. You'll receive:
   - **Client ID**
   - **Client Secret** (keep this private!)

### 2.2 Configure Redirect URIs

1. In your Spotify app settings, click "Edit Settings"
2. Add Redirect URIs:
   - `http://localhost:3000/api/auth/spotify/callback` (local development)
   - `https://yourdomain.com/api/auth/spotify/callback` (production)
3. Click "Save"

### 2.3 Important: Admin Must Own Playlists

The Spotify API (as of February 2026) only returns playlist items for playlists **owned by the authenticated user**. This means:

- The admin account that connects Spotify on the Admin Dashboard must be the **owner** of all linked Spotify playlists.
- If playlists are owned by a different Spotify account, transfer ownership or recreate them under the admin's account.
- The admin connects via the **Admin Dashboard → Spotify Connection** card. Tokens are stored in the database and auto-refresh.
- Only one Spotify account can be connected at a time (single admin token).

---

## Step 3: Environment Configuration

### 3.1 Create `.env.local`

In the project root, create a file named `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Spotify
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here
SPOTIFY_REDIRECT_URI=http://localhost:3000/api/auth/spotify/callback

# Admin Email (the email that will have admin privileges)
ADMIN_EMAIL=admin@example.com
```

### 3.2 Get Supabase Keys

1. Go to **Settings > API** in your Supabase project
2. Copy **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
3. Copy **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Copy **service_role secret** → `SUPABASE_SERVICE_ROLE_KEY`

### 3.3 Set Your Admin Email

1. In `.env.local`, set `ADMIN_EMAIL` to the email address that should have admin privileges
2. This is typically your own email
3. You can change this later in Supabase

---

## Step 4: User Account Setup

### 4.1 Configure Auth Allowlist

1. In Supabase, go to **Authentication > Providers > Email**
2. Enable "Email Provider"
3. Go to **Configuration > Auth > Email**
4. Under "Email Provider Settings", enable "Require email verification"

### 4.2 Create User Accounts

1. Go to **Authentication > Users** in Supabase
2. Click "Invite user"
3. Enter each collaborator's email address
4. They will receive an email to set their password
5. Once they log in, their profile is automatically created

### 4.3 Set Admin Status

Users with the `ADMIN_EMAIL` in `.env.local` will automatically have admin privileges. To verify:

1. In Supabase, go to **Authentication > Users**
2. Click on a user to see their metadata
3. Admin users should have `is_admin: true` in their metadata

---

## Step 5: Local Development

### 5.1 Install Dependencies

```bash
npm install
# or
yarn install
```

### 5.2 Run Development Server

```bash
npm run dev
# or
yarn dev
```

The app will be available at `http://localhost:3000`

### 5.3 Test Authentication

1. Go to `http://localhost:3000`
2. You'll be redirected to the login page
3. Use one of the emails you invited in Step 4.2
4. Check your email for the verification link
5. Set your password and log in

---

## Step 6: Initial App Configuration

### 6.1 Add Your First Playlist

1. Log in with your admin account
2. Click "Edit Playlists" in the sidebar
3. Click "Add Playlist"
4. Enter:
   - **Playlist Name** (e.g., "Reception Music")
   - **Vibe/Description** (e.g., "High-energy dance songs")
   - **Spotify Playlist URI** (get from Spotify: right-click playlist → Share → Copy Playlist URI)
5. Click "Create"
6. The app will automatically fetch songs from the Spotify playlist

### 6.2 Configure Playlist Collaborators

1. In the admin settings, go to **Playlist Management**
2. Select a playlist
3. Add collaborators by their email addresses
4. They'll have access to view and edit that playlist

### 6.3 Test Features

- Add a song via the search bar
- Use the AI Assistant (sparkle icon) to get song suggestions
- Try pinning a comment on a track
- Check the activity panel to see the audit log
- Verify real-time updates by opening the app in two browser windows

---

## Step 7: Deployment (Vercel)

### 7.1 Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/collaborative-playlist.git
git push -u origin main
```

### 7.2 Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and log in with GitHub
2. Click "New Project"
3. Select your repository
4. Configure environment variables:
   - Add all variables from `.env.local` to Vercel
   - Leave `NEXT_PUBLIC_` variables as-is (they're automatically public)
5. Click "Deploy"

### 7.3 Configure Production URLs

1. In Spotify Developer Dashboard, update Redirect URI:
   - Add `https://your-vercel-url.vercel.app/callback`

2. In Supabase, go to **Authentication > URL Configuration**:
   - Add `https://your-vercel-url.vercel.app` to Allowed redirect URLs

3. Update `NEXT_PUBLIC_SUPABASE_URL` in Vercel with your production URL

---

## Step 8: Post-Deployment Checklist

- [ ] Test login with a non-admin user account
- [ ] Verify Spotify sync works (add a playlist with a Spotify URI)
- [ ] Test real-time updates with multiple users
- [ ] Verify all email invitations are working
- [ ] Check that activity logs are recording changes
- [ ] Test the AI Assistant with Claude API access
- [ ] Verify backup/export functionality (if implemented)

---

## Troubleshooting

### "No authorized user found"

**Solution**: Make sure your email is in the Supabase Users list. Invite yourself from the Auth panel.

### Spotify sync returns empty results

**Solution**: 
1. Verify the Spotify playlist URI is correct
2. Check that the playlist is public or collaborative
3. Verify Spotify API credentials in environment variables

### Real-time updates not working

**Solution**:
1. In Supabase, verify Realtime is enabled on `tracks` and `audit_log` tables
2. Check browser console for WebSocket connection errors
3. Verify `NEXT_PUBLIC_SUPABASE_URL` is correct

### Users can't log in

**Solution**:
1. Verify email addresses are invited in Supabase Auth
2. Check that "Email Provider" is enabled
3. Verify email is not already taken (unique constraint)

---

## Security Notes

- Never commit `.env.local` to version control
- Keep `SUPABASE_SERVICE_ROLE_KEY` secret (only on backend/Vercel)
- `NEXT_PUBLIC_` variables are public and safe to expose
- Use HTTPS only in production
- Regularly review user access in Supabase
- Keep Spotify credentials updated if they expire

---

## Next Steps

- Configure admin settings for app title and branding
- Set up automated backups
- Configure email notifications
- Invite collaborators to start using the app
- Monitor activity logs for any issues
