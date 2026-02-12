# Demo Mode Setup Guide

This document outlines the steps required to configure and enable the "Demo Mode" feature for the application. This mode uses a separate, isolated Supabase database that can be reset, allowing for safe demonstrations without affecting production data.

## Step 1: Create a New Supabase Project

1.  Navigate to your [Supabase Dashboard](https://supabase.com/dashboard/projects).
2.  Click **"New project"** and create a new project. This will serve as your Demo Database.
3.  Keep the project details (URL, API Keys) handy for the next step.

## Step 2: Configure Environment Variables

1.  Locate the `.env.local.example` file in the project root, and make a copy named `.env.local` if you don't have one already.
2.  Open your **Demo Project** in the Supabase dashboard.
3.  Go to **Project Settings > API**.
4.  Find the following values and add them to your `.env.local` file:
    *   `NEXT_PUBLIC_DEMO_SUPABASE_URL`: Use the **Project URL**.
    *   `NEXT_PUBLIC_DEMO_SUPABASE_ANON_KEY`: Use the **Project API key** (the `anon` `public` key).
    *   `DEMO_SERVICE_ROLE_KEY`: Use the **Project API key** (the `service_role` `secret` key).

Your file should have a section that looks like this:

```dotenv
# Demo Database Connection (Optional)
NEXT_PUBLIC_DEMO_SUPABASE_URL=your_demo_project_url
NEXT_PUBLIC_DEMO_SUPABASE_ANON_KEY=sb_publishable_your_demo_key_here
DEMO_SERVICE_ROLE_KEY=your_demo_service_role_key_here
# Credentials for the generic user that is auto-logged-in for the demo.
# Ensure this user exists in your Demo Database's `auth.users` table.
DEMO_USER_EMAIL="demo@example.com"
DEMO_USER_PASSWORD="your_secure_demo_password"```

## Step 3: Set Up the Database Schema

You need to run two SQL scripts against your **new Demo Database**.

1.  In the Supabase dashboard for your demo project, go to the **SQL Editor**.
2.  Click **"New query"**.
3.  **Run `schema.sql`:**
    *   Open the `schema.sql` file from the project root.
    *   Copy its entire contents into the Supabase SQL Editor.
    *   Click **"RUN"**. This creates the main application tables (`playlists`, `tracks`, etc.).
4.  **Run `demo_setup.sql`:**
    *   Create another new query.
    *   Open the `demo_setup.sql` file from the project root.
    *   Copy its entire contents into the editor.
    *   Click **"RUN"**. This adds the special tables, functions, and **security policies (RLS)** required for the demo reset feature.

## Step 4: Create the Initial Demo State (Checkpoint)

Before the demo can be used, you must create a "checkpoint" — the clean state that the demo will reset to.

1.  **Start the application** locally (e.g., `npm run dev`).
2.  Navigate to the login page and click **"Enter Demo Mode"**.
3.  **Create an Admin User:** You will likely be redirected to the login page for the demo instance. You must sign up with a new user account. Then, you will need to manually elevate this user to an "admin" role directly in the Supabase table (`profiles.role`).
4.  **Log In as Admin:** Sign in to the demo using your newly created admin credentials.
5.  **Set Up Content:**
    *   Use the Admin Dashboard tools (like "Seed Playlists" and "Sync Tracks") to populate the demo with data.
    *   Add some ratings, comments, and reorder tracks to create a rich starting state for your demo.
6.  **Save the Checkpoint:**
    *   Navigate to the **Admin Dashboard**.
    *   A button **"Save Current State as Checkpoint"** will be visible because you are in Demo Mode. Click it.

Your demo is now ready! Any user who enters Demo Mode will start with the state you just saved, and it will automatically reset 5 minutes after their session ends.
