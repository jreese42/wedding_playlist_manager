# Playlist Fetch Instructions

This workspace includes a tool to fetch song lists from your actual Spotify playlists into your local Markdown plans.

## Prerequisites

1.  **Python**: Ensure you have Python installed.
2.  **Spotify API Credentials**: You need a `Client ID` and `Client Secret` from the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/).
    *   Create an app (e.g., "Wedding Playlist Sync").
    *   Get the Client ID and Client Secret.

## Setup

1.  **Install Dependencies**:
    Open a terminal in VS Code and run:
    ```bash
    pip install -r requirements.txt
    ```

2.  **Configure Environment**:
    You need to set your Spotify credentials as environment variables.
    
    **PowerShell (Windows):**
    ```powershell
    $env:SPOTIPY_CLIENT_ID="your_client_id_here"
    $env:SPOTIPY_CLIENT_SECRET="your_client_secret_here"
    ```
    
    **Bash/Mac/Linux:**
    ```bash
    export SPOTIPY_CLIENT_ID="your_client_id_here"
    export SPOTIPY_CLIENT_SECRET="your_client_secret_here"
    ```

3.  **Link Playlists**:
    Open each file in the `Playlists/` folder and replace `REPLACE_WITH_PLAYLIST_ID` in the header with the actual Spotify Playlist ID.
    *   *Example*: If your URL is `https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M`, the ID is `37i9dQZF1DXcBWIGoYBM5M`.

    ```yaml
    ---
    spotify_id: 37i9dQZF1DXcBWIGoYBM5M
    ---
    ```

## Running the Fetch

Once configured, run the script:

```bash
python fetch_playlists.py
```

## What it does

1.  **Reads** the Spotify Playlist.
2.  **Updates** the `## Song List` section in the Markdown file with the actual songs on Spotify.
3.  **Preserves** songs that were in the Markdown file but *not* on Spotify by moving them to a `## Suggested Additions` section.
4.  **Finds Links**: It attempts to find Spotify links for the suggested additions so you can easily listen and add them.
