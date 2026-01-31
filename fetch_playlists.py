import os
import glob
import re
import frontmatter
import spotipy
from spotipy.oauth2 import SpotifyClientCredentials
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# --- Configuration ---
# Set these environment variables before running, or hardcode them here (not recommended for sharing)
SPOTIPY_CLIENT_ID = os.getenv('SPOTIPY_CLIENT_ID')
SPOTIPY_CLIENT_SECRET = os.getenv('SPOTIPY_CLIENT_SECRET')

# If you have private playlists, you might need SpotifyOAuth instead of SpotifyClientCredentials
# from spotipy.oauth2 import SpotifyOAuth
# auth_manager = SpotifyOAuth(scope="playlist-read-private", ...)

def get_spotify_client():
    if not SPOTIPY_CLIENT_ID or not SPOTIPY_CLIENT_SECRET:
        print("Error: SPOTIPY_CLIENT_ID and SPOTIPY_CLIENT_SECRET environment variables must be set.")
        return None
    
    auth_manager = SpotifyClientCredentials(client_id=SPOTIPY_CLIENT_ID, client_secret=SPOTIPY_CLIENT_SECRET)
    return spotipy.Spotify(auth_manager=auth_manager)

def get_playlist_tracks(sp, playlist_id):
    """Fetches all tracks from a Spotify playlist."""
    results = sp.playlist_items(playlist_id)
    tracks = results['items']
    while results['next']:
        results = sp.next(results)
        tracks.extend(results['items'])
    return tracks

def format_track_markdown(track):
    """Returns (markdown_link_string, display_text)"""
    name = track['name']
    artists = ", ".join([artist['name'] for artist in track['artists']])
    display_text = f'"{name}" - {artists}'
    url = track['external_urls'].get('spotify', '')
    if url:
        return f'[{display_text}]({url})', display_text
    return display_text, display_text

def extract_text_and_url(line_content):
    """
    Parses a markdown list item content (after '- [ ] ').
    Returns (display_text, url).
    Matches:
    - "Song" - Artist
    - ["Song" - Artist](url)
    """
    # Regex for link: [text](url)
    match = re.match(r'\[(.*?)\]\((.*?)\)', line_content)
    if match:
        return match.group(1), match.group(2)
    else:
        return line_content, None

def parse_lists_from_markdown(content):
    """
    Parses 'Song List' and 'Suggested Additions' from markdown.
    Returns:
    - song_list_items: list of raw strings (content after '- [ ] ')
    - suggested_items: list of raw strings (content after '- [ ] ')
    """
    lines = content.split('\n')
    song_list_items = []
    suggested_items = []
    
    current_section = None
    
    for line in lines:
        stripped = line.strip()
        if stripped.startswith('## Song List'):
            current_section = 'song_list'
            continue
        elif stripped.startswith('## Suggested Additions'):
            current_section = 'suggested'
            continue
        elif stripped.startswith('## '):
            current_section = None
            continue
            
        if current_section and stripped.startswith('- [ ]'):
            item_content = stripped[5:].strip()
            if current_section == 'song_list':
                song_list_items.append(item_content)
            elif current_section == 'suggested':
                suggested_items.append(item_content)
                
    return song_list_items, suggested_items

def search_spotify_link(sp, song_text):
    """Searches Spotify for a song text and returns a URL."""
    try:
        # cleanup song text for search (remove quotes)
        query = song_text.replace('"', '')
        results = sp.search(q=query, type='track', limit=1)
        items = results['tracks']['items']
        if items:
            return items[0]['external_urls']['spotify']
    except Exception as e:
        print(f"Error searching for {song_text}: {e}")
    return None

def update_markdown_file(filepath, sp):
    print(f"Processing {filepath}...")
    
    post = frontmatter.load(filepath)
    playlist_id = post.metadata.get('spotify_id')
    
    if not playlist_id or playlist_id == 'REPLACE_WITH_PLAYLIST_ID':
        print(f"  Skipping: No valid spotify_id found in {filepath}")
        return

    # Fetch current Spotify tracks
    try:
        spotify_tracks_raw = get_playlist_tracks(sp, playlist_id)
    except Exception as e:
        print(f"  Error fetching playlist {playlist_id}: {e}")
        return

    spotify_songs = []
    for item in spotify_tracks_raw:
        track = item['track']
        if track: # handle local files or potential nulls
            spotify_songs.append(track)

    spotify_song_strings = []
    spotify_song_keys = set()
    spotify_urls = set()

    for track in spotify_songs:
        md_line, display_text = format_track_markdown(track)
        spotify_song_strings.append(md_line)
        spotify_song_keys.add(display_text.lower())
        url = track['external_urls'].get('spotify', '')
        if url:
            spotify_urls.add(url)
    
    # Parse existing Markdown to find "old" songs and existing suggestions
    md_song_list_raw, md_suggested_raw = parse_lists_from_markdown(post.content)
    
    # Calculate new Suggested Additions
    # 1. Start with existing suggested additions
    # 2. Add songs from existing Song List that are NOT in Spotify
    # 3. Remove songs that ARE in Spotify (from both sources)
    
    final_suggested_items = []
    processed_suggestions_texts = set()
    
    # Helper to process a raw item string
    def process_item(raw_item):
        text, url = extract_text_and_url(raw_item)
        
        # If this song is now in Spotify, we drop it from suggestions
        if text.lower() in spotify_song_keys:
            return None
            
        # Check by URL as well
        if url and url in spotify_urls:
            return None
            
        # If we already have this suggestion in our list, skip (deduplication)
        if text.lower() in processed_suggestions_texts:
            return None
            
        processed_suggestions_texts.add(text.lower())
        
        # Check for URL if missing
        if not url:
            print(f"  Searching link for suggestion: {text}")
            url = search_spotify_link(sp, text)
            
        if url:
            return f"[{text}]({url})"
        else:
            return text

    # 1. Process existing suggestions (priority)
    for item in md_suggested_raw:
        res = process_item(item)
        if res:
            final_suggested_items.append(res)
            
    # 2. Process items from old Song List that might have been removed from Spotify (or not added yet)
    for item in md_song_list_raw:
        res = process_item(item)
        if res:
            final_suggested_items.append(res)

    # Reconstruct Content
    content_lines = post.content.split('\n')
    new_content_lines = []
    
    mode = 'copy'
    
    for line in content_lines:
        if line.strip().startswith('## Song List'):
            mode = 'skip_sections'
            new_content_lines.append(line) # Keep the header
            continue
        
        if mode == 'skip_sections':
            if line.strip().startswith('## ') and not line.strip().startswith('## Suggested Additions'):
                # Found a new section that is not Suggested Additions (e.g. ## Notes)
                mode = 'copy'
                new_content_lines.append(line)
            elif line.strip().startswith('## Suggested Additions'):
                # Skip this header too, we will re-add it
                continue
            else:
                # Skipping songs/suggestions lines
                pass
        else:
            new_content_lines.append(line)

    # Now append the new lists
    final_lines = []
    inserted_lists = False
    
    for line in new_content_lines:
        final_lines.append(line)
        if line.strip().startswith('## Song List'):
            # Insert Spotify Songs
            for track_str in spotify_song_strings:
                final_lines.append(f"- [ ] {track_str}")
            final_lines.append("") # Empty line
            
            # Insert Suggested Additions
            if final_suggested_items:
                final_lines.append("## Suggested Additions")
                for item in final_suggested_items:
                    final_lines.append(f"- [ ] {item}")
                final_lines.append("")
                
            inserted_lists = True

    if not inserted_lists:
        # Fallback if header wasn't found
        final_lines.append("## Song List")
        for track_str in spotify_song_strings:
            final_lines.append(f"- [ ] {track_str}")
        final_lines.append("")
        
        if final_suggested_items:
            final_lines.append("## Suggested Additions")
            for item in final_suggested_items:
                final_lines.append(f"- [ ] {item}")
            final_lines.append("")

    # Update the post content
    post.content = "\n".join(final_lines)
    
    # Write back
    with open(filepath, 'wb') as f:
        frontmatter.dump(post, f)
    
    print(f"  Updated {filepath}")

def main():
    sp = get_spotify_client()
    if not sp:
        return

    playlist_dir = os.path.join(os.path.dirname(__file__), 'Playlists')
    markdown_files = glob.glob(os.path.join(playlist_dir, '*.md'))
    
    for md_file in markdown_files:
        update_markdown_file(md_file, sp)
        
    print("Sync complete.")

if __name__ == "__main__":
    main()
