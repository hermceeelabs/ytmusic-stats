import io
import json
import re
import zipfile
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import parse_qs, urlparse


VIDEO_ID_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")


def extract_video_id(url: Optional[str]) -> Optional[str]:
    """Extract YouTube videoId from a watch URL."""
    if not url:
        return None
    try:
        parsed = urlparse(url)
        qs = parse_qs(parsed.query)
        vid = qs.get("v", [None])[0]
        if vid and VIDEO_ID_RE.match(vid):
            return vid
    except Exception:
        pass
    return None


def clean_artist_name(name: Optional[str]) -> str:
    """Normalize YouTube Music channel names (e.g. strip ' - Topic')."""
    if not name:
        return "Unknown Artist"
    cleaned = name.strip()
    if cleaned.endswith(" - Topic"):
        cleaned = cleaned[:-8].strip()
    return cleaned or "Unknown Artist"


def clean_track_title(raw_title: str) -> str:
    """Strip 'Watched ' prefix from Google Takeout watch history titles."""
    title = raw_title.strip()
    for prefix in ("Watched ", "Listened to "):
        if title.startswith(prefix):
            title = title[len(prefix):].strip()
            break
    return title


def is_removed_entry(title: str, url: Optional[str]) -> bool:
    """Filter out deleted/unavailable videos and non-watch entries."""
    lower = title.lower()
    if "a video that has been removed" in lower:
        return True
    if not url:
        return True
    return False


def parse_takeout_entries(
    raw_items: List[Dict[str, Any]],
    include_youtube_general: bool = False,
) -> Tuple[List[Dict[str, Any]], Dict[str, int]]:
    """
    Parse raw Google Takeout watch-history.json items into normalized play events.
    Returns (events, stats).
    """
    events: List[Dict[str, Any]] = []
    skipped_non_music = 0
    skipped_invalid = 0

    for item in raw_items:
        if not isinstance(item, dict):
            skipped_invalid += 1
            continue

        header = item.get("header", "")
        title_url = item.get("titleUrl")
        raw_title = item.get("title", "")
        timestamp = item.get("time")

        if not timestamp or not raw_title or is_removed_entry(raw_title, title_url):
            skipped_invalid += 1
            continue

        is_yt_music = (
            header == "YouTube Music"
            or (isinstance(title_url, str) and "music.youtube.com" in title_url)
        )

        if not is_yt_music and not include_youtube_general:
            skipped_non_music += 1
            continue

        video_id = extract_video_id(title_url)
        if not video_id:
            skipped_invalid += 1
            continue

        title = clean_track_title(raw_title)
        subtitles = item.get("subtitles") or []
        raw_artist = None
        if isinstance(subtitles, list) and len(subtitles) > 0 and isinstance(subtitles[0], dict):
            raw_artist = subtitles[0].get("name")

        artist = clean_artist_name(raw_artist)

        # Fallback: if artist is still Unknown and title has "Artist - Track"
        if artist == "Unknown Artist" and " - " in title:
            parts = title.split(" - ", 1)
            if len(parts[0]) < 50 and len(parts[1]) > 0:
                artist = parts[0].strip()
                title = parts[1].strip()

        events.append({
            "id": f"takeout_{video_id}_{timestamp}",
            "videoId": video_id,
            "title": title,
            "artist": artist,
            "playedAt": timestamp,
            "source": "takeout",
            "header": header or "YouTube",
            "thumbnail": f"https://i.ytimg.com/vi/{video_id}/mqdefault.jpg",
            "url": f"https://music.youtube.com/watch?v={video_id}",
            # Google Takeout does not include track duration; default estimate is 3.5 min (210s)
            "durationSec": 210,
        })

    stats = {
        "totalRaw": len(raw_items),
        "parsedMusicEvents": len(events),
        "skippedNonMusic": skipped_non_music,
        "skippedInvalid": skipped_invalid,
    }
    return events, stats


def load_takeout_bytes(filename: str, content: bytes, include_youtube_general: bool = False) -> Tuple[List[Dict[str, Any]], Dict[str, int]]:
    """Load watch-history.json directly or from a Google Takeout .zip archive."""
    lower_name = filename.lower()
    if lower_name.endswith(".zip"):
        with zipfile.ZipFile(io.BytesIO(content)) as zf:
            candidates = [
                name for name in zf.namelist()
                if name.lower().endswith("watch-history.json")
                or name.lower().endswith("myactivity.json")
            ]
            if not candidates:
                raise ValueError("No watch-history.json found inside the uploaded ZIP archive.")
            # Prefer watch-history.json
            candidates.sort(key=lambda n: (0 if "watch-history.json" in n.lower() else 1, len(n)))
            with zf.open(candidates[0]) as f:
                raw_data = json.load(f)
    else:
        raw_data = json.loads(content.decode("utf-8"))

    if not isinstance(raw_data, list):
        raise ValueError("Expected a JSON array of watch history entries.")

    return parse_takeout_entries(raw_data, include_youtube_general=include_youtube_general)
