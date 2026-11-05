import React, { useState, useEffect } from 'react';
import { HomeData, AnimeCard as AnimeCardType } from '../types/api';
import { api, getImageUrl } from '../services/api';
import { storage, ContinueWatchingEntry } from '../services/storage';
import { SpotlightCarousel } from '../components/SpotlightCarousel';
import { AnimeCard } from '../components/AnimeCard';
import { Play, TrendingUp, Flame, Clock, Sparkles, Trophy } from 'lucide-react';

interface HomePageProps {
  onSelectAnime: (anime: AnimeCardType) => void;
  onPlayAnime: (anime: AnimeCardType) => void;
  onResumeContinue: (entry: ContinueWatchingEntry) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onSelectAnime,
  onPlayAnime,
  onResumeContinue,
}) => {
  const [homeData, setHomeData] = useState<HomeData | null>(() => {
    try {
      const cached = localStorage.getItem('anidesk_cached_home_data');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [continueWatching, setContinueWatching] = useState<ContinueWatchingEntry[]>([]);
  const [top10Tab, setTop10Tab] = useState<'today' | 'week' | 'month'>('today');
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    try {
      return !localStorage.getItem('anidesk_cached_home_data');
    } catch {
      return true;
    }
  });
  const [hasError, setHasError] = useState(false);

  const fetchHomeData = async () => {
    try {
      setHasError(false);
      const data = await api.getHome();
      setHomeData(data);
      try {
        localStorage.setItem('anidesk_cached_home_data', JSON.stringify(data));
      } catch {}
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to load home data', err);
      if (!homeData) {
        setHasError(true);
      }
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHomeData();

    setContinueWatching(storage.getContinueWatching());

    const handleStorageUpdate = () => {
      setContinueWatching(storage.getContinueWatching());
    };

    window.addEventListener('anidesk-storage-update', handleStorageUpdate);
    window.addEventListener('anifam-storage-update', handleStorageUpdate);
    return () => {
      window.removeEventListener('anidesk-storage-update', handleStorageUpdate);
      window.removeEventListener('anifam-storage-update', handleStorageUpdate);
    };
  }, []);

  if (isLoading && !homeData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-4 min-h-[70vh]">
        <div className="w-14 h-14 rounded-full border-4 border-primary border-t-transparent animate-spin shadow-glow-red"></div>
        <p className="text-xs font-bold text-white/60 tracking-wider uppercase">
          Loading ANIDESK Catalog...
        </p>
      </div>
    );
  }

  if (!homeData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[70vh] space-y-3">
        <p className="text-sm font-semibold text-white/70">Connecting to ANIDESK mirrors...</p>
        <p className="text-xs text-white/40 max-w-sm">
          Network timeout on primary server. Click below to reconnect via backup mirrors.
        </p>
        <button
          onClick={() => {
            setIsLoading(true);
            fetchHomeData();
          }}
          className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-glow-red transition-all active:scale-95"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const isLargeUi = storage.getPreferences().largeUi;
  const gridClass = isLargeUi
    ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'
    : 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5';

  return (
    <div className="flex-1 p-4 md:p-6 space-y-8 select-none relative">
      {/* Background Ambient Lighting (Fixes "app is bit too dark") */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[350px] bg-primary/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-96 right-10 w-[500px] h-[400px] bg-purple-500/10 rounded-full blur-[160px] pointer-events-none" />

      {/* 1. Hero Spotlight / AniList Slideshow Carousel */}
      <SpotlightCarousel
        items={homeData?.spotlight || []}
        onPlay={onPlayAnime}
        onDetail={onSelectAnime}
      />

      {/* 2. Continue Watching (if available) */}
      {continueWatching.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock size={18} className="text-anifam-red" />
              <h2 className="text-base font-bold text-white tracking-tight">Continue Watching</h2>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {continueWatching.slice(0, 4).map((item) => {
              const progressPct =
                item.duration > 0 ? Math.min(100, (item.position / item.duration) * 100) : 0;
              return (
                <div
                  key={item.animeId}
                  onClick={() => onResumeContinue(item)}
                  className="group relative flex items-center space-x-3 p-3 rounded-xl bg-anifam-card hover:bg-anifam-cardHover border border-anifam-border hover:border-anifam-red/40 transition-all cursor-pointer shadow-sm hover:shadow-glow-red"
                >
                  <div className="relative w-14 h-14 rounded-lg bg-[#0A0A0E] flex-shrink-0 flex items-center justify-center overflow-hidden border border-white/10">
                    {item.animePoster ? (
                      <img
                        src={getImageUrl(item.animePoster)}
                        alt={item.animeTitle}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform filter brightness-[1.04]"
                      />
                    ) : (
                      <Play size={20} fill="currentColor" className="text-primary group-hover:scale-110 transition-transform ml-0.5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-white truncate group-hover:text-anifam-softRed transition-colors">
                      {item.animeTitle}
                    </h4>
                    <p className="text-[11px] text-anifam-textDim">
                      Episode {item.episodeNumber} ({item.track.toUpperCase()})
                    </p>
                    {/* Progress Bar */}
                    <div className="w-full h-1 bg-white/10 rounded-full mt-2 overflow-hidden">
                      <div
                        className="h-full bg-anifam-red rounded-full"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 3. Trending Anime */}
      {homeData.trending && homeData.trending.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TrendingUp size={18} className="text-anifam-red" />
              <h2 className="text-base font-bold text-white tracking-tight">Trending Now</h2>
            </div>
          </div>
          <div className={gridClass}>
            {homeData.trending.slice(0, 6).map((anime) => (
              <AnimeCard
                key={anime.id}
                anime={anime}
                onClick={onSelectAnime}
                onQuickPlay={onPlayAnime}
              />
            ))}
          </div>
        </section>
      )}

      {/* 4. Latest Releases */}
      {homeData.latest && homeData.latest.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Flame size={18} className="text-anifam-red" />
              <h2 className="text-base font-bold text-white tracking-tight">Latest Releases</h2>
            </div>
          </div>
          <div className={gridClass}>
            {homeData.latest.slice(0, 12).map((anime) => (
              <AnimeCard
                key={anime.id}
                anime={anime}
                onClick={onSelectAnime}
                onQuickPlay={onPlayAnime}
              />
            ))}
          </div>
        </section>
      )}

      {/* 5. Top Airing & Top 10 Leaderboard Split Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Airing (Left 2 columns) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center space-x-2">
            <Sparkles size={18} className="text-anifam-red" />
            <h2 className="text-base font-bold text-white tracking-tight">Top Airing</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
            {(homeData.top_airing || homeData.most_popular || []).slice(0, 8).map((anime) => (
              <AnimeCard
                key={anime.id}
                anime={anime}
                onClick={onSelectAnime}
                onQuickPlay={onPlayAnime}
              />
            ))}
          </div>
        </div>

        {/* Top 10 Leaderboard (Right 1 column) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Trophy size={18} className="text-amber-400" />
              <h2 className="text-base font-bold text-white tracking-tight">Top 10</h2>
            </div>
            {/* Tabs */}
            <div className="flex bg-anifam-surface rounded-lg p-0.5 border border-anifam-border text-[10px] font-semibold">
              <button
                onClick={() => setTop10Tab('today')}
                className={`px-2 py-0.5 rounded transition-all ${
                  top10Tab === 'today' ? 'bg-anifam-red text-white' : 'text-anifam-textDim hover:text-white'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setTop10Tab('week')}
                className={`px-2 py-0.5 rounded transition-all ${
                  top10Tab === 'week' ? 'bg-anifam-red text-white' : 'text-anifam-textDim hover:text-white'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setTop10Tab('month')}
                className={`px-2 py-0.5 rounded transition-all ${
                  top10Tab === 'month' ? 'bg-anifam-red text-white' : 'text-anifam-textDim hover:text-white'
                }`}
              >
                Month
              </button>
            </div>
          </div>

          <div className="bg-anifam-card rounded-2xl border border-anifam-border p-3 space-y-2">
            {(homeData.top10?.[top10Tab] || []).slice(0, 10).map((anime, index) => {
              const rank = index + 1;
              return (
                <div
                  key={anime.id}
                  onClick={() => onSelectAnime(anime)}
                  className="flex items-center space-x-3 p-2 rounded-xl hover:bg-anifam-surface transition-colors cursor-pointer group"
                >
                  <span
                    className={`text-sm font-black w-5 text-center ${
                      rank === 1
                        ? 'text-amber-400'
                        : rank === 2
                        ? 'text-slate-300'
                        : rank === 3
                        ? 'text-amber-600'
                        : 'text-anifam-textDim'
                    }`}
                  >
                    {rank}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-semibold text-white truncate group-hover:text-anifam-softRed transition-colors">
                      {anime.title}
                    </h4>
                    <div className="flex items-center space-x-2 text-[10px] text-anifam-textDim">
                      <span>{anime.type || 'TV'}</span>
                      {anime.eps && <span>• {anime.eps} eps</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 6. Completed Anime & Top Movies */}
      {homeData.completed && homeData.completed.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles size={18} className="text-anifam-red" />
              <h2 className="text-base font-bold text-white tracking-tight">Completed Masterpieces</h2>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
            {homeData.completed.slice(0, 6).map((anime) => (
              <AnimeCard
                key={anime.id}
                anime={anime}
                onClick={onSelectAnime}
                onQuickPlay={onPlayAnime}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
