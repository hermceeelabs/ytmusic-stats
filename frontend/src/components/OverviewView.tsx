import React, { useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Clock, Disc3, Flame, Headphones, Music2, Users } from 'lucide-react';
import type { AnalyticsSummary, Granularity } from '../types';
import { DAY_NAMES, formatListeningSpan } from '../utils/analytics';

interface OverviewViewProps {
  summary: AnalyticsSummary;
  granularity: Granularity;
  onGranularityChange: (g: Granularity) => void;
  onSelectArtist: (name: string) => void;
  onViewAllCharts: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  summary,
  granularity,
  onGranularityChange,
  onSelectArtist,
  onViewAllCharts,
}) => {
  const [metric, setMetric] = useState<'plays' | 'minutes'>('plays');

  const maxHeat = Math.max(
    1,
    ...summary.heatmap.flatMap((row) => row)
  );

  const formatHour = (h: number) => {
    const suffix = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12} ${suffix}`;
  };

  const kpis = [
    {
      label: 'Total Plays',
      value: summary.totalPlays.toLocaleString(),
      sub: `${summary.avgPlaysPerActiveDay} plays / active day`,
      icon: Headphones,
      accent: 'text-rose-400 bg-rose-500/10',
    },
    {
      label: 'Listening Time',
      value: `${summary.totalHours.toLocaleString()} hrs`,
      sub: `${summary.totalMinutes.toLocaleString()} mins · ${formatListeningSpan(summary.totalMinutes)}`,
      icon: Clock,
      accent: 'text-violet-400 bg-violet-500/10',
    },
    {
      label: 'Unique Artists',
      value: summary.uniqueArtists.toLocaleString(),
      sub: `${summary.discoveryRatePct}% discovery rate`,
      icon: Users,
      accent: 'text-cyan-400 bg-cyan-500/10',
    },
    {
      label: 'Unique Tracks',
      value: summary.uniqueTracks.toLocaleString(),
      sub: `Across ${summary.activeDays.toLocaleString()} active days`,
      icon: Disc3,
      accent: 'text-amber-400 bg-amber-500/10',
    },
    {
      label: 'Longest Streak',
      value: `${summary.longestStreakDays} days`,
      sub:
        summary.currentStreakDays > 0
          ? `Current streak: ${summary.currentStreakDays}d`
          : 'No active streak today',
      icon: Flame,
      accent: 'text-orange-400 bg-orange-500/10',
    },
    {
      label: 'Peak Listening',
      value: formatHour(summary.peakHour),
      sub: `Most active on ${summary.peakDayOfWeek}s`,
      icon: Music2,
      accent: 'text-emerald-400 bg-emerald-500/10',
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="rounded-2xl border border-zinc-800/80 bg-[#101015] p-4 hover:border-zinc-700/80 transition"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-400">{kpi.label}</span>
                <div className={`rounded-lg p-1.5 ${kpi.accent}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2.5 text-2xl font-bold tracking-tight text-white">
                {kpi.value}
              </div>
              <div className="mt-1 text-[11px] text-zinc-500 truncate">{kpi.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Main Timeline + 24h Rhythm */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Listening Activity Over Time */}
        <div className="xl:col-span-2 rounded-2xl border border-zinc-800/80 bg-[#101015] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-base font-semibold text-white">Listening Activity Over Time</h3>
              <p className="text-xs text-zinc-400">
                Track how your listening volume shifts across days, weeks, or months
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg bg-zinc-900 p-0.5 border border-zinc-800">
                {(['plays', 'minutes'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMetric(m)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md capitalize transition ${
                      metric === m ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <div className="flex rounded-lg bg-zinc-900 p-0.5 border border-zinc-800">
                {(['day', 'week', 'month'] as Granularity[]).map((g) => (
                  <button
                    key={g}
                    onClick={() => onGranularityChange(g)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md capitalize transition ${
                      granularity === g
                        ? 'bg-rose-600 text-white'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={summary.timeSeries} margin={{ top: 20, right: 12, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="roseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="#71717a"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={24}
                />
                <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    borderColor: '#3f3f46',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#f4f4f5',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey={metric}
                  stroke="#f43f5e"
                  strokeWidth={2.4}
                  fillOpacity={1}
                  fill="url(#roseGrad)"
                  dot={
                    summary.timeSeries.length <= 90
                      ? { r: 4, fill: '#f43f5e', stroke: '#070709', strokeWidth: 1.5 }
                      : false
                  }
                  activeDot={{ r: 6, fill: '#fb7185', stroke: '#ffffff', strokeWidth: 1.5 }}
                >
                  {summary.timeSeries.length <= 35 && (
                    <LabelList
                      dataKey={metric}
                      position="top"
                      offset={8}
                      fill="#e4e4e7"
                      fontSize={10}
                      fontWeight={600}
                    />
                  )}
                </Area>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 24-Hour Listening Clock */}
        <div className="rounded-2xl border border-zinc-800/80 bg-[#101015] p-5">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-white">24-Hour Listening Clock</h3>
            <p className="text-xs text-zinc-400">Your daily rhythm by hour of day</p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={summary.hourlyDistribution}
                margin={{ top: 8, right: 4, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis
                  dataKey="hour"
                  stroke="#71717a"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  interval={3}
                  tickFormatter={(h) => `${h}h`}
                />
                <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  labelFormatter={(h) => `${String(h).padStart(2, '0')}:00 – ${String(h).padStart(2, '0')}:59`}
                  contentStyle={{
                    backgroundColor: '#18181b',
                    borderColor: '#3f3f46',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#f4f4f5',
                  }}
                />
                <Bar dataKey="plays" fill="#8b5cf6" radius={[4, 4, 0, 0]}>
                  <LabelList
                    dataKey="plays"
                    position="top"
                    fill="#a1a1aa"
                    fontSize={9}
                    formatter={(v: unknown) => (Number(v) > 0 ? String(v) : '')}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Day x Hour Heatmap */}
      <div className="rounded-2xl border border-zinc-800/80 bg-[#101015] p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-base font-semibold text-white">Weekly Listening Heatmap</h3>
            <p className="text-xs text-zinc-400">Intensity of plays by day of week and hour</p>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
            <span>Less</span>
            <span className="h-3 w-3 rounded-sm bg-zinc-900 border border-zinc-800" />
            <span className="h-3 w-3 rounded-sm bg-rose-950" />
            <span className="h-3 w-3 rounded-sm bg-rose-700" />
            <span className="h-3 w-3 rounded-sm bg-rose-500" />
            <span className="h-3 w-3 rounded-sm bg-rose-400" />
            <span>More</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[640px] space-y-1.5">
            <div className="grid grid-cols-[44px_repeat(24,minmax(0,1fr))] gap-1 text-[10px] text-zinc-500 mb-1">
              <div />
              {Array.from({ length: 24 }, (_, h) => (
                <div key={h} className="text-center">
                  {h % 3 === 0 ? `${h}` : ''}
                </div>
              ))}
            </div>
            {summary.heatmap.map((row, dow) => (
              <div
                key={DAY_NAMES[dow]}
                className="grid grid-cols-[44px_repeat(24,minmax(0,1fr))] gap-1 items-center"
              >
                <div className="text-xs font-medium text-zinc-400">{DAY_NAMES[dow]}</div>
                {row.map((val, hour) => {
                  const ratio = val / maxHeat;
                  let bg = 'bg-zinc-900/90 border-zinc-800/60';
                  if (val > 0) {
                    if (ratio > 0.75) bg = 'bg-rose-400 border-rose-300/40';
                    else if (ratio > 0.5) bg = 'bg-rose-500 border-rose-400/30';
                    else if (ratio > 0.25) bg = 'bg-rose-700/90 border-rose-600/30';
                    else bg = 'bg-rose-950/90 border-rose-900/40';
                  }
                  return (
                    <div
                      key={hour}
                      title={`${DAY_NAMES[dow]} ${String(hour).padStart(2, '0')}:00 — ${val} plays`}
                      className={`h-5 rounded-[4px] border ${bg} transition hover:scale-110`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Top 5 Artists & Top 5 Tracks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 Artists */}
        <div className="rounded-2xl border border-zinc-800/80 bg-[#101015] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-white">Top Artists</h3>
            <button
              onClick={onViewAllCharts}
              className="text-xs font-medium text-rose-400 hover:text-rose-300 transition"
            >
              View all →
            </button>
          </div>
          <div className="space-y-3">
            {summary.topArtists.slice(0, 5).map((artist, idx) => (
              <button
                key={artist.name}
                onClick={() => onSelectArtist(artist.name)}
                className="w-full flex items-center gap-3 rounded-xl p-2 hover:bg-zinc-900/80 transition text-left"
              >
                <span className="w-5 text-xs font-bold text-zinc-500 text-center">{idx + 1}</span>
                {artist.thumbnail ? (
                  <img
                    src={artist.thumbnail}
                    alt={artist.name}
                    loading="lazy"
                    className="h-10 w-10 rounded-full object-cover bg-zinc-800 shrink-0"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400 shrink-0">
                    {artist.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-zinc-100 truncate">{artist.name}</p>
                    <span className="text-xs font-semibold text-zinc-300 shrink-0">
                      {artist.plays.toLocaleString()} plays
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-rose-500 to-violet-500"
                      style={{
                        width: `${Math.min(
                          100,
                          (artist.plays / Math.max(1, summary.topArtists[0]?.plays ?? 1)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Top 5 Tracks */}
        <div className="rounded-2xl border border-zinc-800/80 bg-[#101015] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-white">Top Tracks</h3>
            <button
              onClick={onViewAllCharts}
              className="text-xs font-medium text-rose-400 hover:text-rose-300 transition"
            >
              View all →
            </button>
          </div>
          <div className="space-y-3">
            {summary.topTracks.slice(0, 5).map((track, idx) => (
              <div
                key={track.key}
                className="flex items-center gap-3 rounded-xl p-2 hover:bg-zinc-900/80 transition"
              >
                <span className="w-5 text-xs font-bold text-zinc-500 text-center">{idx + 1}</span>
                {track.thumbnail ? (
                  <img
                    src={track.thumbnail}
                    alt={track.title}
                    loading="lazy"
                    className="h-10 w-10 rounded-lg object-cover bg-zinc-800 shrink-0"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                    <Music2 className="h-4 w-4 text-zinc-500" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-zinc-100 truncate">{track.title}</p>
                    <span className="text-xs font-semibold text-zinc-300 shrink-0">
                      {track.plays.toLocaleString()} plays
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 truncate">{track.artist}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
