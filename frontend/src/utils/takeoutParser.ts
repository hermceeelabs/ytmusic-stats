import JSZip from 'jszip';
import type { PlayEvent, TakeoutStats } from '../types';

const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;

function extractVideoId(url?: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const vid = parsed.searchParams.get('v');
    if (vid && VIDEO_ID_RE.test(vid)) return vid;
  } catch {
    // ignore malformed URL
  }
  return null;
}

function cleanArtistName(name?: string | null): string {
  if (!name) return 'Unknown Artist';
  let cleaned = name.trim();
  if (cleaned.endsWith(' - Topic')) {
    cleaned = cleaned.slice(0, -8).trim();
  }
  return cleaned || 'Unknown Artist';
}

function cleanTrackTitle(rawTitle: string): string {
  let title = rawTitle.trim();
  for (const prefix of ['Watched ', 'Listened to ']) {
    if (title.startsWith(prefix)) {
      title = title.slice(prefix.length).trim();
      break;
    }
  }
  return title;
}

function isRemovedEntry(title: string, url?: string | null): boolean {
  if (title.toLowerCase().includes('a video that has been removed')) return true;
  if (!url) return true;
  return false;
}

export function parseTakeoutEntries(
  rawItems: unknown[],
  includeYouTubeGeneral: boolean = false
): { events: PlayEvent[]; stats: TakeoutStats } {
  const events: PlayEvent[] = [];
  let skippedNonMusic = 0;
  let skippedInvalid = 0;

  for (const item of rawItems) {
    if (!item || typeof item !== 'object') {
      skippedInvalid += 1;
      continue;
    }
    const rec = item as Record<string, any>;
    const header = typeof rec.header === 'string' ? rec.header : '';
    const titleUrl = typeof rec.titleUrl === 'string' ? rec.titleUrl : null;
    const rawTitle = typeof rec.title === 'string' ? rec.title : '';
    const timestamp = typeof rec.time === 'string' ? rec.time : '';

    if (!timestamp || !rawTitle || isRemovedEntry(rawTitle, titleUrl)) {
      skippedInvalid += 1;
      continue;
    }

    const isYtMusic =
      header === 'YouTube Music' ||
      (titleUrl !== null && titleUrl.includes('music.youtube.com'));

    if (!isYtMusic && !includeYouTubeGeneral) {
      skippedNonMusic += 1;
      continue;
    }

    const videoId = extractVideoId(titleUrl);
    if (!videoId) {
      skippedInvalid += 1;
      continue;
    }

    let title = cleanTrackTitle(rawTitle);
    const subtitles = Array.isArray(rec.subtitles) ? rec.subtitles : [];
    const rawArtist =
      subtitles.length > 0 && subtitles[0] && typeof subtitles[0].name === 'string'
        ? subtitles[0].name
        : null;

    let artist = cleanArtistName(rawArtist);
    if (artist === 'Unknown Artist' && title.includes(' - ')) {
      const idx = title.indexOf(' - ');
      const left = title.slice(0, idx).trim();
      const right = title.slice(idx + 3).trim();
      if (left.length > 0 && left.length < 50 && right.length > 0) {
        artist = left;
        title = right;
      }
    }

    events.push({
      id: `takeout_${videoId}_${timestamp}`,
      videoId,
      title,
      artist,
      playedAt: timestamp,
      source: 'takeout',
      header: header || 'YouTube',
      thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
      url: `https://music.youtube.com/watch?v=${videoId}`,
      durationSec: 210,
    });
  }

  return {
    events,
    stats: {
      totalRaw: rawItems.length,
      parsedMusicEvents: events.length,
      skippedNonMusic,
      skippedInvalid,
    },
  };
}

export async function parseTakeoutFile(
  file: File,
  includeYouTubeGeneral: boolean = false
): Promise<{ events: PlayEvent[]; stats: TakeoutStats }> {
  let jsonText: string;

  if (file.name.toLowerCase().endsWith('.zip')) {
    const zip = await JSZip.loadAsync(file);
    const candidates = Object.keys(zip.files).filter((name) => {
      const lower = name.toLowerCase();
      return (
        !zip.files[name].dir &&
        (lower.endsWith('watch-history.json') || lower.endsWith('myactivity.json'))
      );
    });

    if (candidates.length === 0) {
      throw new Error(
        'No watch-history.json found in this ZIP. Make sure you exported History in JSON format from Google Takeout.'
      );
    }

    candidates.sort((a, b) => {
      const aPref = a.toLowerCase().includes('watch-history.json') ? 0 : 1;
      const bPref = b.toLowerCase().includes('watch-history.json') ? 0 : 1;
      return aPref - bPref || a.length - b.length;
    });

    jsonText = await zip.files[candidates[0]].async('string');
  } else {
    jsonText = await file.text();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error('The selected file is not valid JSON.');
  }

  if (!Array.isArray(parsed)) {
    throw new Error('Expected a JSON array of watch history entries.');
  }

  return parseTakeoutEntries(parsed, includeYouTubeGeneral);
}
