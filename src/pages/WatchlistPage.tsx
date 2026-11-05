import React, { useEffect, useState } from 'react';
import { Bookmark, Search, Trash2, Eye, CheckCircle2, Clock, PauseCircle, XCircle, Film } from 'lucide-react';
import { storage, WatchlistEntry, WatchlistStatus } from '../services/storage';
import { AnimeCard } from '../types/api';
import { AnimeCard as AnimeCardComponent } from '../components/AnimeCard';

interface WatchlistPageProps {
  onSelectAnime: (anime: AnimeCard) => void;
  onExploreClick: () => void;
}

const TABS: Array<{ key: 'all' | WatchlistStatus; label: string; icon: any }> = [
  { key: 'all', label: 'All', icon: Bookmark },
  { key: 'watching', label: 'Watching', icon: Eye },
  { key: 'plan_to_watch', label: 'Plan to Watch', icon: Clock },
  { key: 'completed', label: 'Completed', icon: CheckCircle2 },
  { key: 'on_hold', label: 'On Hold', icon: PauseCircle },
  { key: 'dropped', label: 'Dropped', icon: XCircle },
];

export const WatchlistPage: React.FC<WatchlistPageProps> = ({ onSelectAnime, onExploreClick }) => {
  const [activeTab, setActiveTab] = useState<'all' | WatchlistStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [entries, setEntries] = useState<WatchlistEntry[]>([]);

  const loadWatchlist = () => {
    const map = storage.getWatchlist();
    const list = Object.values(map).sort((a, b) => b.updatedAt - a.updatedAt);
    setEntries(list);
  };

  useEffect(() => {
    loadWatchlist();
    const handleUpdate = () => loadWatchlist();
    window.addEventListener('anidesk-storage-update', handleUpdate);
    window.addEventListener('anifam-storage-update', handleUpdate);
    return () => {
      window.removeEventListener('anidesk-storage-update', handleUpdate);
      window.removeEventListener('anifam-storage-update', handleUpdate);
    };
  }, []);

  const filteredEntries = entries.filter((entry) => {
    if (activeTab !== 'all' && entry.status !== activeTab) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const titleMatch = entry.anime.title.toLowerCase().includes(q);
      const jpMatch = entry.anime.title_jp?.toLowerCase().includes(q);
      return titleMatch || jpMatch;
    }
    return true;
  });

  const getStatusCount = (status: 'all' | WatchlistStatus) => {
    if (status === 'all') return entries.length;
    return entries.filter((e) => e.status === status).length;
  };

  const handleRemove = (e: React.MouseEvent, anime: AnimeCard) => {
    e.stopPropagation();
    storage.setWatchlistStatus(anime, null);
  };

  return (
    <div className="min-h-full pb-20 px-8 pt-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase mb-1">
            <Bookmark className="w-4 h-4" />
            <span>Personal Collection</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            My Watchlist
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
              {entries.length} Titles
            </span>
          </h1>
          <p className="text-sm text-white/50 mt-1">
            Track, organize, and categorize your favorite anime series and movies.
          </p>
        </div>

        {/* Search in Watchlist */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Search your library..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#14141B] border border-white/10 text-white placeholder-white/40 text-xs focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-thin mb-8 border-b border-white/5 -mx-2 px-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const count = getStatusCount(tab.key);
          const isSelected = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 border ${
                isSelected
                  ? 'bg-primary text-white border-primary shadow-lg shadow-primary/25'
                  : 'bg-[#14141B] text-white/60 border-white/5 hover:border-white/10 hover:text-white hover:bg-[#1A1A24]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-white/5 text-white/40'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Empty States */}
      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center rounded-2xl bg-[#14141B]/30 border border-white/5">
          <Film className="w-14 h-14 text-white/20 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Your Watchlist is Empty</h3>
          <p className="text-sm text-white/40 max-w-md mb-6">
            Bookmark any anime while browsing or from detail pages to keep track of what you're watching.
          </p>
          <button
            onClick={onExploreClick}
            className="px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs transition-all shadow-lg shadow-primary/25 active:scale-95"
          >
            Explore Anime Catalog
          </button>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Bookmark className="w-12 h-12 text-white/20 mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">No matches found</h3>
          <p className="text-sm text-white/40 max-w-sm">
            {searchQuery
              ? `No anime in this tab matches "${searchQuery}".`
              : 'You have no titles in this status tab.'}
          </p>
        </div>
      ) : (
        /* Anime Grid */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
          {filteredEntries.map((entry) => (
            <div key={entry.anime.id} className="relative group">
              <AnimeCardComponent
                anime={entry.anime}
                onClick={onSelectAnime}
              />
              {/* Quick Remove Overlay Button */}
              <button
                onClick={(e) => handleRemove(e, entry.anime)}
                title="Remove from Watchlist"
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/80 hover:bg-red-500 text-white/70 hover:text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-200 z-10 shadow-lg"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
