import type {
  AnalyticsSummary,
  ArtistStat,
  DateFilter,
  Granularity,
  PlayEvent,
  TrackStat,
} from '../types';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const FULL_DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function getAvailableYears(events: PlayEvent[]): number[] {
  const years = new Set<number>();
  for (const ev of events) {
    const d = new Date(ev.playedAt);
    if (!Number.isNaN(d.getTime())) {
      years.add(d.getFullYear());
    }
  }
  return Array.from(years).sort((a, b) => b - a);
}

export function filterEventsByDateRange(
  events: PlayEvent[],
  filter: DateFilter,
  searchQuery: string = ''
): PlayEvent[] {
  const now = new Date();
  let cutoff: number | null = null;

  if (filter.preset === '30d') {
    cutoff = now.getTime() - 30 * 86400 * 1000;
  } else if (filter.preset === '90d') {
    cutoff = now.getTime() - 90 * 86400 * 1000;
  } else if (filter.preset === '1y') {
    cutoff = now.getTime() - 365 * 86400 * 1000;
  } else if (filter.preset === 'ytd') {
    cutoff = new Date(now.getFullYear(), 0, 1).getTime();
  }

  const q = searchQuery.trim().toLowerCase();

  return events.filter((ev) => {
    const d = new Date(ev.playedAt);
    const t = d.getTime();
    if (Number.isNaN(t)) return false;

    if (filter.preset === 'custom') {
      if (filter.year !== null && d.getFullYear() !== filter.year) return false;
      if (filter.month !== null && d.getMonth() !== filter.month) return false;
    } else if (cutoff !== null && t < cutoff) {
      return false;
    }

    if (q) {
      const hay = `${ev.title} ${ev.artist} ${ev.album ?? ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getBucketKeyAndLabel(d: Date, granularity: Granularity): { key: string; label: string } {
  const y = d.getFullYear();
  const m = d.getMonth();
  if (granularity === 'month') {
    const key = `${y}-${String(m + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
    return { key, label };
  }
  if (granularity === 'week') {
    // Monday-based week start
    const day = (d.getDay() + 6) % 7;
    const weekStart = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
    const key = toLocalDateKey(weekStart);
    const label = weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return { key, label };
  }
  const key = toLocalDateKey(d);
  const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return { key, label };
}

function computeStreaks(sortedDateKeys: string[]): { longest: number; current: number } {
  if (sortedDateKeys.length === 0) return { longest: 0, current: 0 };

  let longest = 1;
  let run = 1;

  const toDayNumber = (key: string) => {
    const [y, m, d] = key.split('-').map(Number);
    return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
  };

  const dayNums = sortedDateKeys.map(toDayNumber);
  for (let i = 1; i < dayNums.length; i++) {
    if (dayNums[i] === dayNums[i - 1] + 1) {
      run += 1;
      if (run > longest) longest = run;
    } else if (dayNums[i] > dayNums[i - 1] + 1) {
      run = 1;
    }
  }

  // Current streak relative to today or yesterday
  const today = new Date();
  const todayNum = Math.floor(
    Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) / 86400000
  );
  const lastDayNum = dayNums[dayNums.length - 1];
  let current = 0;
  if (lastDayNum >= todayNum - 1) {
    current = 1;
    for (let i = dayNums.length - 2; i >= 0; i--) {
      if (dayNums[i] === dayNums[i + 1] - 1) {
        current += 1;
      } else {
        break;
      }
    }
  }

  return { longest, current };
}

function inferArchetype(
  peakHour: number,
  discoveryRatePct: number,
  topArtistSharePct: number,
  avgPlaysPerDay: number
): { title: string; subtitle: string } {
  if (peakHour >= 22 || peakHour < 4) {
    return {
      title: 'Midnight Synth Listener',
      subtitle: 'Your peak listening happens late at night when the world slows down.',
    };
  }
  if (topArtistSharePct >= 18) {
    return {
      title: 'Devoted Superfan',
      subtitle: 'You lock onto your favorite artists and replay their catalog deeply.',
    };
  }
  if (discoveryRatePct >= 12) {
    return {
      title: 'Genre Explorer',
      subtitle: 'You constantly branch out to fresh artists and new sounds.',
    };
  }
  if (avgPlaysPerDay >= 15) {
    return {
      title: 'Always-On Audiophile',
      subtitle: 'Music is the continuous soundtrack to almost every part of your day.',
    };
  }
  return {
    title: 'Balanced Curator',
    subtitle: 'A steady blend of comfort favorites and timely new discoveries.',
  };
}

export function computeAnalytics(
  events: PlayEvent[],
  granularity: Granularity = 'month'
): AnalyticsSummary {
  const totalPlays = events.length;
  if (totalPlays === 0) {
    return {
      totalPlays: 0,
      totalMinutes: 0,
      totalHours: 0,
      uniqueArtists: 0,
      uniqueTracks: 0,
      activeDays: 0,
      avgPlaysPerActiveDay: 0,
      longestStreakDays: 0,
      currentStreakDays: 0,
      peakHour: 0,
      peakDayOfWeek: 'Monday',
      mostActiveDate: null,
      discoveryRatePct: 0,
      archetype: {
        title: 'No Data Yet',
        subtitle: 'Upload your Google Takeout history or connect YouTube Music to see your stats.',
      },
      topArtists: [],
      topTracks: [],
      timeSeries: [],
      hourlyDistribution: Array.from({ length: 24 }, (_, h) => ({
        hour: h,
        label: `${String(h).padStart(2, '0')}:00`,
        plays: 0,
      })),
      heatmap: Array.from({ length: 7 }, () => Array(24).fill(0)),
    };
  }

  let totalSec = 0;
  const artistMap = new Map<
    string,
    {
      name: string;
      plays: number;
      sec: number;
      tracks: Map<string, number>;
      firstPlayed: string;
      lastPlayed: string;
      thumbnail?: string | null;
    }
  >();
  const trackMap = new Map<
    string,
    {
      key: string;
      videoId: string;
      title: string;
      artist: string;
      album?: string | null;
      plays: number;
      sec: number;
      firstPlayed: string;
      lastPlayed: string;
      thumbnail?: string | null;
      url?: string | null;
    }
  >();

  const dayCounts = new Map<string, number>();
  const hourCounts = Array(24).fill(0);
  const dowCounts = Array(7).fill(0);
  const heatmap = Array.from({ length: 7 }, () => Array(24).fill(0));
  const bucketMap = new Map<
    string,
    { bucket: string; label: string; plays: number; sec: number; newArtists: Set<string> }
  >();

  // Sort chronologically ascending to track firstPlayed & artist discovery accurately
  const chronological = [...events].sort((a, b) => a.playedAt.localeCompare(b.playedAt));
  const seenArtists = new Set<string>();

  for (const ev of chronological) {
    const d = new Date(ev.playedAt);
    if (Number.isNaN(d.getTime())) continue;

    const dur = ev.durationSec || 210;
    totalSec += dur;

    const dateKey = toLocalDateKey(d);
    dayCounts.set(dateKey, (dayCounts.get(dateKey) ?? 0) + 1);

    const hour = d.getHours();
    const dow = (d.getDay() + 6) % 7; // 0 = Mon .. 6 = Sun
    hourCounts[hour] += 1;
    dowCounts[dow] += 1;
    heatmap[dow][hour] += 1;

    const { key: bKey, label: bLabel } = getBucketKeyAndLabel(d, granularity);
    let bEntry = bucketMap.get(bKey);
    if (!bEntry) {
      bEntry = { bucket: bKey, label: bLabel, plays: 0, sec: 0, newArtists: new Set() };
      bucketMap.set(bKey, bEntry);
    }
    bEntry.plays += 1;
    bEntry.sec += dur;

    const artistName = ev.artist || 'Unknown Artist';
    if (!seenArtists.has(artistName)) {
      seenArtists.add(artistName);
      bEntry.newArtists.add(artistName);
    }

    let aStat = artistMap.get(artistName);
    if (!aStat) {
      aStat = {
        name: artistName,
        plays: 0,
        sec: 0,
        tracks: new Map(),
        firstPlayed: ev.playedAt,
        lastPlayed: ev.playedAt,
        thumbnail: ev.thumbnail,
      };
      artistMap.set(artistName, aStat);
    }
    aStat.plays += 1;
    aStat.sec += dur;
    aStat.lastPlayed = ev.playedAt;
    if (!aStat.thumbnail && ev.thumbnail) aStat.thumbnail = ev.thumbnail;
    aStat.tracks.set(ev.title, (aStat.tracks.get(ev.title) ?? 0) + 1);

    const tKey = ev.videoId || `${ev.title}__${artistName}`;
    let tStat = trackMap.get(tKey);
    if (!tStat) {
      tStat = {
        key: tKey,
        videoId: ev.videoId,
        title: ev.title,
        artist: artistName,
        album: ev.album,
        plays: 0,
        sec: 0,
        firstPlayed: ev.playedAt,
        lastPlayed: ev.playedAt,
        thumbnail: ev.thumbnail,
        url: ev.url,
      };
      trackMap.set(tKey, tStat);
    }
    tStat.plays += 1;
    tStat.sec += dur;
    tStat.lastPlayed = ev.playedAt;
    if (!tStat.thumbnail && ev.thumbnail) tStat.thumbnail = ev.thumbnail;
  }

  const topArtists: ArtistStat[] = Array.from(artistMap.values())
    .sort((a, b) => b.plays - a.plays)
    .map((a) => {
      let topTrack = '';
      let maxTrackPlays = -1;
      for (const [tTitle, count] of a.tracks.entries()) {
        if (count > maxTrackPlays) {
          maxTrackPlays = count;
          topTrack = tTitle;
        }
      }
      return {
        name: a.name,
        plays: a.plays,
        totalMinutes: Math.round(a.sec / 60),
        uniqueTracks: a.tracks.size,
        sharePct: Number(((a.plays / totalPlays) * 100).toFixed(1)),
        firstPlayed: a.firstPlayed,
        lastPlayed: a.lastPlayed,
        thumbnail: a.thumbnail,
        topTrack,
      };
    });

  const topTracks: TrackStat[] = Array.from(trackMap.values())
    .sort((a, b) => b.plays - a.plays)
    .map((t) => ({
      key: t.key,
      videoId: t.videoId,
      title: t.title,
      artist: t.artist,
      album: t.album,
      plays: t.plays,
      totalMinutes: Math.round(t.sec / 60),
      sharePct: Number(((t.plays / totalPlays) * 100).toFixed(1)),
      firstPlayed: t.firstPlayed,
      lastPlayed: t.lastPlayed,
      thumbnail: t.thumbnail,
      url: t.url,
    }));

  const sortedDays = Array.from(dayCounts.keys()).sort();
  const { longest: longestStreakDays, current: currentStreakDays } = computeStreaks(sortedDays);

  let mostActiveDate: { date: string; plays: number } | null = null;
  for (const [date, plays] of dayCounts.entries()) {
    if (!mostActiveDate || plays > mostActiveDate.plays) {
      mostActiveDate = { date, plays };
    }
  }

  let peakHour = 0;
  for (let h = 1; h < 24; h++) {
    if (hourCounts[h] > hourCounts[peakHour]) peakHour = h;
  }

  let peakDow = 0;
  for (let d = 1; d < 7; d++) {
    if (dowCounts[d] > dowCounts[peakDow]) peakDow = d;
  }

  const timeSeries = Array.from(bucketMap.values())
    .sort((a, b) => a.bucket.localeCompare(b.bucket))
    .map((b) => ({
      bucket: b.bucket,
      label: b.label,
      plays: b.plays,
      minutes: Math.round(b.sec / 60),
      newArtists: b.newArtists.size,
    }));

  const hourlyDistribution = hourCounts.map((plays, hour) => ({
    hour,
    label: `${String(hour).padStart(2, '0')}:00`,
    plays,
  }));

  const totalMinutes = Math.round(totalSec / 60);
  const totalHours = Number((totalSec / 3600).toFixed(1));
  const activeDays = dayCounts.size;
  const avgPlaysPerActiveDay = activeDays > 0 ? Number((totalPlays / activeDays).toFixed(1)) : 0;
  const discoveryRatePct = Number(((artistMap.size / totalPlays) * 100).toFixed(1));
  const topArtistSharePct = topArtists[0]?.sharePct ?? 0;

  return {
    totalPlays,
    totalMinutes,
    totalHours,
    uniqueArtists: artistMap.size,
    uniqueTracks: trackMap.size,
    activeDays,
    avgPlaysPerActiveDay,
    longestStreakDays,
    currentStreakDays,
    peakHour,
    peakDayOfWeek: FULL_DAY_NAMES[peakDow],
    mostActiveDate,
    discoveryRatePct,
    archetype: inferArchetype(peakHour, discoveryRatePct, topArtistSharePct, avgPlaysPerActiveDay),
    topArtists,
    topTracks,
    timeSeries,
    hourlyDistribution,
    heatmap,
  };
}

export interface YearComparisonData {
  years: number[];
  summaries: Record<number, AnalyticsSummary>;
  monthlyOverlay: Array<Record<string, string | number>>;
  artistMatrix: Array<{
    name: string;
    totalPlays: number;
    allTimePlays: number;
    byYear: Record<number, number>;
  }>;
  allTime: {
    totalPlays: number;
    totalMinutes: number;
    totalHours: number;
    yearCount: number;
    avgPlaysPerYear: number;
    avgHoursPerYear: number;
  };
}

const SHORT_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export function computeYearlyComparison(
  events: PlayEvent[],
  selectedYears: number[],
  metric: 'plays' | 'minutes' = 'plays'
): YearComparisonData {
  const sortedYears = [...selectedYears].sort((a, b) => a - b);
  const summaries: Record<number, AnalyticsSummary> = {};
  const monthBuckets: Array<Record<string, string | number>> = SHORT_MONTHS.map((m) => ({
    month: m,
    allAvg: 0,
  }));

  const eventsByYear = new Map<number, PlayEvent[]>();
  for (const y of sortedYears) {
    eventsByYear.set(y, []);
    for (const row of monthBuckets) {
      row[String(y)] = 0;
    }
  }

  // Track all-time stats across ALL years in events
  const allYearsSet = new Set<number>();
  const allTimeMonthTotals = Array(12).fill(0);
  const allTimeArtistCounts = new Map<string, number>();
  let allTimePlays = 0;
  let allTimeSec = 0;

  for (const ev of events) {
    const d = new Date(ev.playedAt);
    if (Number.isNaN(d.getTime())) continue;
    const y = d.getFullYear();
    const mIdx = d.getMonth();
    const dur = ev.durationSec || 210;
    const val = metric === 'plays' ? 1 : dur / 60;

    allYearsSet.add(y);
    allTimePlays += 1;
    allTimeSec += dur;
    allTimeMonthTotals[mIdx] += val;
    const aName = ev.artist || 'Unknown Artist';
    allTimeArtistCounts.set(aName, (allTimeArtistCounts.get(aName) ?? 0) + 1);

    const list = eventsByYear.get(y);
    if (!list) continue;
    list.push(ev);
    monthBuckets[mIdx][String(y)] = Number(
      ((monthBuckets[mIdx][String(y)] as number) + val).toFixed(1)
    );
  }

  const allYearCount = Math.max(1, allYearsSet.size);
  for (let m = 0; m < 12; m++) {
    monthBuckets[m].allAvg = Number((allTimeMonthTotals[m] / allYearCount).toFixed(1));
  }

  const artistTotals = new Map<string, { total: number; byYear: Record<number, number> }>();

  for (const y of sortedYears) {
    const yearEvents = eventsByYear.get(y) ?? [];
    const summary = computeAnalytics(yearEvents, 'month');
    summaries[y] = summary;

    for (const a of summary.topArtists) {
      let entry = artistTotals.get(a.name);
      if (!entry) {
        entry = { total: 0, byYear: {} };
        artistTotals.set(a.name, entry);
      }
      entry.total += a.plays;
      entry.byYear[y] = a.plays;
    }
  }

  const artistMatrix = Array.from(artistTotals.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 20)
    .map(([name, data]) => ({
      name,
      totalPlays: data.total,
      allTimePlays: allTimeArtistCounts.get(name) ?? data.total,
      byYear: data.byYear,
    }));

  const allTimeMinutes = Math.round(allTimeSec / 60);
  const allTimeHours = Number((allTimeSec / 3600).toFixed(1));

  return {
    years: sortedYears,
    summaries,
    monthlyOverlay: monthBuckets,
    artistMatrix,
    allTime: {
      totalPlays: allTimePlays,
      totalMinutes: allTimeMinutes,
      totalHours: allTimeHours,
      yearCount: allYearCount,
      avgPlaysPerYear: Math.round(allTimePlays / allYearCount),
      avgHoursPerYear: Number((allTimeHours / allYearCount).toFixed(1)),
    },
  };
}

export { DAY_NAMES };
