import React, { useRef, useState } from 'react';
import {
  CheckCircle2,
  FileArchive,
  KeyRound,
  Loader2,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type { TakeoutStats, YTMusicStatus } from '../types';
import { parseTakeoutFile } from '../utils/takeoutParser';

interface ConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  ytStatus: YTMusicStatus;
  takeoutCount: number;
  onTakeoutUploaded: (events: any[], stats: TakeoutStats) => void;
  onTakeoutCleared: () => void;
  onYTMusicConnected: (status: YTMusicStatus) => void;
  onYTMusicSynced: () => Promise<void>;
  onYTMusicDisconnected: () => Promise<void>;
}

export const ConnectModal: React.FC<ConnectModalProps> = ({
  isOpen,
  onClose,
  ytStatus,
  takeoutCount,
  onTakeoutUploaded,
  onTakeoutCleared,
  onYTMusicConnected,
  onYTMusicSynced,
  onYTMusicDisconnected,
}) => {
  const [tab, setTab] = useState<'takeout' | 'live'>('takeout');
  const [includeGeneral, setIncludeGeneral] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<TakeoutStats | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [headersRaw, setHeadersRaw] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFile = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    setUploadResult(null);
    try {
      const data = await parseTakeoutFile(file, includeGeneral);
      setUploadResult(data.stats);
      onTakeoutUploaded(data.events, data.stats);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to parse Takeout file.');
    } finally {
      setUploading(false);
    }
  };

  const handleConnectLive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!headersRaw.trim()) return;
    setConnecting(true);
    setLiveError(null);
    try {
      const res = await fetch('/api/ytmusic/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headers_raw: headersRaw }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Connection failed.');
      }
      onYTMusicConnected(data);
      setHeadersRaw('');
      setSyncing(true);
      await onYTMusicSynced();
    } catch (err: any) {
      setLiveError(err.message || 'Failed to connect.');
    } finally {
      setConnecting(false);
      setSyncing(false);
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    setLiveError(null);
    try {
      await onYTMusicSynced();
    } catch (err: any) {
      setLiveError(err.message || 'Sync failed.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-zinc-800 bg-[#111116] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Connect Your YouTube Music Data</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Combine full multi-year Google Takeout history with live YouTube Music library sync.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-800/80 bg-zinc-950/40 px-6 gap-6">
          <button
            onClick={() => setTab('takeout')}
            className={`py-3 text-sm font-medium border-b-2 transition flex items-center gap-2 ${
              tab === 'takeout'
                ? 'border-rose-500 text-white'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileArchive className="h-4 w-4" />
            Google Takeout (Full History)
            {takeoutCount > 0 && (
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] text-emerald-400">
                {takeoutCount.toLocaleString()} plays
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('live')}
            className={`py-3 text-sm font-medium border-b-2 transition flex items-center gap-2 ${
              tab === 'live'
                ? 'border-rose-500 text-white'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <KeyRound className="h-4 w-4" />
            Live YT Music Sync
            {ytStatus.connected && (
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] text-emerald-400">
                Connected
              </span>
            )}
          </button>
        </div>

        {/* Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-5">
          {tab === 'takeout' ? (
            <>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-xs text-zinc-300 space-y-2">
                <p className="font-semibold text-zinc-100">How to export your YouTube Music history:</p>
                <ol className="list-decimal list-inside space-y-1 text-zinc-400">
                  <li>
                    Go to{' '}
                    <a
                      href="https://takeout.google.com/"
                      target="_blank"
                      rel="noreferrer"
                      className="text-rose-400 hover:underline"
                    >
                      takeout.google.com
                    </a>{' '}
                    and click <strong className="text-zinc-200">Deselect all</strong>.
                  </li>
                  <li>
                    Scroll down, check <strong className="text-zinc-200">YouTube and YouTube Music</strong>, click{' '}
                    <strong className="text-zinc-200">Multiple formats</strong> and set History to{' '}
                    <strong className="text-zinc-200">JSON</strong>.
                  </li>
                  <li>
                    Download the export and drop either the <code className="text-rose-300">.zip</code> or{' '}
                    <code className="text-rose-300">watch-history.json</code> below.
                  </li>
                </ol>
              </div>

              <label className="flex items-center gap-2.5 text-sm text-zinc-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeGeneral}
                  onChange={(e) => setIncludeGeneral(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 accent-rose-500"
                />
                Include general YouTube watch history (not just YouTube Music)
              </label>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleFile(file);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition ${
                  dragActive
                    ? 'border-rose-500 bg-rose-500/10'
                    : 'border-zinc-700/80 bg-zinc-900/30 hover:border-zinc-500 hover:bg-zinc-900/60'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.zip"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                  }}
                />
                {uploading ? (
                  <div className="flex flex-col items-center gap-2 text-zinc-300">
                    <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
                    <p className="text-sm font-medium">Parsing your listening history...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="rounded-full bg-rose-500/10 p-3 text-rose-400">
                      <Upload className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-medium text-zinc-200">
                      Drop <span className="text-rose-400">watch-history.json</span> or Takeout{' '}
                      <span className="text-rose-400">.zip</span> here
                    </p>
                    <p className="text-xs text-zinc-500">
                      Processed locally on your machine — nothing leaves your computer.
                    </p>
                  </div>
                )}
              </div>

              {uploadError && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-300">
                  {uploadError}
                </div>
              )}

              {uploadResult && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-200 flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">
                      Imported {uploadResult.parsedMusicEvents.toLocaleString()} YouTube Music plays!
                    </p>
                    <p className="text-emerald-300/80 mt-0.5">
                      Scanned {uploadResult.totalRaw.toLocaleString()} total entries (skipped{' '}
                      {uploadResult.skippedNonMusic.toLocaleString()} non-music &{' '}
                      {uploadResult.skippedInvalid.toLocaleString()} removed/invalid).
                    </p>
                  </div>
                </div>
              )}

              {takeoutCount > 0 && (
                <div className="flex justify-end">
                  <button
                    onClick={onTakeoutCleared}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 px-3 py-1.5 text-xs text-zinc-400 hover:border-red-500/40 hover:text-red-400 transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Clear Takeout Data
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              {ytStatus.connected ? (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Connected to {ytStatus.accountName || 'YouTube Music'}
                      </p>
                      <p className="text-xs text-emerald-300/80">
                        {ytStatus.channelHandle
                          ? `${ytStatus.channelHandle} · `
                          : ''}
                        Live history, liked songs, playlists & artists ready
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSyncNow}
                      disabled={syncing}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-emerald-400 disabled:opacity-50 transition"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
                      {syncing ? 'Syncing...' : 'Sync Now'}
                    </button>
                    <button
                      onClick={onYTMusicDisconnected}
                      className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 transition"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleConnectLive} className="space-y-4">
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-xs text-zinc-300 space-y-2">
                    <p className="font-semibold text-zinc-100">
                      How to connect via browser request headers (ytmusicapi):
                    </p>
                    <ol className="list-decimal list-inside space-y-1 text-zinc-400">
                      <li>
                        Open{' '}
                        <a
                          href="https://music.youtube.com"
                          target="_blank"
                          rel="noreferrer"
                          className="text-rose-400 hover:underline"
                        >
                          music.youtube.com
                        </a>{' '}
                        while signed in and open DevTools (<kbd className="px-1 py-0.5 rounded bg-zinc-800 text-zinc-200">F12</kbd>) → <strong className="text-zinc-200">Network</strong> tab.
                      </li>
                      <li>
                        Filter by <code className="text-rose-300">/browse</code>, click any request (Status 200), and copy the <strong className="text-zinc-200">Request Headers</strong> (must include <code className="text-zinc-200">Cookie</code> & <code className="text-zinc-200">X-Goog-AuthUser</code> or <code className="text-zinc-200">Authorization</code>).
                      </li>
                      <li>
                        Paste the raw headers (or an existing <code className="text-rose-300">browser.json</code>) below.
                      </li>
                    </ol>
                  </div>

                  <textarea
                    rows={6}
                    value={headersRaw}
                    onChange={(e) => setHeadersRaw(e.target.value)}
                    placeholder="Paste raw HTTP Request Headers from music.youtube.com or browser.json content..."
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:border-rose-500 focus:outline-none"
                  />

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={connecting || !headersRaw.trim()}
                      className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-50 transition"
                    >
                      {connecting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        'Connect & Sync'
                      )}
                    </button>
                  </div>
                </form>
              )}

              {liveError && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-300">
                  {liveError}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
