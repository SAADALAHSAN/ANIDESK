import React, { useState, useEffect, useRef } from 'react';
import { AnimeCard as AnimeCardType } from '../types/api';
import { getImageUrl } from '../services/api';
import { Bookmark, Play, Star } from 'lucide-react';
import { storage } from '../services/storage';
import { AnimeQuickTip } from './AnimeQuickTip';

interface AnimeCardProps {
  anime: AnimeCardType;
  onClick: (anime: AnimeCardType) => void;
  onQuickPlay?: (anime: AnimeCardType) => void;
}

export const AnimeCard: React.FC<AnimeCardProps> = ({ anime, onClick, onQuickPlay }) => {
  const [isSaved, setIsSaved] = useState<boolean>(() => {
    return storage.getWatchlistStatus(anime.id) !== null;
  });

  const [showQuickTip, setShowQuickTip] = useState(false);
  const [quickTipPos, setQuickTipPos] = useState({ x: 0, y: 0, placeAbove: false });
  const hoverTimerRef = useRef<any>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const syncSaved = () => {
      setIsSaved(storage.getWatchlistStatus(anime.id) !== null);
    };
    syncSaved();
    window.addEventListener('anidesk-storage-update', syncSaved);
    return () => window.removeEventListener('anidesk-storage-update', syncSaved);
  }, [anime.id]);

  const toggleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSaved) {
      storage.setWatchlistStatus(anime, null);
      setIsSaved(false);
    } else {
      storage.setWatchlistStatus(anime, 'plan_to_watch');
      setIsSaved(true);
    }
  };

  const handleMouseEnter = (e: React.MouseEvent) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    const rect = e.currentTarget.getBoundingClientRect();
    const placeAbove = rect.bottom > window.innerHeight - 250;

    hoverTimerRef.current = setTimeout(() => {
      setQuickTipPos({
        x: rect.right + 12 < window.innerWidth - 300 ? rect.right + 12 : rect.left - 290,
        y: rect.top,
        placeAbove,
      });
      setShowQuickTip(true);
    }, 450);
  };

  const handleMouseLeave = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setShowQuickTip(false);
  };

  const handleCardClick = () => {
    setShowQuickTip(false);
    onClick(anime);
  };

  const handlePlayClick = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setShowQuickTip(false);
    if (onQuickPlay) {
      onQuickPlay(anime);
    } else {
      onClick(anime);
    }
  };

  const posterUrl = getImageUrl(anime.poster);

  return (
    <div
      ref={cardRef}
      onClick={handleCardClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="group relative flex flex-col bg-[#12121A] rounded-2xl overflow-hidden border border-white/5 hover:border-primary/50 transition-all duration-200 hover:shadow-xl hover:shadow-black/60 hover:-translate-y-1 cursor-pointer select-none"
    >
      {/* Poster Image Container */}
      <div className="relative aspect-[3/4.2] w-full overflow-hidden bg-[#0A0A0E]">
        <img
          src={posterUrl}
          alt={anime.title}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105 filter brightness-[1.04] contrast-[1.02] saturate-[1.03]"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80';
          }}
        />

        {/* Top Badges (Sub / Dub / Type) */}
        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5 z-10">
          {anime.sub > 0 && (
            <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-black/85 text-white border border-white/10 uppercase tracking-tight">
              SUB {anime.sub}
            </span>
          )}
          {anime.dub > 0 && (
            <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-primary text-white uppercase tracking-tight shadow-sm">
              DUB {anime.dub}
            </span>
          )}
          {anime.type && (
            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-white/10 text-white/90 uppercase">
              {anime.type}
            </span>
          )}
        </div>

        {/* Bookmark Button */}
        <button
          onClick={toggleBookmark}
          className={`absolute top-2.5 right-2.5 p-2 rounded-xl transition-all duration-200 z-20 ${
            isSaved
              ? 'bg-primary text-white shadow-glow-red scale-105'
              : 'bg-black/70 text-white/70 hover:text-white hover:bg-black active:scale-95'
          }`}
          title={isSaved ? 'Remove from Watchlist' : 'Add to Watchlist'}
        >
          <Bookmark size={13} fill={isSaved ? 'currentColor' : 'none'} />
        </button>

        {/* Center Hover Play Button */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 z-10 pointer-events-none">
          <button
            onClick={handlePlayClick}
            className="pointer-events-auto w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center shadow-glow-red hover:scale-110 active:scale-90 transition-transform duration-150"
          >
            <Play size={18} fill="currentColor" className="ml-0.5" />
          </button>
        </div>

        {/* Bottom Metadata Badges */}
        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-[11px] text-white/90 z-10">
          {anime.score && anime.score > 0 ? (
            <div className="flex items-center space-x-1 bg-black/85 px-2 py-0.5 rounded-lg border border-white/5">
              <Star size={11} className="text-amber-400 fill-amber-400" />
              <span className="font-bold text-xs">{Number(anime.score).toFixed(1)}</span>
            </div>
          ) : (
            <div />
          )}

          {anime.episode_number ? (
            <span className="text-[10px] font-black bg-primary/20 border border-primary/30 px-2 py-0.5 rounded-lg text-primary">
              EP {anime.episode_number}
            </span>
          ) : anime.eps ? (
            <span className="text-[10px] font-semibold text-white/70 bg-black/80 px-2 py-0.5 rounded-lg border border-white/5">
              {anime.eps} EPS
            </span>
          ) : null}
        </div>
      </div>

      {/* Title & Extra Info */}
      <div className="p-3 flex flex-col flex-1 justify-between bg-[#12121A]">
        <h4 className="font-bold text-xs text-white line-clamp-2 leading-tight group-hover:text-primary transition-colors">
          {anime.title}
        </h4>
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5 text-[10px] text-white/40 font-medium">
          <span className="capitalize">{anime.status || 'Anime'}</span>
          <span>{anime.duration || '24m'}</span>
        </div>
      </div>

      {/* Floating Enma-style QuickTip Tooltip */}
      {showQuickTip && (
        <AnimeQuickTip
          anime={anime}
          position={quickTipPos}
          onPlay={() => handlePlayClick()}
          onSelect={handleCardClick}
        />
      )}
    </div>
  );
};
