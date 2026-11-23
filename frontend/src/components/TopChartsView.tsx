import React, { useMemo, useState } from 'react';
import { ExternalLink, Music2, Search, Users, X } from 'lucide-react';
import type { AnalyticsSummary, PlayEvent } from '../types';

interface TopChartsViewProps {
  summary: AnalyticsSummary;
  filteredEvents: PlayEvent[];
  selectedArtist: string | null;
  onSelectArtist: (name: string | null) => void;
}

export const TopChartsView: React.FC<TopChartsViewProps> = ({
  summary,
  filteredEvents,
  selectedArtist,
  onSelectArtist,
}) => {
  const [chartTab, setChartTab] = useState<'artists' | 'tracks'>('artists');
  const [localQuery, setLocalQuery] = useState('');
  const [limit, setLimit] = useState<number>(50);

  const artists = useMemo(() => {
    const q = localQuery.trim().toLowerCase();
    const list = q
      ? summary.topArtists.filter((a) => a.name.toLowerCase().includes(q))
      : summary.topArtists;
    return list.slice(0, limit);
  }, [summary.topArtists, localQuery, limit]);

  const tracks = useMemo(() => {
    const q = localQuery.trim().toLowerCase();
    const list = q
      ? summary.topTracks.filter(
          (t) =>
            t.title.toLowerCase().includes(q) ||
            t.artist.toLowerCase().includes(q)
        )
      : summary.topTracks;
    return list.slice(0, limit);
  }, [summary.topTracks, localQuery, limit]);

  const artistDetail = useMemo(() => {
    if (!selectedArtist) return null;
    const stat = summary.topArtists.find((a) => a.name === selectedArtist);
    const events = filteredEvents.filter((e) => e.artist === selectedArtist);
    const trackCounts = new Map<
      string,
      { title: string; plays: number; videoId: string; thumbnail?: string | null; url?: string | null }
    >();
    for (const ev of events) {
      const cur = trackCounts.get(ev.title);
      if (cur) {
        cur.plays += 1;
      } else {
        trackCounts.set(ev.title, {
          title: ev.title,
          plays: 1,
          videoId: ev.videoId,
          thumbnail: ev.thumbnail,
          url: ev.url,
        });
      }
    }
    const topTracks = Array.from(trackCounts.values()).sort((a, b) => b.plays - a.plays);
    return { stat, topTracks };
  }, [selectedArtist, summary.topArtists, filteredEvents]);

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-800/80 bg-[#101015] p-4">
        <div className="flex rounded-xl bg-zinc-900 p-1 border border-zinc-800">
          <button
            onClick={() => setChartTab('artists')}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-medium transition ${
              chartTab === 'artists'
                ? 'bg-rose-600 text-white shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Users className="h-4 w-4" />
            Top Artists ({summary.topArtists.length.toLocaleString()})
          </button>
          <button
            onClick={() => setChartTab('tracks')}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-medium transition ${
              chartTab === 'tracks'
                ? 'bg-rose-600 text-white shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Music2 className="h-4 w-4" />
            Top Tracks ({summary.topTracks.length.toLocaleString()})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="h-4 w-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={localQuery}
              onChange={(e) => setLocalQuery(e.target.value)}
              placeholder={`Filter ${chartTab}...`}
              className="w-56 rounded-xl border border-zinc-800 bg-zinc-950 pl-9 pr-3 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-rose-500 focus:outline-none"
            />
          </div>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm text-zinc-200 focus:border-rose-500 focus:outline-none"
          >
            <option value={25}>Top 25</option>
            <option value={50}>Top 50</option>
            <option value={100}>Top 100</option>
            <option value={500}>Top 500</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-zinc-800/80 bg-[#101015] overflow-hidden">
        <div className="overflow-x-auto">
          {chartTab === 'artists' ? (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-800/80 bg-zinc-950/60 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="py-3 pl-5 pr-3 w-12">#</th>
                  <th className="py-3 px-3">Artist</th>
                  <th className="py-3 px-3 text-right">Plays</th>
                  <th className="py-3 px-3 text-right">Time</th>
                  <th className="py-3 px-3 text-right hidden sm:table-cell">Tracks</th>
                  <th className="py-3 px-3 hidden md:table-cell">Top Track</th>
                  <th className="py-3 pl-3 pr-5 text-right w-32">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {artists.map((artist, idx) => (
                  <tr
                    key={artist.name}
                    onClick={() => onSelectArtist(artist.name)}
                    className="cursor-pointer hover:bg-zinc-900/70 transition"
                  >
                    <td className="py-3 pl-5 pr-3 font-semibold text-zinc-500">{idx + 1}</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        {artist.thumbnail ? (
                          <img
                            src={artist.thumbnail}
                            alt={artist.name}
                            className="h-9 w-9 rounded-full object-cover bg-zinc-800 shrink-0"
                          />
                        ) : (
                          <div className="h-9 w-9 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400 shrink-0">
                            {artist.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span className="font-medium text-zinc-100">{artist.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-white">
                      {artist.plays.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right text-zinc-400">
                      {artist.totalMinutes >= 60
                        ? `${(artist.totalMinutes / 60).toFixed(1)}h`
                        : `${artist.totalMinutes}m`}
                    </td>
                    <td className="py-3 px-3 text-right text-zinc-400 hidden sm:table-cell">
                      {artist.uniqueTracks}
                    </td>
                    <td className="py-3 px-3 text-zinc-400 truncate max-w-[200px] hidden md:table-cell">
                      {artist.topTrack}
                    </td>
                    <td className="py-3 pl-3 pr-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                          <div
                            className="h-full bg-rose-500 rounded-full"
                            style={{ width: `${Math.min(100, artist.sharePct * 4)}%` }}
                          />
                        </div>
                        <span className="text-xs text-zinc-400 w-10 text-right">
                          {artist.sharePct}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-800/80 bg-zinc-950/60 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="py-3 pl-5 pr-3 w-12">#</th>
                  <th className="py-3 px-3">Track</th>
                  <th className="py-3 px-3 hidden sm:table-cell">Artist</th>
                  <th className="py-3 px-3 text-right">Plays</th>
                  <th className="py-3 px-3 text-right">Time</th>
                  <th className="py-3 pl-3 pr-5 text-right w-20">Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {tracks.map((track, idx) => (
                  <tr key={track.key} className="hover:bg-zinc-900/70 transition">
                    <td className="py-3 pl-5 pr-3 font-semibold text-zinc-500">{idx + 1}</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        {track.thumbnail ? (
                          <img
                            src={track.thumbnail}
                            alt={track.title}
                            className="h-9 w-9 rounded-lg object-cover bg-zinc-800 shrink-0"
                          />
                        ) : (
                          <div className="h-9 w-9 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                            <Music2 className="h-4 w-4 text-zinc-500" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-zinc-100 truncate max-w-[260px]">
                            {track.title}
                          </p>
                          <p className="text-xs text-zinc-400 sm:hidden truncate">{track.artist}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-zinc-300 hidden sm:table-cell">
                      <button
                        onClick={() => onSelectArtist(track.artist)}
                        className="hover:text-rose-400 transition text-left"
                      >
                        {track.artist}
                      </button>
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-white">
                      {track.plays.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right text-zinc-400">
                      {track.totalMinutes >= 60
                        ? `${(track.totalMinutes / 60).toFixed(1)}h`
                        : `${track.totalMinutes}m`}
                    </td>
                    <td className="py-3 pl-3 pr-5 text-right">
                      {track.url && (
                        <a
                          href={track.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-rose-400 transition"
                          title="Open in YouTube Music"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Artist Detail Drawer */}
      {selectedArtist && artistDetail && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#111116] border-l border-zinc-800 h-full overflow-y-auto p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                {artistDetail.stat?.thumbnail ? (
                  <img
                    src={artistDetail.stat.thumbnail}
                    alt={selectedArtist}
                    className="h-14 w-14 rounded-full object-cover bg-zinc-800"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-full bg-zinc-800 flex items-center justify-center text-lg font-bold text-zinc-400">
                    {selectedArtist.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-bold text-white">{selectedArtist}</h3>
                  <p className="text-xs text-zinc-400">
                    {artistDetail.stat?.plays.toLocaleString()} plays ·{' '}
                    {artistDetail.stat?.sharePct}% of your listening
                  </p>
                </div>
              </div>
              <button
                onClick={() => onSelectArtist(null)}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {artistDetail.stat && (
              <div className="grid grid-cols-3 gap-3 mt-5">
                <div className="rounded-xl bg-zinc-900/70 border border-zinc-800 p-3">
                  <div className="text-[11px] text-zinc-400">Time</div>
                  <div className="text-base font-bold text-white mt-0.5">
                    {(artistDetail.stat.totalMinutes / 60).toFixed(1)} hrs
                  </div>
                </div>
                <div className="rounded-xl bg-zinc-900/70 border border-zinc-800 p-3">
                  <div className="text-[11px] text-zinc-400">Unique Tracks</div>
                  <div className="text-base font-bold text-white mt-0.5">
                    {artistDetail.stat.uniqueTracks}
                  </div>
                </div>
                <div className="rounded-xl bg-zinc-900/70 border border-zinc-800 p-3">
                  <div className="text-[11px] text-zinc-400">First Played</div>
                  <div className="text-xs font-semibold text-white mt-1">
                    {new Date(artistDetail.stat.firstPlayed).toLocaleDateString()}
                  </div>
                </div>
              </div>
            )}

            <h4 className="text-sm font-semibold text-zinc-200 mt-6 mb-3">
              Tracks by {selectedArtist}
            </h4>
            <div className="space-y-2">
              {artistDetail.topTracks.map((t, i) => (
                <div
                  key={t.title}
                  className="flex items-center justify-between gap-3 rounded-xl bg-zinc-900/50 border border-zinc-800/60 px-3 py-2.5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-bold text-zinc-500 w-4">{i + 1}</span>
                    {t.thumbnail && (
                      <img
                        src={t.thumbnail}
                        alt={t.title}
                        className="h-8 w-8 rounded object-cover shrink-0"
                      />
                    )}
                    <span className="text-sm text-zinc-100 truncate">{t.title}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-semibold text-zinc-300">{t.plays} plays</span>
                    {t.url && (
                      <a
                        href={t.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-zinc-500 hover:text-rose-400"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
