-- Project Schema for Wedding Playlist App

-- Enable RLS
-- alter table auth.users enable row level security; -- (Commented out: requires superuser, usually already enabled)

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
  rating integer default 0,
  status text check (status in ('active', 'suggested', 'rejected')) default 'suggested',
  position integer, -- for ordering within the playlist
  pinned_comment text,
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
create policy "Allow insert access to authenticated users" on audit_log for insert with check (auth.role() = 'authenticated');

-- Function to reorder tracks and log the change
create or replace function reorder_track(
  p_track_id uuid,
  p_new_position int,
  p_old_position int,
  p_playlist_id uuid,
  p_user_id uuid
) returns void as $$
begin
  -- 1. Shift neighbors
  if p_old_position < p_new_position then
    -- Moving down (e.g. 1 -> 3). Shift 2,3 -> 1,2
    update tracks 
    set position = position - 1
    where playlist_id = p_playlist_id
      and position > p_old_position 
      and position <= p_new_position;
  elsif p_old_position > p_new_position then
    -- Moving up (e.g. 3 -> 1). Shift 1,2 -> 2,3
    update tracks 
    set position = position + 1
    where playlist_id = p_playlist_id
      and position >= p_new_position 
      and position < p_old_position;
  end if;

  -- 2. Update the target track
  update tracks 
  set position = p_new_position 
  where id = p_track_id;

  -- 3. Log to Audit
  insert into audit_log (track_id, user_id, action, 'move', jsonb_build_object('from', p_old_position, 'to', p_new_position));
end;
$$ language plpgsql;
