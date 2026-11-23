import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional
import ytmusicapi
from ytmusicapi import YTMusic

AUTH_FILE = (
    Path("/tmp/.ytmusic_auth.json")
    if os.environ.get("VERCEL")
    else Path(__file__).parent / ".ytmusic_auth.json"
)


def parse_duration_sec(duration_val: Any, duration_str: Optional[str] = None) -> int:
    """Convert ytmusicapi duration_seconds or 'MM:SS' string to integer seconds."""
    if isinstance(duration_val, (int, float)) and duration_val > 0:
        return int(duration_val)
    if duration_str and isinstance(duration_str, str):
        parts = duration_str.strip().split(":")
        try:
            if len(parts) == 2:
                return int(parts[0]) * 60 + int(parts[1])
            if len(parts) == 3:
                return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
        except ValueError:
            pass
    return 210


def extract_thumbnail(thumbnails: Any, video_id: Optional[str] = None) -> Optional[str]:
    """Pick the highest-resolution thumbnail URL available."""
    if isinstance(thumbnails, list) and len(thumbnails) > 0:
        last = thumbnails[-1]
        if isinstance(last, dict) and last.get("url"):
            return last["url"]
    if video_id:
        return f"https://i.ytimg.com/vi/{video_id}/mqdefault.jpg"
    return None


def extract_artists(artists_field: Any) -> str:
    """Join artist names from ytmusicapi artist list."""
    if isinstance(artists_field, list) and len(artists_field) > 0:
        names = [a.get("name", "").strip() for a in artists_field if isinstance(a, dict) and a.get("name")]
        if names:
            return ", ".join(names)
    return "Unknown Artist"


def setup_ytmusic_auth(headers_raw: str) -> Dict[str, Any]:
    """
    Accept either:
    1) JSON string of browser.json / oauth.json
    2) Raw HTTP request headers copied from Chrome/Edge/Firefox DevTools on music.youtube.com
    Validate by instantiating YTMusic and calling get_account_info / get_history.
    """
    stripped = headers_raw.strip()
    if not stripped:
        raise ValueError("Credentials/headers cannot be empty.")

    if stripped.startswith("{"):
        # Validate JSON
        parsed = json.loads(stripped)
        AUTH_FILE.write_text(json.dumps(parsed, indent=2), encoding="utf-8")
    else:
        # Use ytmusicapi.setup to convert raw HTTP headers into browser.json format
        ytmusicapi.setup(filepath=str(AUTH_FILE), headers_raw=stripped)

    try:
        yt = YTMusic(str(AUTH_FILE))
        # Quick verification call
        account_info = {}
        try:
            account_info = yt.get_account_info()
        except Exception:
            # Fallback verification if get_account_info is unavailable on some accounts
            yt.get_history()
        return {
            "connected": True,
            "accountName": account_info.get("accountName") if isinstance(account_info, dict) else None,
            "channelHandle": account_info.get("channelHandle") if isinstance(account_info, dict) else None,
        }
    except Exception as exc:
        if AUTH_FILE.exists():
            AUTH_FILE.unlink()
        raise ValueError(f"Failed to authenticate with YouTube Music: {exc}") from exc


def get_ytmusic_status() -> Dict[str, Any]:
    """Check if saved YouTube Music auth exists and is valid."""
    if not AUTH_FILE.exists():
        return {"connected": False}
    try:
        yt = YTMusic(str(AUTH_FILE))
        account_info = {}
        try:
            account_info = yt.get_account_info()
        except Exception:
            pass
        return {
            "connected": True,
            "accountName": account_info.get("accountName") if isinstance(account_info, dict) else "Connected Account",
            "channelHandle": account_info.get("channelHandle") if isinstance(account_info, dict) else None,
        }
    except Exception:
        return {"connected": False}


def disconnect_ytmusic() -> None:
    if AUTH_FILE.exists():
        AUTH_FILE.unlink()


def sync_ytmusic_library() -> Dict[str, Any]:
    """Fetch recent history, liked songs, playlists, and library artists from YouTube Music."""
    if not AUTH_FILE.exists():
        raise PermissionError("YouTube Music is not connected. Please connect your account first.")

    yt = YTMusic(str(AUTH_FILE))

    # 1. Recent History
    raw_history = yt.get_history() or []
    history_tracks: List[Dict[str, Any]] = []
    for idx, item in enumerate(raw_history):
        if not isinstance(item, dict):
            continue
        vid = item.get("videoId")
        title = item.get("title") or "Unknown Track"
        artist = extract_artists(item.get("artists"))
        album = item.get("album", {}).get("name") if isinstance(item.get("album"), dict) else None
        dur_sec = parse_duration_sec(item.get("duration_seconds"), item.get("duration"))
        history_tracks.append({
            "id": f"ytm_hist_{vid}_{idx}",
            "videoId": vid,
            "title": title,
            "artist": artist,
            "album": album,
            "durationSec": dur_sec,
            "playedLabel": item.get("played") or "Recently",
            "thumbnail": extract_thumbnail(item.get("thumbnails"), vid),
            "url": f"https://music.youtube.com/watch?v={vid}" if vid else None,
            "likeStatus": item.get("likeStatus"),
        })

    # 2. Liked Songs
    liked_tracks: List[Dict[str, Any]] = []
    try:
        liked_resp = yt.get_liked_songs(limit=200) or {}
        for item in liked_resp.get("tracks", []):
            vid = item.get("videoId")
            liked_tracks.append({
                "videoId": vid,
                "title": item.get("title") or "Unknown Track",
                "artist": extract_artists(item.get("artists")),
                "album": item.get("album", {}).get("name") if isinstance(item.get("album"), dict) else None,
                "durationSec": parse_duration_sec(item.get("duration_seconds"), item.get("duration")),
                "thumbnail": extract_thumbnail(item.get("thumbnails"), vid),
                "url": f"https://music.youtube.com/watch?v={vid}" if vid else None,
            })
    except Exception:
        pass

    # 3. Library Playlists
    playlists: List[Dict[str, Any]] = []
    try:
        raw_playlists = yt.get_library_playlists(limit=50) or []
        for pl in raw_playlists:
            playlists.append({
                "playlistId": pl.get("playlistId"),
                "title": pl.get("title") or "Untitled Playlist",
                "count": pl.get("count"),
                "description": pl.get("description"),
                "thumbnail": extract_thumbnail(pl.get("thumbnails")),
            })
    except Exception:
        pass

    # 4. Library Artists
    artists: List[Dict[str, Any]] = []
    try:
        raw_artists = yt.get_library_artists(limit=100) or []
        for ar in raw_artists:
            artists.append({
                "browseId": ar.get("browseId"),
                "name": ar.get("artist") or "Unknown Artist",
                "subscribers": ar.get("subscribers"),
                "thumbnail": extract_thumbnail(ar.get("thumbnails")),
            })
    except Exception:
        pass

    return {
        "history": history_tracks,
        "likedSongs": liked_tracks,
        "playlists": playlists,
        "libraryArtists": artists,
    }
