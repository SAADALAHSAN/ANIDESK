import React, { useEffect, useState } from 'react';
import { Play, Trash2, Clock, RotateCcw, AlertTriangle, Sparkles, Film } from 'lucide-react';
import { storage, ContinueWatchingEntry } from '../services/storage';
import { getImageUrl } from '../services/api';

interface ContinueWatchingPageProps {
  onResumePlay: (entry: ContinueWatchingEntry) => void;
  onExploreClick: () => void;
}

export const ContinueWatchingPage: React.FC<ContinueWatchingPageProps> = ({
  onResumePlay,
  onExploreClick,
}) => {
  const [items, setItems] = useState<ContinueWatchingEntry[]>([]);

  const loadHistory = () => {
    setItems(storage.getContinueWatching());
  };

  useEffect(() => {
    loadHistory();
    const handleUpdate = () => loadHistory();
    window.addEventListener('anidesk-storage-update', handleUpdate);
    window.addEventListener('anifam-storage-update', handleUpdate);
    return () => {
      window.removeEventListener('anidesk-storage-update', handleUpdate);
      window.removeEventListener('anifam-storage-update', handleUpdate);
    };
  }, []);

  const handleRemove = (animeId: number) => {
    storage.removeContinueWatching(animeId);
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear your entire watch history?')) {
      items.forEach((item) => storage.removeContinueWatching(item.animeId));
    }
  };

  const formatRemainingTime = (pos: number, dur: number) => {
    if (!dur || dur <= 0) return '';
    const remaining = Math.max(0, dur - pos);
    const mins = Math.floor(remaining / 60);
    if (mins < 1) return '< 1m left';
    return `${mins}m left`;
  };

  return (
    <div className="min-h-full pb-20 px-8 pt-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase mb-1">
            <Clock className="w-4 h-4" />
            <span>Resume Playback</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            Continue Watching
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
              {items.length} In Progress
            </span>
          </h1>
          <p className="text-sm text-white/50 mt-1">
            Pick up right where you left off. Timestamps and audio tracks automatically preserved.
          </p>
        </div>

        {items.length > 0 && (
          <button
            onClick={handleClearAll}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 text-white/70 hover:text-red-400 text-xs font-semibold transition-all active:scale-95"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {/* Items Grid */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center rounded-2xl bg-[#14141B]/30 border border-white/5">
          <Film className="w-14 h-14 text-white/20 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No Active Playback History</h3>
          <p className="text-sm text-white/40 max-w-md mb-6">
            When you watch an anime episode, your progress will be saved here automatically so you can resume at any moment.
          </p>
          <button
            onClick={onExploreClick}
            className="px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs transition-all shadow-lg shadow-primary/25 active:scale-95"
          >
            Start Watching
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {items.map((entry) => {
            const percent =
              entry.duration > 0
                ? Math.min(100, Math.max(0, (entry.position / entry.duration) * 100))
                : 0;

            const remaining = formatRemainingTime(entry.position, entry.duration);

            return (
              <div
                key={entry.animeId}
                onClick={() => onResumePlay(entry)}
                className="group relative flex flex-col rounded-2xl overflow-hidden bg-[#14141B] border border-white/5 hover:border-primary/40 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10 cursor-pointer"
              >
                {/* Poster / Thumbnail Box */}
                <div className="relative aspect-video w-full overflow-hidden bg-[#0A0A0E]">
                  <img
                    src={getImageUrl(entry.animePoster)}
                    alt={entry.animeTitle}
                    className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300 filter brightness-[1.04] contrast-[1.02]"
                  />

                  {/* Play Button Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-[2px]">
                    <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/50 transform scale-90 group-hover:scale-100 transition-transform">
                      <Play className="w-5 h-5 fill-white ml-0.5" />
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-black text-white border border-white/10 uppercase">
                      EP {entry.episodeNumber}
                    </span>
                    <span className="px-1.5 py-0.5 rounded-md bg-primary text-[10px] font-black text-white uppercase tracking-wider">
                      {entry.track}
                    </span>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(entry.animeId);
                    }}
                    title="Remove from history"
                    className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-black/70 hover:bg-red-500 text-white/70 hover:text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all shadow-md"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Progress Bar at bottom of poster */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
                    <div
                      className="h-full bg-primary rounded-r transition-all duration-300"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                {/* Content Details */}
                <div className="p-4 flex flex-col flex-1 justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-white group-hover:text-primary transition-colors line-clamp-1">
                      {entry.animeTitle}
                    </h3>
                    <p className="text-xs text-white/50 mt-1 line-clamp-1">
                      {entry.episodeTitle || `Episode ${entry.episodeNumber}`}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-white/40 pt-2 border-t border-white/5">
                    <span className="flex items-center gap-1 font-mono font-medium">
                      <Clock className="w-3 h-3 text-primary" />
                      {remaining || `${Math.round(percent)}% watched`}
                    </span>
                    <span className="text-primary font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                      Resume <Play className="w-2.5 h-2.5 fill-primary" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
