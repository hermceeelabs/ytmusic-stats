import React, { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Award, Calendar, Check, Copy, Sparkles, TrendingUp } from 'lucide-react';
import type { AnalyticsSummary } from '../types';
import { formatListeningSpan } from '../utils/analytics';

interface HabitsViewProps {
  summary: AnalyticsSummary;
}

export const HabitsView: React.FC<HabitsViewProps> = ({ summary }) => {
  const [copied, setCopied] = useState(false);

  const topArtist = summary.topArtists[0];
  const topTrack = summary.topTracks[0];

  const handleCopySummary = async () => {
    const lines = [
      `🎧 My YouTube Music Stats`,
      `• Archetype: ${summary.archetype.title}`,
      `• Total Plays: ${summary.totalPlays.toLocaleString()} (${summary.totalHours} hrs / ${formatListeningSpan(summary.totalMinutes)})`,
      `• Unique Artists: ${summary.uniqueArtists.toLocaleString()} | Tracks: ${summary.uniqueTracks.toLocaleString()}`,
      topArtist ? `• #1 Artist: ${topArtist.name} (${topArtist.plays} plays)` : '',
      topTrack ? `• #1 Track: ${topTrack.title} by ${topTrack.artist} (${topTrack.plays} plays)` : '',
      `• Longest Streak: ${summary.longestStreakDays} days`,
    ]
      .filter(Boolean)
      .join('\n');

    await navigator.clipboard.writeText(lines);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Wrapped / Archetype Hero Card */}
      <div className="relative overflow-hidden rounded-3xl border border-rose-500/20 bg-gradient-to-br from-[#1b1019] via-[#12101a] to-[#0e131f] p-6 sm:p-8 shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-xl space-y-3">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-400">
              <Sparkles className="h-3.5 w-3.5" />
              Your Listening Personality
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              {summary.archetype.title}
            </h2>
            <p className="text-sm text-zinc-300 leading-relaxed">{summary.archetype.subtitle}</p>
          </div>

          <button
            onClick={handleCopySummary}
            className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 px-4 py-2.5 text-xs font-semibold text-white transition"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-emerald-400" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy Wrapped Summary
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
          <div className="rounded-2xl bg-black/35 border border-white/10 p-4">
            <div className="text-xs text-zinc-400">#1 Most Played Artist</div>
            <div className="mt-1 text-lg font-bold text-white truncate">
              {topArtist ? topArtist.name : '—'}
            </div>
            <div className="text-xs text-rose-300 mt-0.5">
              {topArtist ? `${topArtist.plays.toLocaleString()} plays (${topArtist.sharePct}%)` : ''}
            </div>
          </div>
          <div className="rounded-2xl bg-black/35 border border-white/10 p-4">
            <div className="text-xs text-zinc-400">#1 Most Played Track</div>
            <div className="mt-1 text-lg font-bold text-white truncate">
              {topTrack ? topTrack.title : '—'}
            </div>
            <div className="text-xs text-violet-300 mt-0.5 truncate">
              {topTrack ? `${topTrack.artist} · ${topTrack.plays.toLocaleString()} plays` : ''}
            </div>
          </div>
          <div className="rounded-2xl bg-black/35 border border-white/10 p-4">
            <div className="text-xs text-zinc-400">Most Active Day Ever</div>
            <div className="mt-1 text-lg font-bold text-white">
              {summary.mostActiveDate
                ? new Date(summary.mostActiveDate.date + 'T00:00:00').toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : '—'}
            </div>
            <div className="text-xs text-cyan-300 mt-0.5">
              {summary.mostActiveDate
                ? `${summary.mostActiveDate.plays.toLocaleString()} tracks played`
                : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Discovery Chart + Milestones */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-zinc-800/80 bg-[#101015] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-white">New Artist Discovery</h3>
              <p className="text-xs text-zinc-400">
                First-time artists discovered per period
              </p>
            </div>
            <TrendingUp className="h-5 w-5 text-cyan-400" />
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={summary.timeSeries}
                margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
              >
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
                <Bar dataKey="newArtists" name="New Artists" fill="#06b6d4" radius={[4, 4, 0, 0]}>
                  {summary.timeSeries.length <= 35 && (
                    <LabelList
                      dataKey="newArtists"
                      position="top"
                      fill="#e4e4e7"
                      fontSize={10}
                      formatter={(v: unknown) => (Number(v) > 0 ? String(v) : '')}
                    />
                  )}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800/80 bg-[#101015] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-white">Milestones & Habits</h3>
            <Award className="h-5 w-5 text-amber-400" />
          </div>

          <div className="space-y-3">
            <div className="rounded-xl bg-zinc-900/60 border border-zinc-800/70 p-3.5">
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Calendar className="h-3.5 w-3.5 text-rose-400" />
                Active Listening Days
              </div>
              <div className="text-xl font-bold text-white mt-1">
                {summary.activeDays.toLocaleString()} days
              </div>
              <div className="text-xs text-zinc-500 mt-0.5">
                Averaging {summary.avgPlaysPerActiveDay} tracks per active day
              </div>
            </div>

            <div className="rounded-xl bg-zinc-900/60 border border-zinc-800/70 p-3.5">
              <div className="text-xs text-zinc-400">Longest Daily Streak</div>
              <div className="text-xl font-bold text-white mt-1">
                {summary.longestStreakDays} consecutive days
              </div>
              <div className="text-xs text-zinc-500 mt-0.5">
                {summary.currentStreakDays > 0
                  ? `Active right now: ${summary.currentStreakDays} days`
                  : 'Listen today to start a new streak'}
              </div>
            </div>

            <div className="rounded-xl bg-zinc-900/60 border border-zinc-800/70 p-3.5">
              <div className="text-xs text-zinc-400">Variety & Discovery Ratio</div>
              <div className="text-xl font-bold text-white mt-1">
                {summary.discoveryRatePct}%
              </div>
              <div className="text-xs text-zinc-500 mt-0.5">
                {summary.uniqueArtists.toLocaleString()} artists across{' '}
                {summary.totalPlays.toLocaleString()} plays
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
