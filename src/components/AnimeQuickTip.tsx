import React from 'react';
import { AnimeCard as AnimeCardType } from '../types/api';
import { getImageUrl } from '../services/api';
import { Play, Bookmark, Star, Calendar, Clock, Film } from 'lucide-react';
import { storage } from '../services/storage';

interface AnimeQuickTipProps {
  anime: AnimeCardType;
  position: { x: number; y: number; placeAbove?: boolean };
  onPlay: (anime: AnimeCardType) => void;
  onSelect: (anime: AnimeCardType) => void;
}

export const AnimeQuickTip: React.FC<AnimeQuickTipProps> = ({
  anime,
  position,
  onPlay,
  onSelect,
}) => {
  const isSaved = storage.getWatchlistStatus(anime.id) !== null;

  const toggleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSaved) {
      storage.setWatchlistStatus(anime, null);
    } else {
      storage.setWatchlistStatus(anime, 'plan_to_watch');
    }
  };

  return (
    <div
      style={{
        left: `${Math.min(window.innerWidth - 320, Math.max(16, position.x))}px`,
        top: position.placeAbove
          ? `${Math.max(16, position.y - 240)}px`
          : `${Math.min(window.innerHeight - 260, position.y + 10)}px`,
      }}
      className="fixed z-50 w-72 bg-[#12121B] border border-white/15 rounded-2xl p-4 shadow-2xl pointer-events-auto animate-fadeIn select-none double-bezel"
    >
      {/* Title & Japanese subtitle */}
      <h3 className="font-extrabold text-sm text-white line-clamp-1 mb-0.5">
        {anime.title}
      </h3>
      {anime.title_jp && (
        <p className="text-[10px] text-white/40 truncate font-mono mb-2.5">
          {anime.title_jp}
        </p>
      )}

      {/* Badges Bar (Enma-style) */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {anime.score && anime.score > 0 && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-400/15 border border-amber-400/30 text-amber-400 text-[10px] font-black">
            <Star size={10} className="fill-amber-400" />
            <span>{Number(anime.score).toFixed(1)}</span>
          </div>
        )}
        <span className="px-2 py-0.5 rounded-md bg-primary/20 text-primary border border-primary/30 text-[10px] font-black uppercase">
          {anime.type || 'TV'}
        </span>
        {anime.sub > 0 && (
          <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/80 text-[10px] font-bold">
            SUB {anime.sub}
          </span>
        )}
        {anime.dub > 0 && (
          <span className="px-1.5 py-0.5 rounded bg-primary text-white text-[10px] font-black">
            DUB {anime.dub}
          </span>
        )}
      </div>

      {/* Synopsis Snippet */}
      <p className="text-xs text-white/60 line-clamp-3 leading-relaxed mb-4 font-normal">
        {anime.synopsis || 'Explore this anime on ANIDESK. Watch in 1080p HD with English subs and dubs.'}
      </p>

      {/* Meta Footer */}
      <div className="flex items-center justify-between text-[11px] text-white/40 pt-2.5 border-t border-white/5 mb-3">
        <span className="capitalize">{anime.status || 'Airing'}</span>
        <span>{anime.duration || '24m per ep'}</span>
      </div>

      {/* Quick Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPlay(anime)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-black shadow-glow-red transition-all active:scale-95"
        >
          <Play size={13} fill="currentColor" />
          <span>Watch Now</span>
        </button>
        <button
          onClick={toggleBookmark}
          className={`p-2 rounded-xl border transition-all ${
            isSaved
              ? 'bg-primary/20 border-primary text-primary'
              : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
          }`}
          title={isSaved ? 'In Watchlist' : 'Add to Watchlist'}
        >
          <Bookmark size={14} fill={isSaved ? 'currentColor' : 'none'} />
        </button>
      </div>
    </div>
  );
};
