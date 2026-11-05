import React, { useState, useEffect, useRef } from 'react';
import { AnimeCard } from '../types/api';
import { getImageUrl, api } from '../services/api';
import { bannerCacher, AnimeMediaAssets, AniListTrendingMedia, MASTER_4K_SEED_ITEMS } from '../services/bannerCacher';
import { storage } from '../services/storage';
import { sound } from '../services/sound';
import {
  Play,
  Info,
  Star,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Film,
  X,
  Volume2,
  VolumeX,
  TrendingUp,
} from 'lucide-react';

interface SpotlightCarouselProps {
  items: AnimeCard[];
  onPlay: (anime: AnimeCard) => void;
  onDetail: (anime: AnimeCard) => void;
}

export const SpotlightCarousel: React.FC<SpotlightCarouselProps> = ({ items, onPlay, onDetail }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [aniListTrending, setAniListTrending] = useState<AniListTrendingMedia[]>(() => {
    try {
      const raw = localStorage.getItem('anidesk_anilist_trending_v4');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length >= 8) return parsed;
      }
    } catch {}
    return MASTER_4K_SEED_ITEMS;
  });
  const [assetsMap, setAssetsMap] = useState<Record<string | number, AnimeMediaAssets>>({});
  const [activeTrailerId, setActiveTrailerId] = useState<string | null>(null);
  const [trailerModal, setTrailerModal] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isSearchingWatch, setIsSearchingWatch] = useState(false);
  const [failedLogos, setFailedLogos] = useState<Record<number, boolean>>({});

  const autoSlideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [prefs, setPrefs] = useState(() => storage.getPreferences());

  // Listen to preferences update in real-time (toggling 4K / AniList immediately re-renders)
  useEffect(() => {
    const handleStorageUpdate = () => {
      setPrefs(storage.getPreferences());
    };
    window.addEventListener('anidesk-storage-update', handleStorageUpdate);
    window.addEventListener('anifam-storage-update', handleStorageUpdate);
    return () => {
      window.removeEventListener('anidesk-storage-update', handleStorageUpdate);
      window.removeEventListener('anifam-storage-update', handleStorageUpdate);
    };
  }, []);

  // Load AniList Trending when anilistSlideshow is enabled
  useEffect(() => {
    if (prefs.anilistSlideshow) {
      bannerCacher.fetchAniListTrending(12).then((list) => {
        if (list && list.length > 0) {
          setAniListTrending(list);
        }
      });
    }
  }, [prefs.anilistSlideshow]);

  // Determine active slide items (AniList Trending vs AniFam Spotlights)
  const isUsingAniList = prefs.anilistSlideshow && aniListTrending.length > 0;
  const slideCount = isUsingAniList ? aniListTrending.length : items.length;

  // Auto-slide timer (6.5s interval, pauses when mouse hovers or trailer is playing)
  useEffect(() => {
    if (slideCount <= 1 || isHovered || activeTrailerId) return;

    autoSlideTimerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slideCount);
    }, 6500);

    return () => {
      if (autoSlideTimerRef.current) clearInterval(autoSlideTimerRef.current);
    };
  }, [slideCount, isHovered, activeTrailerId]);

  // Clear trailer when slide index changes
  useEffect(() => {
    setActiveTrailerId(null);
  }, [currentIndex]);

  // Pre-load Ultra-HD Fanart & ClearLogo for active and adjacent spotlights
  useEffect(() => {
    if (!slideCount) return;

    const loadAssetsForIndex = async (idx: number) => {
      try {
        if (isUsingAniList) {
          const item = aniListTrending[idx];
          if (!item || assetsMap[item.id] || item.clearLogo) return;
          const assets = await bannerCacher.fetchAssets(item.id, item.id, item.idMal);
          if (assets) {
            setAssetsMap((prev) => ({ ...prev, [item.id]: assets }));
          }
        } else {
          const item = items[idx];
          if (!item || assetsMap[item.id]) return;

          const mem = bannerCacher.getMemory(item.id);
          if (mem) {
            setAssetsMap((prev) => ({ ...prev, [item.id]: mem }));
            return;
          }

          let anilistId = item.anilist_id;
          let malId = item.mal_id;
          if (!anilistId && !malId) {
            const detail = await api.getAnimeDetail(item.id);
            anilistId = detail.anilist_id;
            malId = detail.mal_id;
          }

          const assets = await bannerCacher.fetchAssets(item.id, anilistId, malId);
          if (assets) {
            setAssetsMap((prev) => ({ ...prev, [item.id]: assets }));
          }
        }
      } catch {}
    };

    loadAssetsForIndex(currentIndex);
    loadAssetsForIndex((currentIndex + 1) % slideCount);
  }, [currentIndex, items, isUsingAniList, aniListTrending, slideCount]);

  if (slideCount === 0) return null;

  // Resolve current active item data
  let title = '';
  let subTitle = '';
  let synopsis = '';
  let bannerUrl = '';
  let clearLogoUrl: string | undefined;
  let score: number | undefined;
  let episodesCount: number | undefined;
  let formatBadge = '';
  let seasonBadge = '';
  let genres: string[] = [];
  let trailerId: string | undefined;

  if (isUsingAniList) {
    const curAniList = aniListTrending[currentIndex] || aniListTrending[0];
    title = prefs.showJapaneseTitles && curAniList.title.romaji
      ? curAniList.title.romaji
      : curAniList.title.english || curAniList.title.romaji;
    subTitle = curAniList.title.romaji !== title ? curAniList.title.romaji : '';
    synopsis = (curAniList.description || '').replace(/<[^>]+>/g, '');
    score = curAniList.averageScore ? curAniList.averageScore / 10 : undefined;
    episodesCount = curAniList.episodes;
    formatBadge = curAniList.format || 'TV';
    seasonBadge = curAniList.seasonYear ? `${curAniList.season || ''} ${curAniList.seasonYear}` : '';
    genres = curAniList.genres || [];
    trailerId = curAniList.trailer?.site?.toLowerCase() === 'youtube' ? curAniList.trailer.id : undefined;

    // High-Res 4K vs Standard Resolution banner switching
    if (prefs.hiresAnilistBanner) {
      bannerUrl = curAniList.fanart4k || curAniList.highResBanner || curAniList.bannerImage || '';
    } else {
      bannerUrl = curAniList.standardBanner || curAniList.bannerImage || '';
    }
    clearLogoUrl = curAniList.clearLogo || assetsMap[curAniList.id]?.clearlogo;
  } else {
    const current = items[currentIndex] || items[0];
    const ultra = assetsMap[current.id];
    title = prefs.showJapaneseTitles && current.title_jp ? current.title_jp : current.title;
    subTitle = current.title_jp && current.title_jp !== title ? current.title_jp : '';
    synopsis = current.synopsis || '';
    score = current.score ?? undefined;
    formatBadge = current.type || 'TV';
    bannerUrl = prefs.hiresAnilistBanner && ultra?.fanart ? ultra.fanart : getImageUrl(current.banner || current.poster);
    clearLogoUrl = ultra?.clearlogo;
  }

  const prevSlide = () => {
    sound.playClick();
    setCurrentIndex((prev) => (prev - 1 + slideCount) % slideCount);
  };

  const nextSlide = () => {
    sound.playClick();
    setCurrentIndex((prev) => (prev + 1) % slideCount);
  };

  // Handle Play Action (Direct or Search for AniList)
  const handleWatchNow = async () => {
    sound.playSelect();
    if (!isUsingAniList) {
      const cur = items[currentIndex];
      if (cur) onPlay(cur);
      return;
    }

    const curAniList = aniListTrending[currentIndex];
    if (!curAniList) return;

    setIsSearchingWatch(true);
    try {
      const q = curAniList.title.english || curAniList.title.romaji;
      const res = await api.search(q);
      if (res && res.data && res.data.length > 0) {
        onPlay(res.data[0]);
      } else {
        // Fallback: match by romaji or first word
        const fallbackWord = q.split(' ')[0];
        const res2 = await api.search(fallbackWord);
        if (res2 && res2.data && res2.data.length > 0) {
          onPlay(res2.data[0]);
        }
      }
    } catch {
      console.warn('Failed to auto-resolve AniList item');
    } finally {
      setIsSearchingWatch(false);
    }
  };

  // Handle Detail Action
  const handleOpenDetail = async () => {
    sound.playClick();
    if (!isUsingAniList) {
      const cur = items[currentIndex];
      if (cur) onDetail(cur);
      return;
    }

    const curAniList = aniListTrending[currentIndex];
    if (!curAniList) return;

    try {
      const q = curAniList.title.english || curAniList.title.romaji;
      const res = await api.search(q);
      if (res && res.data && res.data.length > 0) {
        onDetail(res.data[0]);
      } else {
        const fakeCard: AnimeCard = {
          id: curAniList.id,
          slug: String(curAniList.id),
          title: curAniList.title.english || curAniList.title.romaji,
          title_jp: curAniList.title.romaji,
          poster: curAniList.coverImage?.large || '',
          banner: curAniList.highResBanner || curAniList.bannerImage,
          synopsis: curAniList.description,
          score: curAniList.averageScore ? curAniList.averageScore / 10 : 0,
          type: curAniList.format || 'TV',
          sub: curAniList.episodes || 0,
          dub: 0,
          anilist_id: curAniList.id,
          mal_id: curAniList.idMal,
        };
        onDetail(fakeCard);
      }
    } catch {
      console.warn('Failed to open details');
    }
  };

  // Handle Trailer Trigger
  const handlePlayTrailer = () => {
    sound.playSelect();
    if (!trailerId) return;

    if (prefs.playTrailer === 'modal') {
      setTrailerModal(trailerId);
    } else {
      setActiveTrailerId(trailerId);
    }
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative w-full h-[400px] md:h-[450px] lg:h-[480px] rounded-3xl overflow-hidden bg-[#0A0A10] select-none group border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
    >
      {/* Background Banner or Inline Trailer */}
      {activeTrailerId ? (
        <div className="absolute inset-0 z-0 bg-black">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${activeTrailerId}?autoplay=1&mute=0&controls=1&modestbranding=1&rel=0&loop=1`}
            title="Anime Trailer"
            className="w-full h-full border-none pointer-events-auto"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
          {/* Close Trailer Button */}
          <button
            onClick={() => setActiveTrailerId(null)}
            className="absolute top-6 right-6 z-30 flex items-center gap-2 px-4 py-2 rounded-2xl bg-black/85 hover:bg-red-600 text-white font-black text-xs border border-white/20 shadow-2xl backdrop-blur-md transition-all hover:scale-105 active:scale-95"
          >
            <X size={15} />
            <span>Exit Trailer</span>
          </button>
        </div>
      ) : (
        <div className="absolute inset-0 overflow-hidden bg-black">
          <img
            key={`${currentIndex}-${bannerUrl}`}
            src={bannerUrl}
            alt={title}
            className="w-full h-full object-cover object-[center_20%] opacity-100 scale-100 group-hover:scale-105 transition-all duration-1000 ease-out filter brightness-[1.04] contrast-[1.03] saturate-[1.05]"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1600&auto=format&fit=crop&q=80';
            }}
          />
        </div>
      )}

      {/* Top-Left Discreet Floating Badges (Keeps artwork clean and unobstructed) */}
      <div className={`absolute top-5 left-6 z-20 flex items-center gap-2 transition-opacity duration-300 ${activeTrailerId ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <span className="px-3 py-1 rounded-full bg-primary/95 text-white text-[10px] font-black tracking-wider uppercase shadow-glow-red flex items-center gap-1.5 backdrop-blur-md">
          <TrendingUp size={11} />
          <span>{isUsingAniList ? `Trending #${currentIndex + 1}` : `Spotlight #${currentIndex + 1}`}</span>
        </span>

        {score && score > 0 ? (
          <div className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-black/75 text-amber-300 border border-amber-400/30 text-[10px] font-bold backdrop-blur-md shadow-md">
            <Star size={11} className="fill-amber-400 text-amber-400" />
            <span>{Number(score).toFixed(1)}</span>
          </div>
        ) : null}

        {prefs.hiresAnilistBanner && (
          <span className="px-2 py-0.5 rounded-full bg-black/60 text-amber-300 border border-amber-400/30 text-[9px] font-black uppercase tracking-wider backdrop-blur-md">
            4K
          </span>
        )}
      </div>

      {/* Content Overlay */}
      <div className={`relative h-full flex flex-col justify-end p-6 md:p-10 max-w-2xl z-10 space-y-3 transition-opacity duration-300 ${activeTrailerId ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        {/* ClearLogo or Stylized Typography with High Contrast */}
        <div className="space-y-1 py-1">
          {clearLogoUrl && !failedLogos[currentIndex] ? (
            <div className="relative inline-flex flex-col items-start space-y-1">
              <div className="relative group/logo">
                <img
                  src={clearLogoUrl}
                  alt={title}
                  className="max-h-24 md:max-h-32 max-w-md object-contain filter drop-shadow-[0_4px_16px_rgba(0,0,0,1)] drop-shadow-[0_0_30px_rgba(0,0,0,0.95)] drop-shadow-[0_0_50px_rgba(0,0,0,0.85)] brightness-110 select-none"
                  onError={() => {
                    setFailedLogos((prev) => ({ ...prev, [currentIndex]: true }));
                  }}
                />
              </div>
              <h1 className="text-xl md:text-2xl lg:text-3xl font-black text-white tracking-tight line-clamp-1 drop-shadow-[0_4px_16px_rgba(0,0,0,1)] [text-shadow:_0_2px_12px_rgba(0,0,0,1)]">
                {title}
              </h1>
            </div>
          ) : (
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight line-clamp-2 drop-shadow-[0_4px_16px_rgba(0,0,0,1)] [text-shadow:_0_2px_14px_rgba(0,0,0,1)]">
              {title}
            </h1>
          )}

          {subTitle && (!clearLogoUrl || failedLogos[currentIndex]) && (
            <p className="text-xs font-semibold text-white/70 truncate drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
              {subTitle}
            </p>
          )}
        </div>

        {/* Genres Pill List */}
        {genres.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {genres.slice(0, 4).map((g) => (
              <span key={g} className="text-[10px] font-bold px-2.5 py-0.5 rounded-lg bg-black/60 backdrop-blur-md text-white/90 border border-white/15 shadow-sm">
                {g}
              </span>
            ))}
          </div>
        )}

        {/* Synopsis */}
        <p className="text-xs lg:text-sm text-white/95 line-clamp-3 leading-relaxed max-w-xl font-medium drop-shadow-[0_3px_10px_rgba(0,0,0,0.95)] [text-shadow:_0_2px_10px_rgba(0,0,0,0.95)]">
          {synopsis || 'Experience this masterclass anime with stunning animation, unforgettable character arcs, and high-octane battles.'}
        </p>

        {/* Action Buttons: Watch Now, Play Trailer, Details */}
        <div className="flex items-center space-x-3 pt-2">
          <button
            onClick={handleWatchNow}
            disabled={isSearchingWatch}
            className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-black shadow-glow-red hover:shadow-glow-red-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
          >
            <Play size={16} fill="currentColor" />
            <span>{isSearchingWatch ? 'Locating Stream...' : 'Watch Now'}</span>
          </button>

          {trailerId && (
            <button
              onClick={handlePlayTrailer}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-black/75 hover:bg-amber-500/30 text-amber-300 text-xs font-black border border-amber-500/50 hover:border-amber-400 shadow-glow-amber hover:scale-105 active:scale-95 transition-all backdrop-blur-md"
            >
              <Film size={15} className="text-amber-400" />
              <span>Play Trailer</span>
            </button>
          )}

          <button
            onClick={handleOpenDetail}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-black/75 hover:bg-white/20 text-white text-xs font-bold backdrop-blur-md border border-white/25 hover:border-white/40 transition-all active:scale-95 shadow-md"
          >
            <Info size={15} />
            <span>Details</span>
          </button>
        </div>
      </div>


      {/* Slide Navigation Arrows & AnimeTV Pager Indicator */}
      <div className={`absolute bottom-6 right-6 flex items-center space-x-2 z-20 ${activeTrailerId ? 'hidden' : 'flex'}`}>
        <button
          onClick={prevSlide}
          className="p-2.5 rounded-full bg-black/60 hover:bg-primary text-white backdrop-blur-md border border-white/15 transition-all hover:scale-105 active:scale-95"
          title="Previous Anime"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Pager Dots */}
        <div className="flex space-x-1.5 px-2">
          {Array.from({ length: Math.min(10, slideCount) }).map((_, i) => (
            <button
              key={i}
              onClick={() => {
                sound.playClick();
                setCurrentIndex(i);
              }}
              className={`h-2 rounded-full transition-all duration-300 ${
                currentIndex === i
                  ? 'w-7 bg-primary shadow-glow-red'
                  : 'w-2 bg-white/30 hover:bg-white/60'
              }`}
            />
          ))}
        </div>

        <button
          onClick={nextSlide}
          className="p-2.5 rounded-full bg-black/60 hover:bg-primary text-white backdrop-blur-md border border-white/15 transition-all hover:scale-105 active:scale-95"
          title="Next Anime"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Floating Trailer Modal (When playTrailer === 'modal') */}
      {trailerModal && (
        <div className="fixed inset-0 z-[999999] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="relative w-full max-w-4xl aspect-video rounded-3xl overflow-hidden border border-white/20 shadow-2xl bg-black">
            <button
              onClick={() => setTrailerModal(null)}
              className="absolute top-4 right-4 z-50 p-2.5 rounded-full bg-black/80 hover:bg-red-600 text-white border border-white/20 transition-all hover:scale-105"
            >
              <X size={18} />
            </button>
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${trailerModal}?autoplay=1&controls=1&modestbranding=1&rel=0`}
              title="Trailer Modal"
              className="w-full h-full border-none"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </div>
  );
};
