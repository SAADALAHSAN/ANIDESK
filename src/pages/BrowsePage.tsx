import React, { useState, useEffect } from 'react';
import { AnimeCard as AnimeCardType, Genre } from '../types/api';
import { api } from '../services/api';
import { AnimeCard } from '../components/AnimeCard';
import { Filter, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';

interface BrowsePageProps {
  initialQuery?: string;
  onSelectAnime: (anime: AnimeCardType) => void;
  onPlayAnime: (anime: AnimeCardType) => void;
}

export const BrowsePage: React.FC<BrowsePageProps> = ({
  initialQuery = '',
  onSelectAnime,
  onPlayAnime,
}) => {
  const [results, setResults] = useState<AnimeCardType[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedSort, setSelectedSort] = useState<string>('default');
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);

  // Load genres once
  useEffect(() => {
    api.getGenres().then(setGenres).catch(() => {});
  }, []);

  // Update query if initialQuery changes
  useEffect(() => {
    setSearchQuery(initialQuery || '');
    setDebouncedQuery(initialQuery || '');
    setCurrentPage(1);
  }, [initialQuery]);

  // Debounce search input typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch results whenever filters or page change
  useEffect(() => {
    setIsLoading(true);

    if (debouncedQuery.trim()) {
      // Use search endpoint
      api
        .search(debouncedQuery.trim(), currentPage)
        .then((res) => {
          setResults(res.data || []);
          setHasMore((res.data || []).length >= 14);
          setIsLoading(false);
        })
        .catch(() => {
          setResults([]);
          setIsLoading(false);
        });
    } else {
      // Use browse endpoint
      api
        .browse({
          genre: selectedGenre || undefined,
          type: selectedType || undefined,
          status: selectedStatus || undefined,
          sort: selectedSort !== 'default' ? selectedSort : undefined,
          page: currentPage,
        })
        .then((res) => {
          setResults(res.data || []);
          setHasMore((res.data || []).length >= 18);
          setIsLoading(false);
        })
        .catch(() => {
          setResults([]);
          setIsLoading(false);
        });
    }
  }, [debouncedQuery, selectedGenre, selectedType, selectedStatus, selectedSort, currentPage]);

  const handleResetFilters = () => {
    setSelectedGenre('');
    setSelectedType('');
    setSelectedStatus('');
    setSelectedSort('default');
    setSearchQuery('');
    setCurrentPage(1);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 select-none">
      {/* Filters Bar */}
      <div className="bg-anifam-card rounded-2xl p-4 border border-anifam-border space-y-4">
        {/* Top: Search Input + Reset */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3 top-3 text-anifam-textDim" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by title..."
              className="w-full pl-9 pr-8 py-2 bg-anifam-surface border border-anifam-border rounded-xl text-xs text-white placeholder-anifam-textDim focus:outline-none focus:border-anifam-red"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-anifam-textDim hover:text-white"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {(selectedGenre || selectedType || selectedStatus || selectedSort !== 'default' || searchQuery) && (
              <button
                onClick={handleResetFilters}
                className="text-xs text-anifam-softRed hover:text-white px-3 py-1.5 rounded-lg border border-anifam-red/30 hover:bg-anifam-red/20 transition-all"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Dropdowns row: Type, Status, Sort */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Type */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-anifam-textDim">Type:</span>
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-anifam-surface border border-anifam-border rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-anifam-red cursor-pointer"
            >
              <option value="">All Types</option>
              <option value="TV">TV Series</option>
              <option value="Movie">Movie</option>
              <option value="OVA">OVA</option>
              <option value="ONA">ONA</option>
              <option value="Special">Special</option>
            </select>
          </div>

          {/* Status */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-anifam-textDim">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-anifam-surface border border-anifam-border rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-anifam-red cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="airing">Currently Airing</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {/* Sort */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-anifam-textDim">Sort:</span>
            <select
              value={selectedSort}
              onChange={(e) => {
                setSelectedSort(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-anifam-surface border border-anifam-border rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-anifam-red cursor-pointer"
            >
              <option value="default">Default</option>
              <option value="latest">Recently Added</option>
              <option value="trending">Trending</option>
              <option value="popular">Most Popular</option>
              <option value="rating">Top Rated</option>
              <option value="az">A - Z</option>
            </select>
          </div>
        </div>

        {/* Genre Tags Scroll */}
        {genres.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            <button
              onClick={() => {
                setSelectedGenre('');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                selectedGenre === ''
                  ? 'bg-anifam-red text-white shadow-glow-red'
                  : 'bg-anifam-surface text-anifam-textDim hover:text-white border border-anifam-border'
              }`}
            >
              All Genres
            </button>
            {genres.map((g) => (
              <button
                key={g.id}
                onClick={() => {
                  setSelectedGenre(selectedGenre === g.name ? '' : g.name);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  selectedGenre === g.name
                    ? 'bg-anifam-red text-white shadow-glow-red font-semibold'
                    : 'bg-anifam-surface text-anifam-textMuted hover:text-white border border-anifam-border'
                }`}
              >
                {g.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-white tracking-tight">
          {searchQuery ? `Search Results for "${searchQuery}"` : selectedGenre ? `${selectedGenre} Anime` : 'Discover Anime'}
        </h2>
        <span className="text-xs text-anifam-textDim font-medium">Page {currentPage}</span>
      </div>

      {/* Results Grid */}
      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-3">
          <div className="w-10 h-10 rounded-full border-4 border-anifam-red border-t-transparent animate-spin"></div>
          <span className="text-xs text-anifam-textMuted font-medium">Loading anime list...</span>
        </div>
      ) : results.length === 0 ? (
        <div className="py-24 text-center text-xs text-anifam-textDim">
          No anime found matching your criteria. Try adjusting filters or search term.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
          {results.map((anime) => (
            <AnimeCard
              key={anime.id}
              anime={anime}
              onClick={onSelectAnime}
              onQuickPlay={onPlayAnime}
            />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      <div className="flex items-center justify-center space-x-3 pt-6 pb-4">
        <button
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1 || isLoading}
          className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-anifam-card hover:bg-anifam-surface border border-anifam-border text-xs text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={15} />
          <span>Previous</span>
        </button>

        <span className="px-4 py-2 rounded-xl bg-anifam-surface border border-anifam-border text-xs font-semibold text-white">
          {currentPage}
        </span>

        <button
          onClick={() => setCurrentPage((p) => p + 1)}
          disabled={!hasMore || isLoading}
          className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-anifam-card hover:bg-anifam-surface border border-anifam-border text-xs text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <span>Next</span>
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
};
