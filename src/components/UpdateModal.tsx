import React, { useState, useEffect } from 'react';
import { Sparkles, Download, CheckCircle2, AlertCircle, X, ExternalLink, RefreshCw } from 'lucide-react';
import { AniDeskLogo } from './AniDeskLogo';

export interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseName: string;
  releaseNotes: string;
  publishedAt: string;
  downloadUrl: string;
  assetName: string;
  size: number;
}

interface UpdateModalProps {
  updateInfo: UpdateInfo | null;
  onClose: () => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({ updateInfo, onClose }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [downloadSpeed, setDownloadSpeed] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!window.electronAPI?.onUpdateDownloadProgress) return;

    const unsubscribe = window.electronAPI.onUpdateDownloadProgress((event) => {
      setProgressPercent(event.percent);
      setDownloadSpeed(event.speed);

      if (event.state === 'downloading') {
        setStatusMessage(`Downloading update... ${event.percent}% (${event.speed})`);
      } else if (event.state === 'completed') {
        setStatusMessage('Update downloaded! Launching installer and restarting ANIDESK...');
      } else if (event.state === 'failed') {
        setIsUpdating(false);
        setErrorMessage(event.error || 'Failed to download update.');
      }
    });

    return () => unsubscribe();
  }, []);

  if (!updateInfo || !updateInfo.hasUpdate) return null;

  const handleStartUpdate = async () => {
    setIsUpdating(true);
    setErrorMessage('');
    setStatusMessage('Initiating download...');

    try {
      const res = await window.electronAPI?.downloadAndInstallUpdate(updateInfo.downloadUrl);
      if (res && !res.success && res.error) {
        setIsUpdating(false);
        setErrorMessage(res.error);
      }
    } catch (err: any) {
      setIsUpdating(false);
      setErrorMessage(err?.message || 'Update failed to initiate.');
    }
  };

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[#0F0F18] border border-primary/40 rounded-3xl p-7 shadow-[0_0_50px_rgba(255,30,45,0.25)] space-y-6">
        {/* Glow Ambient Corner */}
        <div className="absolute top-0 right-0 w-44 h-44 bg-primary/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <AniDeskLogo size={34} />
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-black text-sm tracking-wide text-white">ANIDESK Update</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider">
                  New Release
                </span>
              </div>
              <p className="text-[11px] text-white/50">Next-Gen Anime Streaming Engine</p>
            </div>
          </div>

          {!isUpdating && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-white/10 text-white/60 hover:text-white transition-all"
              title="Close"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Version Change Highlight Card */}
        <div className="p-4 rounded-2xl bg-[#141422] border border-white/10 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-white/40 uppercase font-black tracking-wider">Current</p>
            <p className="text-sm font-mono font-bold text-white/70">v{updateInfo.currentVersion}</p>
          </div>

          <div className="flex items-center space-x-2 px-3 py-1 rounded-xl bg-primary/20 border border-primary/40 text-primary font-black text-xs">
            <span>➜</span>
          </div>

          <div className="text-right">
            <p className="text-[10px] text-primary uppercase font-black tracking-wider">Latest Version</p>
            <p className="text-base font-mono font-extrabold text-white">v{updateInfo.latestVersion}</p>
          </div>
        </div>

        {/* Release Notes Preview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-white/70">
            <span className="flex items-center gap-1.5">
              <Sparkles size={14} className="text-primary" />
              <span>What's New in {updateInfo.releaseName || `v${updateInfo.latestVersion}`}</span>
            </span>
          </div>
          <div className="max-h-36 overflow-y-auto scrollbar-thin p-3.5 rounded-2xl bg-black/50 border border-white/5 text-xs text-white/80 font-medium leading-relaxed whitespace-pre-line">
            {updateInfo.releaseNotes || 'Production stability upgrades, streaming servers optimization, and UI enhancements.'}
          </div>
        </div>

        {/* Download Progress Bar (When Updating) */}
        {isUpdating && (
          <div className="space-y-2.5 p-4 rounded-2xl bg-[#141422] border border-primary/30">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-white flex items-center gap-2">
                <RefreshCw size={13} className="text-primary animate-spin" />
                <span>{statusMessage || 'Downloading update...'}</span>
              </span>
              <span className="font-mono text-primary font-black">{progressPercent}%</span>
            </div>

            <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-200 shadow-glow-red"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] text-white/40 font-mono">
              <span>Speed: {downloadSpeed || 'Calculating...'}</span>
              <span>Asset: {updateInfo.assetName || 'ANIDESK-Setup.exe'}</span>
            </div>
          </div>
        )}

        {/* Error message if any */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-xs text-red-400 font-semibold">
            <AlertCircle size={15} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 pt-2">
          {!isUpdating && (
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-bold transition-all"
            >
              Remind Me Later
            </button>
          )}

          <button
            onClick={handleStartUpdate}
            disabled={isUpdating}
            className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-black shadow-glow-red hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
          >
            {isUpdating ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Updating...</span>
              </>
            ) : (
              <>
                <Download size={14} />
                <span>Update Now</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
