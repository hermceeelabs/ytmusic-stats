import React, { useRef, useState } from 'react';
import {
  CheckCircle2,
  Link2,
  Loader2,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type { PlayEvent, TakeoutStats } from '../types';
import { parseTakeoutEntries, parseTakeoutFile } from '../utils/takeoutParser';

interface ConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  takeoutCount: number;
  onTakeoutUploaded: (events: PlayEvent[], stats: TakeoutStats) => void;
  onTakeoutCleared: () => void;
}

export const ConnectModal: React.FC<ConnectModalProps> = ({
  isOpen,
  onClose,
  takeoutCount,
  onTakeoutUploaded,
  onTakeoutCleared,
}) => {
  const [includeGeneral, setIncludeGeneral] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<TakeoutStats | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [jsonUrl, setJsonUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleUrlLoad = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = jsonUrl.trim();
    if (!url) return;
    setUploading(true);
    setUploadError(null);
    setUploadResult(null);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch URL (HTTP ${res.status})`);
      const parsed = await res.json();
      if (!Array.isArray(parsed)) {
        throw new Error('Expected a JSON array of watch history entries.');
      }
      // Check if it's already normalized PlayEvent[] or raw Takeout JSON
      if (parsed.length > 0 && parsed[0].playedAt && parsed[0].videoId) {
        const stats: TakeoutStats = {
          totalRaw: parsed.length,
          parsedMusicEvents: parsed.length,
          skippedNonMusic: 0,
          skippedInvalid: 0,
        };
        setUploadResult(stats);
        onTakeoutUploaded(parsed as PlayEvent[], stats);
      } else {
        const data = parseTakeoutEntries(parsed, includeGeneral);
        setUploadResult(data.stats);
        onTakeoutUploaded(data.events, data.stats);
      }
    } catch (err: any) {
      setUploadError(err.message || 'Failed to load JSON from URL.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-zinc-800 bg-[#111116] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Import Your YouTube Music History</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Drop your Google Takeout archive or load a hosted JSON file.
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

        {/* Body */}
        <div className="p-6 max-h-[80vh] overflow-y-auto space-y-5">
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
                Check <strong className="text-zinc-200">YouTube and YouTube Music</strong>, click{' '}
                <strong className="text-zinc-200">Multiple formats</strong> and set History to{' '}
                <strong className="text-zinc-200">JSON</strong>.
              </li>
              <li>
                Download and drop either the <code className="text-rose-300">.zip</code> or{' '}
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
                  Parsed locally in your browser and cached in IndexedDB for instant loads.
                </p>
              </div>
            )}
          </div>

          {/* Optional JSON URL loader */}
          <form onSubmit={handleUrlLoad} className="space-y-2 pt-2 border-t border-zinc-800/80">
            <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-400">
              <Link2 className="h-3.5 w-3.5" />
              Or load from a raw JSON URL (e.g. GitHub Gist / raw URL)
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={jsonUrl}
                onChange={(e) => setJsonUrl(e.target.value)}
                placeholder="https://raw.githubusercontent.com/.../watch-history.json"
                className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-rose-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={uploading || !jsonUrl.trim()}
                className="rounded-xl bg-zinc-800 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-700 disabled:opacity-50 transition"
              >
                Load URL
              </button>
            </div>
          </form>

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
                Clear Saved Data ({takeoutCount.toLocaleString()} plays)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
