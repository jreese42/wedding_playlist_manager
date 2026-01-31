# Vercel Deployment Guide

There are two main ways to deploy your Next.js application to Vercel.

## Option 1: Git Integration (Recommended)

This is the standard "Zero-Config" deployment method.

1.  **Push to GitHub**: Ensure your project is pushed to a repository on GitHub (or GitLab/Bitbucket).
2.  **Connect to Vercel**:
    *   Go to [Vercel.com](https://vercel.com/dashboard) and sign up/log in.
    *   Click **"Add New..."** -> **"Project"**.
    *   Select your Git provider and find the `Dana Wedding Playlists` repository.
    *   **Import** the project.
3.  **Configure Project**:
    *   **Framework Preset**: Next.js (should detect automatically).
    *   **Root Directory**: `./` (since we moved everything to the root).
    *   **Environment Variables**: Add your Spotify Client ID/Secret and Supabase URL/Keys here.
4.  **Deploy**: Click Deploy. Vercel will now automatically redeploy whenever you push changes to the `main` branch.

## Option 2: Command Line (Manual Script)

You can also deploy directly from your VS Code terminal without pushing to Git first. This is what the `npm run deploy` script does.

### Prerequisites
You need to login to Vercel locally once:
```bash
npx vercel login
```

### 1. Preview Deployment
Creates a live URL for testing, but doesn't affect the main production domain.
```bash
npm run deploy:preview
```

### 2. Production Deployment
Builds and pushes the live version to your production domain.
```bash
npm run deploy
```

## Environment Variables
**Important:** Your local `.env` file is NOT uploaded to Vercel automatically for security reasons. You must enter these values in the Vercel Dashboard under **Settings > Environment Variables**.

Required Variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
