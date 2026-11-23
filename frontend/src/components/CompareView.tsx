import React, { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowDownRight, ArrowUpRight, GitCompareArrows, Pin, PinOff } from 'lucide-react';
import type { PlayEvent } from '../types';
import { computeYearlyComparison } from '../utils/analytics';

interface CompareViewProps {
  events: PlayEvent[];
  availableYears: number[];
  onSelectArtist: (name: string) => void;
}

const YEAR_COLORS = ['#f43f5e', '#06b6d4', '#8b5cf6', '#f59e0b', '#10b981', '#ec4899'];

export const CompareView: React.FC<CompareViewProps> = ({
  events,
  availableYears,
  onSelectArtist,
}) => {
  const [selectedYears, setSelectedYears] = useState<number[]>(() =>
    availableYears.slice(0, 2)
  );
  const [metric, setMetric] = useState<'plays' | 'minutes'>('plays');
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const [pinned, setPinned] = useState<boolean>(true);

  useEffect(() => {
    setSelectedYears((prev) => {
      const valid = prev.filter((y) => availableYears.includes(y));
      if (valid.length > 0) return valid;
      return availableYears.slice(0, 2);
    });
  }, [availableYears]);

  const toggleYear = (y: number) => {
    setSelectedYears((prev) => {
      if (prev.includes(y)) {
        if (prev.length === 1) return prev; // Keep at least 1 year selected
        return prev.filter((item) => item !== y);
      }
      return [...prev, y];
    });
  };

  const comparison = useMemo(
    () => computeYearlyComparison(events, selectedYears, metric),
    [events, selectedYears, metric]
  );

  if (availableYears.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800/80 bg-[#101015] p-10 text-center text-sm text-zinc-400">
        No yearly data available yet.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Year Selector Bar */}
      <div
        className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-800/80 bg-[#101015]/95 backdrop-blur-md p-4 transition ${
          pinned ? 'sticky top-[4.25rem] z-20 shadow-xl shadow-black/40' : ''
        }`}
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <GitCompareArrows className="h-4 w-4 text-rose-400" />
            <span>Compare Years:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {availableYears.map((y) => {
              const activeIdx = comparison.years.indexOf(y);
              const isSelected = activeIdx !== -1;
              const color = isSelected
                ? YEAR_COLORS[activeIdx % YEAR_COLORS.length]
                : undefined;

              return (
                <button
                  key={y}
                  onClick={() => toggleYear(y)}
                  className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold border transition ${
                    isSelected
                      ? 'bg-zinc-800 text-white border-zinc-600'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  {isSelected && (
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                  )}
                  {y}
                </button>
              );
            })}
          </div>
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
            {(['line', 'bar'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setChartType(t)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md capitalize transition ${
                  chartType === t
                    ? 'bg-rose-600 text-white'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <button
            onClick={() => setPinned((p) => !p)}
            title={pinned ? 'Unpin toolbar' : 'Pin toolbar to top while scrolling'}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
              pinned
                ? 'border-rose-500/50 bg-rose-500/10 text-rose-300'
                : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {pinned ? <Pin className="h-3.5 w-3.5" /> : <PinOff className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{pinned ? 'Pinned' : 'Pin'}</span>
          </button>
        </div>
      </div>

      {/* Side-by-Side Year Scorecards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {comparison.years.map((y, idx) => {
          const s = comparison.summaries[y];
          const prevYear = idx > 0 ? comparison.summaries[comparison.years[idx - 1]] : null;
          const deltaPct =
            prevYear && prevYear.totalPlays > 0
              ? Number(
                  (((s.totalPlays - prevYear.totalPlays) / prevYear.totalPlays) * 100).toFixed(1)
                )
              : null;
          const color = YEAR_COLORS[idx % YEAR_COLORS.length];

          return (
            <div
              key={y}
              className="rounded-2xl border border-zinc-800/80 bg-[#101015] p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <h3 className="text-xl font-bold text-white">{y}</h3>
                </div>
                {deltaPct !== null && (
                  <span
                    className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
                      deltaPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {deltaPct >= 0 ? (
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    ) : (
                      <ArrowDownRight className="h-3.5 w-3.5" />
                    )}
                    {deltaPct >= 0 ? `+${deltaPct}%` : `${deltaPct}%`} vs {comparison.years[idx - 1]}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl bg-zinc-900/60 border border-zinc-800/70 p-3">
                  <div className="text-zinc-400">Total Plays</div>
                  <div className="text-lg font-bold text-white mt-0.5">
                    {s.totalPlays.toLocaleString()}
                  </div>
                </div>
                <div className="rounded-xl bg-zinc-900/60 border border-zinc-800/70 p-3">
                  <div className="text-zinc-400">Listening Time</div>
                  <div className="text-lg font-bold text-white mt-0.5">
                    {s.totalHours.toLocaleString()} hrs
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    {s.totalMinutes.toLocaleString()} mins
                  </div>
                </div>
                <div className="rounded-xl bg-zinc-900/60 border border-zinc-800/70 p-3">
                  <div className="text-zinc-400">Unique Artists</div>
                  <div className="text-base font-bold text-white mt-0.5">
                    {s.uniqueArtists.toLocaleString()}
                  </div>
                </div>
                <div className="rounded-xl bg-zinc-900/60 border border-zinc-800/70 p-3">
                  <div className="text-zinc-400">Longest Streak</div>
                  <div className="text-base font-bold text-white mt-0.5">
                    {s.longestStreakDays} days
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 pt-1 border-t border-zinc-800/60 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-zinc-500">#1 Artist</span>
                  <span className="font-medium text-zinc-200 truncate">
                    {s.topArtists[0]
                      ? `${s.topArtists[0].name} (${s.topArtists[0].plays})`
                      : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-zinc-500">#1 Track</span>
                  <span className="font-medium text-zinc-200 truncate max-w-[200px]">
                    {s.topTracks[0]
                      ? `${s.topTracks[0].title} (${s.topTracks[0].plays})`
                      : '—'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Monthly Overlay Chart (Jan - Dec) */}
      <div className="rounded-2xl border border-zinc-800/80 bg-[#101015] p-5">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-white">
            Month-by-Month Overlay (Jan – Dec)
          </h3>
          <p className="text-xs text-zinc-400">
            Compare {metric} across each month of the selected years
          </p>
        </div>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'line' ? (
              <LineChart
                data={comparison.monthlyOverlay}
                margin={{ top: 8, right: 12, left: -12, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis
                  dataKey="month"
                  stroke="#71717a"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
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
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                {comparison.years.map((y, idx) => {
                  const color = YEAR_COLORS[idx % YEAR_COLORS.length];
                  return (
                    <Line
                      key={y}
                      type="monotone"
                      dataKey={String(y)}
                      name={String(y)}
                      stroke={color}
                      strokeWidth={2.5}
                      dot={{ r: 4.5, fill: color, stroke: '#070709', strokeWidth: 1.5 }}
                      activeDot={{ r: 6.5, stroke: '#ffffff', strokeWidth: 1.5 }}
                    >
                      <LabelList
                        dataKey={String(y)}
                        position="top"
                        offset={8}
                        fill={color}
                        fontSize={10}
                        fontWeight={600}
                        formatter={(v: unknown) => (Number(v) > 0 ? String(v) : '')}
                      />
                    </Line>
                  );
                })}
              </LineChart>
            ) : (
              <BarChart
                data={comparison.monthlyOverlay}
                margin={{ top: 8, right: 12, left: -12, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis
                  dataKey="month"
                  stroke="#71717a"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
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
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                {comparison.years.map((y, idx) => (
                  <Bar
                    key={y}
                    dataKey={String(y)}
                    name={String(y)}
                    fill={YEAR_COLORS[idx % YEAR_COLORS.length]}
                    radius={[4, 4, 0, 0]}
                  >
                    {comparison.years.length <= 3 && (
                      <LabelList
                        dataKey={String(y)}
                        position="top"
                        fill="#e4e4e7"
                        fontSize={10}
                        formatter={(v: unknown) => (Number(v) > 0 ? String(v) : '')}
                      />
                    )}
                  </Bar>
                ))}
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Artists Across Selected Years Matrix */}
      <div className="rounded-2xl border border-zinc-800/80 bg-[#101015] overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800/80">
          <h3 className="text-base font-semibold text-white">
            Top Artists Across Selected Years
          </h3>
          <p className="text-xs text-zinc-400">
            See how your favorite artists shifted year over year
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-800/80 bg-zinc-950/60 text-xs uppercase text-zinc-500">
              <tr>
                <th className="py-3 pl-5 pr-3 w-12">#</th>
                <th className="py-3 px-3">Artist</th>
                {comparison.years.map((y) => (
                  <th key={y} className="py-3 px-3 text-right">
                    {y}
                  </th>
                ))}
                <th className="py-3 pl-3 pr-5 text-right">Combined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {comparison.artistMatrix.map((row, idx) => (
                <tr
                  key={row.name}
                  onClick={() => onSelectArtist(row.name)}
                  className="cursor-pointer hover:bg-zinc-900/70 transition"
                >
                  <td className="py-3 pl-5 pr-3 font-semibold text-zinc-500">{idx + 1}</td>
                  <td className="py-3 px-3 font-medium text-zinc-100">{row.name}</td>
                  {comparison.years.map((y) => (
                    <td key={y} className="py-3 px-3 text-right text-zinc-300 font-mono text-xs">
                      {(row.byYear[y] ?? 0).toLocaleString()}
                    </td>
                  ))}
                  <td className="py-3 pl-3 pr-5 text-right font-semibold text-white font-mono text-xs">
                    {row.totalPlays.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
