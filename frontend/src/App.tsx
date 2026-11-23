import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Database,
  GitCompareArrows,
  LayoutDashboard,
  Loader2,
  Music,
  Search,
  Sparkles,
  UploadCloud,
} from 'lucide-react';
import { CompareView } from './components/CompareView';
import { ConnectModal } from './components/ConnectModal';
import { HabitsView } from './components/HabitsView';
import { OverviewView } from './components/OverviewView';
import { TopChartsView } from './components/TopChartsView';
import type {
  DateFilter,
  DateRangePreset,
  Granularity,
  NavTab,
  PlayEvent,
  TakeoutStats,
} from './types';
import {
  computeAnalytics,
  filterEventsByDateRange,
  getAvailableYears,
} from './utils/analytics';
import { loadFromDB, saveToDB } from './utils/storage';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [visitedTabs, setVisitedTabs] = useState<Set<NavTab>>(() => new Set(['overview']));
  const [dateFilter, setDateFilter] = useState<DateFilter>({
    preset: 'ytd',
    year: null,
    month: null,
  });
  const [granularity, setGranularity] = useState<Granularity>('month');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  const [connectOpen, setConnectOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [demoEvents, setDemoEvents] = useState<PlayEvent[]>([]);
  const [takeoutEvents, setTakeoutEvents] = useState<PlayEvent[]>([]);

  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        const savedTakeout = await loadFromDB<PlayEvent[]>('takeoutEvents');
        if (!mounted) return;

        if (savedTakeout && savedTakeout.length > 0) {
          setTakeoutEvents(savedTakeout);
          setLoading(false);
          return;
        }

        // Only fetch demo data if no user Takeout data is cached locally
        const demoRes = await fetch('/api/demo').then((r) => (r.ok ? r.json() : null));
        if (!mounted) return;
        if (demoRes) {
          setDemoEvents(demoRes.events || []);
        }
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    init();
    return () => {
      mounted = false;
    };
  }, []);

  const switchTab = (tab: NavTab) => {
    setActiveTab(tab);
    setVisitedTabs((prev) => {
      if (prev.has(tab)) return prev;
      const next = new Set(prev);
      next.add(tab);
      return next;
    });
  };

  const isDemo = takeoutEvents.length === 0;
  const activeEvents = useMemo(
    () => (takeoutEvents.length > 0 ? takeoutEvents : demoEvents),
    [takeoutEvents, demoEvents]
  );

  const availableYears = useMemo(
    () => getAvailableYears(activeEvents),
    [activeEvents]
  );

  const filteredEvents = useMemo(
    () => filterEventsByDateRange(activeEvents, dateFilter, searchQuery),
    [activeEvents, dateFilter, searchQuery]
  );

  const summary = useMemo(
    () => computeAnalytics(filteredEvents, granularity),
    [filteredEvents, granularity]
  );

  const handlePresetClick = (preset: DateRangePreset) => {
    setDateFilter({ preset, year: null, month: null });
    if (preset === '30d' || preset === '90d') setGranularity('day');
    else setGranularity('month');
  };

  const handleYearChange = (val: string) => {
    const year = val === '' ? null : Number(val);
    if (year === null && dateFilter.month === null) {
      setDateFilter({ preset: 'all', year: null, month: null });
      setGranularity('month');
    } else {
      setDateFilter({ preset: 'custom', year, month: dateFilter.month });
      setGranularity(dateFilter.month !== null ? 'day' : 'month');
    }
  };

  const handleMonthChange = (val: string) => {
    const month = val === '' ? null : Number(val);
    if (month === null && dateFilter.year === null) {
      setDateFilter({ preset: 'all', year: null, month: null });
      setGranularity('month');
    } else {
      setDateFilter({ preset: 'custom', year: dateFilter.year, month });
      setGranularity(month !== null ? 'day' : 'month');
    }
  };

  const handleTakeoutUploaded = async (events: PlayEvent[], _stats: TakeoutStats) => {
    // Pre-sort chronologically once so analytics doesn't re-sort on every filter change
    const sorted = [...events].sort((a, b) => b.playedAt.localeCompare(a.playedAt));
    setTakeoutEvents(sorted);
    await saveToDB('takeoutEvents', sorted);
  };

  const handleTakeoutCleared = async () => {
    setTakeoutEvents([]);
    await saveToDB('takeoutEvents', []);
    if (demoEvents.length === 0) {
      const demoRes = await fetch('/api/demo').then((r) => (r.ok ? r.json() : null));
      if (demoRes) setDemoEvents(demoRes.events || []);
    }
  };

  const handleSelectArtistFromOverview = (name: string) => {
    setSelectedArtist(name);
    switchTab('charts');
  };

  return (
    <div className="min-h-screen bg-[#070709] text-zinc-100 flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-zinc-800/80 bg-[#09090d]/85 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center shadow-lg shadow-rose-500/20">
              <Music className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-white">Pulse</span>
                <span className="text-xs font-medium text-zinc-400">
                  YT Music Stats
                </span>
              </div>
            </div>
          </div>

          {/* Nav Tabs */}
          <nav className="hidden md:flex items-center gap-1 rounded-xl bg-zinc-900/80 p-1 border border-zinc-800/80">
            {[
              { id: 'overview', label: 'Overview', icon: LayoutDashboard },
              { id: 'charts', label: 'Top Charts', icon: BarChart3 },
              { id: 'habits', label: 'Habits & Wrapped', icon: Sparkles },
              { id: 'compare', label: 'Compare Years', icon: GitCompareArrows },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => switchTab(item.id as NavTab)}
                  className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-medium transition ${
                    activeTab === item.id
                      ? 'bg-zinc-800 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Data Status & Import CTA */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-xs">
              <Database className="h-3.5 w-3.5 text-zinc-400" />
              {isDemo ? (
                <span className="text-amber-300 font-medium">Demo Data</span>
              ) : (
                <span className="text-emerald-400 font-medium">
                  {takeoutEvents.length.toLocaleString()} plays
                </span>
              )}
            </div>
            <button
              onClick={() => setConnectOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-rose-500 transition shadow-lg shadow-rose-600/20"
            >
              <UploadCloud className="h-4 w-4" />
              <span>{isDemo ? 'Import Data' : 'Manage Data'}</span>
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        <div className="flex md:hidden border-t border-zinc-800/60 px-4 py-2 gap-1 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'charts', label: 'Top Charts' },
            { id: 'habits', label: 'Habits' },
            { id: 'compare', label: 'Compare' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => switchTab(item.id as NavTab)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium shrink-0 transition ${
                activeTab === item.id
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 sm:px-6 py-6 space-y-6">
        {/* Demo Banner */}
        {isDemo && !loading && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
            <div>
              <span className="font-semibold">Viewing interactive demo data.</span> Upload your
              Google Takeout <code className="text-amber-100">watch-history.json</code> or{' '}
              <code className="text-amber-100">.zip</code> to visualize your own listening history.
            </div>
            <button
              onClick={() => setConnectOpen(true)}
              className="rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-amber-300 transition"
            >
              Import My Data
            </button>
          </div>
        )}

        {/* Global Filter Bar (shown on single-period analytics tabs) */}
        {activeTab !== 'compare' && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap items-center gap-1 rounded-xl bg-zinc-900/70 p-1 border border-zinc-800/80">
                {(
                  [
                    { id: 'all', label: 'All Time' },
                    { id: '30d', label: '30 Days' },
                    { id: '90d', label: '90 Days' },
                    { id: '1y', label: 'Last 365d' },
                    { id: 'ytd', label: 'YTD' },
                  ] as { id: DateRangePreset; label: string }[]
                ).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handlePresetClick(p.id)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      dateFilter.preset === p.id
                        ? 'bg-zinc-800 text-white'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Year -> Month selectors */}
              <div className="flex items-center gap-1.5">
                <select
                  value={dateFilter.year ?? ''}
                  onChange={(e) => handleYearChange(e.target.value)}
                  aria-label="Filter by year"
                  className={`rounded-xl border bg-[#101015] px-3 py-1.5 text-xs font-medium focus:border-rose-500 focus:outline-none transition ${
                    dateFilter.preset === 'custom' && dateFilter.year !== null
                      ? 'border-rose-500 text-white'
                      : 'border-zinc-800 text-zinc-300'
                  }`}
                >
                  <option value="">All Years</option>
                  {availableYears.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>

                <select
                  value={dateFilter.month ?? ''}
                  onChange={(e) => handleMonthChange(e.target.value)}
                  aria-label="Filter by month"
                  className={`rounded-xl border bg-[#101015] px-3 py-1.5 text-xs font-medium focus:border-rose-500 focus:outline-none transition ${
                    dateFilter.preset === 'custom' && dateFilter.month !== null
                      ? 'border-rose-500 text-white'
                      : 'border-zinc-800 text-zinc-300'
                  }`}
                >
                  <option value="">All Months</option>
                  {MONTHS.map((mName, idx) => (
                    <option key={mName} value={idx}>
                      {mName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="h-4 w-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search artist or track..."
                className="w-full rounded-xl border border-zinc-800 bg-[#101015] pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-rose-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-28 gap-3 text-zinc-400">
            <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
            <p className="text-sm">Loading your music stats...</p>
          </div>
        ) : (
          <>
            <div className={activeTab === 'overview' ? 'block' : 'hidden'}>
              <OverviewView
                summary={summary}
                granularity={granularity}
                onGranularityChange={setGranularity}
                onSelectArtist={handleSelectArtistFromOverview}
                onViewAllCharts={() => switchTab('charts')}
              />
            </div>
            {visitedTabs.has('charts') && (
              <div className={activeTab === 'charts' ? 'block' : 'hidden'}>
                <TopChartsView
                  summary={summary}
                  filteredEvents={filteredEvents}
                  selectedArtist={selectedArtist}
                  onSelectArtist={setSelectedArtist}
                />
              </div>
            )}
            {visitedTabs.has('habits') && (
              <div className={activeTab === 'habits' ? 'block' : 'hidden'}>
                <HabitsView summary={summary} />
              </div>
            )}
            {visitedTabs.has('compare') && (
              <div className={activeTab === 'compare' ? 'block' : 'hidden'}>
                <CompareView
                  events={activeEvents}
                  availableYears={availableYears}
                  onSelectArtist={handleSelectArtistFromOverview}
                />
              </div>
            )}
          </>
        )}
      </main>

      <ConnectModal
        isOpen={connectOpen}
        onClose={() => setConnectOpen(false)}
        takeoutCount={takeoutEvents.length}
        onTakeoutUploaded={handleTakeoutUploaded}
        onTakeoutCleared={handleTakeoutCleared}
      />
    </div>
  );
}

export default App;
