import React, { useState } from 'react';
import { ExternalLink, Heart, History, ListMusic, RefreshCw, Users } from 'lucide-react';
import type { YTMusicLibrary, YTMusicStatus } from '../types';

interface LibraryViewProps {
  library: YTMusicLibrary | null;
  ytStatus: YTMusicStatus;
  isDemo: boolean;
  onOpenConnect: () => void;
  onSyncNow: () => Promise<void>;
}

function formatSec(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  library,
  ytStatus,
  isDemo,
  onOpenConnect,
  onSyncNow,
}) => {
  const [subTab, setSubTab] = useState<'history' | 'liked' | 'playlists' | 'artists'>('history');
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await onSyncNow();
    } finally {
      setSyncing(false);
    }
  };

  if (!library) {
    return (
      <div className="rounded-2xl border border-zinc-800/80 bg-[#101015] p-10 text-center space-y-4">
        <ListMusic className="h-10 w-10 text-rose-400 mx-auto" />
        <h3 className="text-lg font-semibold text-white">Connect Live YouTube Music</h3>
        <p className="text-sm text-zinc-400 max-w-md mx-auto">
          Link your YouTube Music session via browser headers to browse your recent listening
          history, liked songs, playlists, and subscribed artists.
        </p>
        <button
          onClick={onOpenConnect}
          className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-500 transition"
        >
          Connect YouTube Music
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-800/80 bg-[#101015] p-4">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'history', label: `Recent History (${library.history.length})`, icon: History },
            { id: 'liked', label: `Liked Songs (${library.likedSongs.length})`, icon: Heart },
            { id: 'playlists', label: `Playlists (${library.playlists.length})`, icon: ListMusic },
            { id: 'artists', label: `Artists (${library.libraryArtists.length})`, icon: Users },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setSubTab(item.id as any)}
                className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition ${
                  subTab === item.id
                    ? 'bg-rose-600 text-white'
                    : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {isDemo && !ytStatus.connected && (
            <button
              onClick={onOpenConnect}
              className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition"
            >
              Connect Real Account
            </button>
          )}
          {ytStatus.connected && (
            <button
              onClick={handleSync}
              disabled={syncing}
              className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-800 px-3.5 py-2 text-xs font-semibold text-white hover:bg-zinc-700 disabled:opacity-50 transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Refresh Library'}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {subTab === 'history' && (
        <div className="rounded-2xl border border-zinc-800/80 bg-[#101015] divide-y divide-zinc-800/60">
          {library.history.map((track, idx) => (
            <div
              key={`${track.videoId}-${idx}`}
              className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-zinc-900/50 transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                {track.thumbnail && (
                  <img
                    src={track.thumbnail}
                    alt={track.title}
                    className="h-10 w-10 rounded-lg object-cover bg-zinc-800 shrink-0"
                  />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-100 truncate">{track.title}</p>
                  <p className="text-xs text-zinc-400 truncate">
                    {track.artist}
                    {track.album ? ` · ${track.album}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0 text-xs text-zinc-400">
                {track.playedLabel && <span className="hidden sm:inline">{track.playedLabel}</span>}
                <span className="font-mono">{formatSec(track.durationSec)}</span>
                {track.url && (
                  <a
                    href={track.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-zinc-500 hover:text-rose-400"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {subTab === 'liked' && (
        <div className="rounded-2xl border border-zinc-800/80 bg-[#101015] divide-y divide-zinc-800/60">
          {library.likedSongs.map((track, idx) => (
            <div
              key={`${track.videoId}-${idx}`}
              className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-zinc-900/50 transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-5 text-xs font-semibold text-zinc-500">{idx + 1}</span>
                {track.thumbnail && (
                  <img
                    src={track.thumbnail}
                    alt={track.title}
                    className="h-10 w-10 rounded-lg object-cover bg-zinc-800 shrink-0"
                  />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-100 truncate">{track.title}</p>
                  <p className="text-xs text-zinc-400 truncate">{track.artist}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 text-xs text-zinc-400">
                <span className="font-mono">{formatSec(track.durationSec)}</span>
                {track.url && (
                  <a
                    href={track.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-zinc-500 hover:text-rose-400"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {subTab === 'playlists' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {library.playlists.map((pl, idx) => (
            <div
              key={pl.playlistId || idx}
              className="rounded-2xl border border-zinc-800/80 bg-[#101015] p-4 hover:border-zinc-700 transition"
            >
              {pl.thumbnail ? (
                <img
                  src={pl.thumbnail}
                  alt={pl.title}
                  className="w-full aspect-square rounded-xl object-cover bg-zinc-800 mb-3"
                />
              ) : (
                <div className="w-full aspect-square rounded-xl bg-zinc-800 flex items-center justify-center mb-3">
                  <ListMusic className="h-10 w-10 text-zinc-600" />
                </div>
              )}
              <p className="text-sm font-semibold text-white truncate">{pl.title}</p>
              <p className="text-xs text-zinc-400 mt-0.5">
                {pl.count ? `${pl.count} tracks` : 'Playlist'}
              </p>
            </div>
          ))}
        </div>
      )}

      {subTab === 'artists' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {library.libraryArtists.map((ar, idx) => (
            <div
              key={ar.browseId || idx}
              className="rounded-2xl border border-zinc-800/80 bg-[#101015] p-4 text-center hover:border-zinc-700 transition"
            >
              {ar.thumbnail ? (
                <img
                  src={ar.thumbnail}
                  alt={ar.name}
                  className="w-20 h-20 rounded-full object-cover bg-zinc-800 mx-auto mb-3"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-3 text-lg font-bold text-zinc-400">
                  {ar.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <p className="text-sm font-semibold text-white truncate">{ar.name}</p>
              {ar.subscribers && (
                <p className="text-[11px] text-zinc-400 mt-0.5">{ar.subscribers} subscribers</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
