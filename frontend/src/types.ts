export type DataSourceMode = 'demo' | 'takeout' | 'live' | 'merged';

export type DateRangePreset = 'all' | '30d' | '90d' | '1y' | 'ytd' | 'custom';

export interface DateFilter {
  preset: DateRangePreset;
  year: number | null;
  month: number | null; // 0-indexed (0 = Jan, 11 = Dec)
}

export type Granularity = 'day' | 'week' | 'month';

export type NavTab = 'overview' | 'charts' | 'habits' | 'compare' | 'library';

export interface PlayEvent {
  id: string;
  videoId: string;
  title: string;
  artist: string;
  album?: string | null;
  playedAt: string; // ISO string
  source: 'demo' | 'takeout' | 'live';
  header?: string;
  thumbnail?: string | null;
  url?: string | null;
  durationSec: number;
}

export interface LibraryTrack {
  id?: string;
  videoId?: string | null;
  title: string;
  artist: string;
  album?: string | null;
  durationSec: number;
  playedLabel?: string;
  thumbnail?: string | null;
  url?: string | null;
  likeStatus?: string | null;
}

export interface LibraryPlaylist {
  playlistId?: string | null;
  title: string;
  count?: string | number | null;
  description?: string | null;
  thumbnail?: string | null;
}

export interface LibraryArtist {
  browseId?: string | null;
  name: string;
  subscribers?: string | null;
  thumbnail?: string | null;
}

export interface YTMusicLibrary {
  history: LibraryTrack[];
  likedSongs: LibraryTrack[];
  playlists: LibraryPlaylist[];
  libraryArtists: LibraryArtist[];
}

export interface ArtistStat {
  name: string;
  plays: number;
  totalMinutes: number;
  uniqueTracks: number;
  sharePct: number;
  firstPlayed: string;
  lastPlayed: string;
  thumbnail?: string | null;
  topTrack: string;
}

export interface TrackStat {
  key: string;
  videoId: string;
  title: string;
  artist: string;
  album?: string | null;
  plays: number;
  totalMinutes: number;
  sharePct: number;
  firstPlayed: string;
  lastPlayed: string;
  thumbnail?: string | null;
  url?: string | null;
}

export interface TimeSeriesPoint {
  bucket: string;
  label: string;
  plays: number;
  minutes: number;
  newArtists: number;
}

export interface HourlyPoint {
  hour: number;
  label: string;
  plays: number;
}

export interface AnalyticsSummary {
  totalPlays: number;
  totalMinutes: number;
  totalHours: number;
  uniqueArtists: number;
  uniqueTracks: number;
  activeDays: number;
  avgPlaysPerActiveDay: number;
  longestStreakDays: number;
  currentStreakDays: number;
  peakHour: number;
  peakDayOfWeek: string;
  mostActiveDate: { date: string; plays: number } | null;
  discoveryRatePct: number; // % of unique artists discovered vs total plays
  archetype: {
    title: string;
    subtitle: string;
  };
  topArtists: ArtistStat[];
  topTracks: TrackStat[];
  timeSeries: TimeSeriesPoint[];
  hourlyDistribution: HourlyPoint[];
  heatmap: number[][]; // [dayOfWeek 0=Mon..6=Sun][hour 0..23]
}

export interface TakeoutStats {
  totalRaw: number;
  parsedMusicEvents: number;
  skippedNonMusic: number;
  skippedInvalid: number;
}

export interface YTMusicStatus {
  connected: boolean;
  accountName?: string | null;
  channelHandle?: string | null;
}
