# Spotify Sync Re-enablement Plan

## Background

The Spotify sync feature was previously built but disabled when Spotify's API went down temporarily. Since then, Spotify has released breaking API changes (February 2026). This plan covers re-enabling sync with full compliance to the new API.

## Spotify API Changes (Feb 2026) — Impact on This Project

### Endpoint Renames (Breaking)

All playlist track endpoints have been renamed from `/tracks` to `/items`:

| Old (REMOVED)                          | New (ADDED)                         | Our Usage                    |
|----------------------------------------|-------------------------------------|------------------------------|
| `GET /playlists/{id}/tracks`           | `GET /playlists/{id}/items`         | Read playlist tracks         |
| `POST /playlists/{id}/tracks`          | `POST /playlists/{id}/items`        | Add tracks to playlist       |
| `DELETE /playlists/{id}/tracks`        | `DELETE /playlists/{id}/items`      | Remove tracks from playlist  |
| `PUT /playlists/{id}/tracks`           | `PUT /playlists/{id}/items`         | Reorder/replace tracks       |

### Field Renames (Breaking)

Response objects renamed: `tracks` → `items`, `tracks.track` → `items.item`.

### Playlist Items Only Returned for Owner

> "Will only return an items object for the user's playlist, other playlists will only provide metadata."

This means Client Credentials flow (app-level, no user context) **cannot read playlist tracks at all**. All operations must use the admin's OAuth token, and the **admin's Spotify account must own the playlists**.

### Unaffected Endpoints We Use

- `GET /search` — still available, unchanged
- `GET /playlists/{id}` — still available (metadata only for non-owner)
- `POST /me/playlists` — still available
- OAuth token exchange & refresh — unchanged

## Library Decision: `spotify-web-api-node`

- **Current version**: 5.0.2 (last published January 2021, abandoned)
- **`@spotify/web-api-ts-sdk`**: Official Spotify SDK, last release v1.2.0 (Jan 2024), also not updated for Feb 2026
- **Neither library supports the new `/items` endpoints**

### Decision: Hybrid Approach

1. **Keep `spotify-web-api-node`** for OAuth flow (token exchange, refresh) and `searchTracks()` (`GET /search` is unchanged)
2. **Write a thin `spotifyFetch()` wrapper** for all playlist item operations using raw `fetch()` calls to the new `/items` endpoints
3. This avoids a risky full-library swap while ensuring we use the correct new endpoints

## Architecture Changes

### Token Management (Currently Broken)

**Before**: In-memory singleton variables, volatile, no refresh logic
**After**: Tokens stored in `spotify_tokens` DB table, auto-refresh on expiry

### Client Architecture (Currently Broken)

**Before**: Dual-client (Client Credentials for read, OAuth for write)
**After**: Single admin OAuth client for everything. Client Credentials removed for playlist ops. Search can still use Client Credentials since it doesn't require user context.

### Sync Directions

| Direction | Trigger | Priority |
|---|---|---|
| **Webapp → Spotify** | Instant, on every user action (add/remove/reorder track) | Primary |
| **Spotify → Webapp** | On playlist page load | Secondary (error recovery) |

## Implementation Tasks (Ordered)

### Phase 1: Infrastructure

1. **DB: `spotify_tokens` table** — schema + migration SQL
2. **Rewrite `spotify.ts`** — DB-backed tokens, auto-refresh, `spotifyFetch()` wrapper
3. **Update OAuth callback** — persist tokens to DB, admin-only guard

### Phase 2: Core Sync

4. **Update all Spotify API calls** — switch to `/items` endpoints, fix field names
5. **Re-enable write functions** — `addTrackToSpotify`, `removeTrackFromSpotify`, `reorderTracksInSpotify`
6. **Update `admin/actions.ts`** — use new API for bulk sync

### Phase 3: UI

7. **Admin: Spotify connection card** — connect/disconnect, status display
8. **SyncStatus component** — replace "Coming Soon" with real button
9. **On-load sync** — background Spotify→Webapp sync on playlist page load

### Phase 4: Documentation

10. **Update docs** — admin-must-own-playlists, Spotify setup requirements

## New DB Table

```sql
CREATE TABLE spotify_tokens (
    id INT PRIMARY KEY DEFAULT 1,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    spotify_user_id TEXT,
    spotify_display_name TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT single_row CHECK (id = 1)
);
```

Single-row table (one admin account). RLS enabled with NO public policies — only service role can access.

## Key Requirements

- **Admin must own all Spotify playlists** being managed
- Spotify API access is an admin-only feature (OAuth login on Admin page)
- All sync operations use the admin's persisted OAuth token
- Token auto-refreshes when expired
- Webapp remains fully functional if Spotify is not connected (sync simply skipped)
