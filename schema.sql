-- Project Schema for Wedding Playlist App

-- Profiles Table (Public User Data)
create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  display_name text,
  avatar_color text,
  tour_completed boolean default false,
  tour_completed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Profiles
alter table profiles enable row level security;
create policy "Public profiles are viewable by everyone" on profiles for select using (true);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- Trigger to handle new user signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name, avatar_color)
  values (
    new.id, 
    new.email, 
    split_part(new.email, '@', 1), -- Default name is email prefix
    '#6366f1' -- Default Indigo color
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Enable RLS
-- alter table auth.users enable row level security; -- (Commented out: requires superuser, usually already enabled)

-- Playlists Table
create table playlists (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  spotify_title text,
  description text,
  vibe text,
  spotify_id text,
  display_order integer,
  sync_timestamp timestamp with time zone,
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
  artist_spotify_uri text,
  album_spotify_uri text,
  duration_ms integer,
  rating integer default 0,
  status text check (status in ('active', 'suggested', 'rejected')) default 'suggested',
  position integer, -- for ordering within the playlist
  pinned_comment text,
  added_by uuid references auth.users(id),
  suggested_by text, -- user_id OR 'ai-assistant' for AI-generated suggestions
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

-- App Settings Table
create table app_settings (
  id uuid default gen_random_uuid() primary key,
  key text not null unique,
  value text,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for App Settings
alter table app_settings enable row level security;
create policy "App settings are viewable by everyone" on app_settings for select using (true);
create policy "Only authenticated users can update app settings" on app_settings for all using (auth.role() = 'authenticated');

-- Insert default app settings
insert into app_settings (key, value, description) values
  ('page_title', 'Dana & Justin Wedding Playlists', 'Title shown in browser tab'),
  ('homepage_text', 'Welcome to the Wedding Playlist Manager', 'Main heading text on homepage'),
  ('homepage_subtitle', 'Collaborate on the perfect playlist for the big day', 'Subtitle text on homepage')
on conflict (key) do nothing;
