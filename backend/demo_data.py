from datetime import datetime, timedelta, timezone
import random
from typing import Any, Dict, List


DEMO_CATALOG = [
    ("4NRXx6U8ABQ", "Blinding Lights", "The Weeknd", "After Hours", 200),
    ("TUVcZfQe-Kw", "Levitating", "Dua Lipa", "Future Nostalgia", 203),
    ("fHI8X4OXluQ", "Starboy", "The Weeknd", "Starboy", 230),
    ("H5v3kku4y6Q", "As It Was", "Harry Styles", "Harry's House", 167),
    ("kTJczUoc26U", "STAY", "The Kid LAROI, Justin Bieber", "F*CK LOVE 3", 141),
    ("oygrmJFKYZY", "Don't Start Now", "Dua Lipa", "Future Nostalgia", 183),
    ("50VNCymT-Cs", "Let It Happen", "Tame Impala", "Currents", 467),
    ("pAgnJDJN4VA", "Back In Black", "AC/DC", "Back In Black", 255),
    ("btPJPFnesV4", "Eye of the Tiger", "Survivor", "Eye of the Tiger", 245),
    ("60ItHLz5WEA", "Faded", "Alan Walker", "Different World", 212),
    ("e-ORhEE9VVg", "Blank Space", "Taylor Swift", "1989", 231),
    ("nfWlot6h_JM", "Shake It Off", "Taylor Swift", "1989", 219),
    ("JGwWNGJdvx8", "Shape of You", "Ed Sheeran", "÷ (Divide)", 233),
    ("2Vv-BfVoq4g", "Perfect", "Ed Sheeran", "÷ (Divide)", 263),
    ("7wtfhZwyrcc", "Believer", "Imagine Dragons", "Evolve", 204),
    ("ktvTqknDobU", "Radioactive", "Imagine Dragons", "Night Visions", 186),
    ("8UVNT4wvIGY", "Somebody That I Used To Know", "Gotye", "Making Mirrors", 244),
    ("hT_nvWreIhg", "Counting Stars", "OneRepublic", "Native", 257),
    ("YQHsXMglC9A", "Hello", "Adele", "25", 295),
    ("rYEDA3JcQqw", "Rolling in the Deep", "Adele", "21", 228),
    ("09R8_2nJtjg", "Sugar", "Maroon 5", "V", 235),
    ("CevxZvSJLk8", "Roar", "Katy Perry", "PRISM", 223),
    ("SlPhMPnQ58k", "Memories", "Maroon 5", "JORDI", 189),
    ("papuvlVeZg8", "Rockabye", "Clean Bandit", "What Is Love?", 251),
    ("IcrbM1l_BoI", "Wake Me Up", "Avicii", "True", 247),
    ("uSD4vsh1zDA", "I Gotta Feeling", "Black Eyed Peas", "The E.N.D.", 289),
    ("bpOSxM0rNPM", "Do I Wanna Know?", "Arctic Monkeys", "AM", 272),
    ("VQH8ZTgna3Q", "R U Mine?", "Arctic Monkeys", "AM", 201),
    ("1w7OgIMMRc4", "Sweet Child O' Mine", "Guns N' Roses", "Appetite for Destruction", 356),
    ("fJ9rUzIMcZQ", "Bohemian Rhapsody", "Queen", "A Night at the Opera", 354),
]


def generate_demo_data() -> Dict[str, Any]:
    """Generate deterministic multi-year demo listening history & library."""
    rng = random.Random(42)
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=540)

    events: List[Dict[str, Any]] = []
    # Weighted popularity so top artists/tracks stand out naturally
    weights = [max(1, 32 - i) for i in range(len(DEMO_CATALOG))]
    hour_weights = [
        2, 1, 1, 0, 0, 1, 2, 4, 7, 9, 10, 9,
        8, 9, 10, 11, 12, 14, 15, 13, 12, 10, 7, 4
    ]

    cur = start
    idx = 0
    while cur <= now:
        # Simulate occasional rest days and active listening sessions
        is_weekend = cur.weekday() >= 5
        if rng.random() < (0.88 if is_weekend else 0.82):
            plays_today = rng.randint(4, 18) if is_weekend else rng.randint(2, 14)
            for _ in range(plays_today):
                hour = rng.choices(range(24), weights=hour_weights, k=1)[0]
                minute = rng.randint(0, 59)
                second = rng.randint(0, 59)
                played_dt = cur.replace(hour=hour, minute=minute, second=second, microsecond=0)
                if played_dt > now:
                    continue
                vid, title, artist, album, dur = rng.choices(DEMO_CATALOG, weights=weights, k=1)[0]
                events.append({
                    "id": f"demo_{idx}",
                    "videoId": vid,
                    "title": title,
                    "artist": artist,
                    "album": album,
                    "playedAt": played_dt.isoformat().replace("+00:00", "Z"),
                    "source": "demo",
                    "header": "YouTube Music",
                    "thumbnail": f"https://i.ytimg.com/vi/{vid}/mqdefault.jpg",
                    "url": f"https://music.youtube.com/watch?v={vid}",
                    "durationSec": dur,
                })
                idx += 1
        cur += timedelta(days=1)

    events.sort(key=lambda e: e["playedAt"], reverse=True)

    liked_songs = [
        {
            "videoId": vid,
            "title": title,
            "artist": artist,
            "album": album,
            "durationSec": dur,
            "thumbnail": f"https://i.ytimg.com/vi/{vid}/mqdefault.jpg",
            "url": f"https://music.youtube.com/watch?v={vid}",
        }
        for vid, title, artist, album, dur in DEMO_CATALOG[:12]
    ]

    playlists = [
        {"playlistId": "demo_pl_1", "title": "Late Night Synth & Vibes", "count": "42", "thumbnail": f"https://i.ytimg.com/vi/{DEMO_CATALOG[0][0]}/mqdefault.jpg"},
        {"playlistId": "demo_pl_2", "title": "Workout & High Energy", "count": "28", "thumbnail": f"https://i.ytimg.com/vi/{DEMO_CATALOG[8][0]}/mqdefault.jpg"},
        {"playlistId": "demo_pl_3", "title": "Indie & Alt Classics", "count": "35", "thumbnail": f"https://i.ytimg.com/vi/{DEMO_CATALOG[26][0]}/mqdefault.jpg"},
        {"playlistId": "demo_pl_4", "title": "Focus / Coding Flow", "count": "64", "thumbnail": f"https://i.ytimg.com/vi/{DEMO_CATALOG[6][0]}/mqdefault.jpg"},
    ]

    library_artists = [
        {"browseId": "demo_ar_1", "name": "The Weeknd", "subscribers": "36.2M", "thumbnail": f"https://i.ytimg.com/vi/{DEMO_CATALOG[0][0]}/mqdefault.jpg"},
        {"browseId": "demo_ar_2", "name": "Dua Lipa", "subscribers": "24.1M", "thumbnail": f"https://i.ytimg.com/vi/{DEMO_CATALOG[1][0]}/mqdefault.jpg"},
        {"browseId": "demo_ar_3", "name": "Tame Impala", "subscribers": "4.8M", "thumbnail": f"https://i.ytimg.com/vi/{DEMO_CATALOG[6][0]}/mqdefault.jpg"},
        {"browseId": "demo_ar_4", "name": "Arctic Monkeys", "subscribers": "8.9M", "thumbnail": f"https://i.ytimg.com/vi/{DEMO_CATALOG[26][0]}/mqdefault.jpg"},
        {"browseId": "demo_ar_5", "name": "Taylor Swift", "subscribers": "60.4M", "thumbnail": f"https://i.ytimg.com/vi/{DEMO_CATALOG[10][0]}/mqdefault.jpg"},
        {"browseId": "demo_ar_6", "name": "Queen", "subscribers": "18.5M", "thumbnail": f"https://i.ytimg.com/vi/{DEMO_CATALOG[29][0]}/mqdefault.jpg"},
    ]

    return {
        "events": events,
        "library": {
            "history": events[:25],
            "likedSongs": liked_songs,
            "playlists": playlists,
            "libraryArtists": library_artists,
        },
    }
