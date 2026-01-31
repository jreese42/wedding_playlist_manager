-- Project Schema for Wedding Playlist App

-- Enable RLS
alter table auth.users enable row level security;

-- Playlists Table
create table playlists (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  vibe text,
  spotify_id text,
  display_order integer,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tracks Table
create table tracks (
  id uuid default gen_random_uuid() primary key,
  playlist_id uuid references playlists(id) on delete cascade,
  title text not null,
  artist text not null,
  album text,
  artwork_url text,
  spotify_uri text,
  duration_ms integer,
  status text check (status in ('active', 'suggested', 'rejected')) default 'suggested',
  position integer, -- for ordering within the playlist
  added_by uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Audit Log Table
create table audit_log (
  id uuid default gen_random_uuid() primary key,
  track_id uuid references tracks(id) on delete cascade,
  user_id uuid references auth.users(id),
  action text not null, -- 'move', 'add', 'status_change', 'edit'
  details jsonb, -- store old_position, new_position, etc.
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies (Draft)
alter table playlists enable row level security;
create policy "Allow read access to everyone" on playlists for select using (true);
create policy "Allow write access to authenticated users" on playlists for all using (auth.role() = 'authenticated');

alter table tracks enable row level security;
create policy "Allow read access to everyone" on tracks for select using (true);
create policy "Allow write access to authenticated users" on tracks for all using (auth.role() = 'authenticated');

alter table audit_log enable row level security;
create policy "Allow read access to everyone" on audit_log for select using (true);
create policy "Allow insert access to authenticated users" on audit_log for insert using (auth.role() = 'authenticated');
