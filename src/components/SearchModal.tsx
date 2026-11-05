import React, { useState, useEffect, useRef } from 'react';
import { AnimeCard as AnimeCardType } from '../types/api';
import { api, getImageUrl } from '../services/api';
import { storage } from '../services/storage';
import { Search, X, Star, Film, Loader2, Clock, Trash2, TrendingUp, Sparkles } from 'lucide-react';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAnime: (anime: AnimeCardType) => void;
  onFullSearch: (query: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSelectAnime,
  onFullSearch,
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AnimeCardType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setRecentSearches(storage.getRecentSearches());
      setTimeout(() => inputRef.current?.focus(), 60);
    } else {
      setQuery('');
      setSuggestions([]);
      setSelectedIndex(-1);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      setIsLoading(false);
      setSelectedIndex(-1);
      return;
    }

    const timer = setTimeout(() => {
      setIsLoading(true);
      api
        .searchSuggest(query.trim())
        .then((res) => {
          setSuggestions(res || []);
          setIsLoading(false);
          setSelectedIndex(-1);
        })
        .catch(() => {
          setSuggestions([]);
          setIsLoading(false);
        });
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (suggestions.length > 0) {
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (suggestions.length > 0) {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        handleSelect(suggestions[selectedIndex]);
      } else if (query.trim()) {
        storage.addRecentSearch(query.trim());
        onFullSearch(query.trim());
        onClose();
      }
    }
  };

  const handleSelect = (anime: AnimeCardType) => {
    storage.addRecentSearch(anime.title);
    onSelectAnime(anime);
    onClose();
  };

  const handleRecentClick = (term: string) => {
    setQuery(term);
    storage.addRecentSearch(term);
    onFullSearch(term);
    onClose();
  };

  const handleClearRecents = (e: React.MouseEvent) => {
    e.stopPropagation();
    storage.clearRecentSearches();
    setRecentSearches([]);
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-start justify-center pt-16 px-4 select-none animate-fadeIn"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-anidesk-surface rounded-2xl border border-anidesk-border/80 shadow-2xl overflow-hidden flex flex-col double-bezel"
      >
        {/* Search Input Bar */}
        <div className="relative flex items-center px-4 py-3.5 border-b border-anidesk-border bg-anidesk-dark/60">
          <Search size={18} className="text-anidesk-textDim mr-3 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type anime title, character, or studio... (Press Enter to browse all)"
            className="w-full bg-transparent text-sm text-white placeholder-anidesk-textDim focus:outline-none"
          />
          {isLoading ? (
            <Loader2 size={16} className="text-primary animate-spin ml-2 flex-shrink-0" />
          ) : query ? (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-full text-anidesk-textDim hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          ) : null}
        </div>

        {/* Content Box */}
        <div className="max-h-[60vh] overflow-y-auto p-3 scrollbar-thin">
          {query.trim() === '' ? (
            /* Recent Searches & Popular Suggestions */
            <div className="space-y-4 p-2">
              {recentSearches.length > 0 && (
                <div>
                  <div className="flex items-center justify-between text-[10px] font-black tracking-widest text-anidesk-textDim uppercase px-2 mb-2">
                    <span className="flex items-center gap-1.5">
                      <Clock size={12} className="text-primary" />
                      Recent Searches
                    </span>
                    <button
                      onClick={handleClearRecents}
                      className="hover:text-red-400 transition-colors flex items-center gap-1 normal-case tracking-normal text-[11px]"
                    >
                      <Trash2 size={11} /> Clear
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 px-1">
                    {recentSearches.map((term, i) => (
                      <button
                        key={i}
                        onClick={() => handleRecentClick(term)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-anidesk-card hover:bg-anidesk-cardHover border border-anidesk-border text-xs text-white/80 hover:text-white transition-all hover:border-primary/40 active:scale-95"
                      >
                        <Search size={11} className="text-anidesk-textDim" />
                        <span>{term}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Trending Quick Jump */}
              <div className="pt-2">
                <div className="text-[10px] font-black tracking-widest text-anidesk-textDim uppercase px-2 mb-2 flex items-center gap-1.5">
                  <TrendingUp size={12} className="text-emerald-400" />
                  Trending Anime
                </div>
                <div className="flex flex-wrap gap-2 px-1">
                  {['Solo Leveling', 'Jujutsu Kaisen', 'Demon Slayer', 'One Piece', 'Attack on Titan', 'Chainsaw Man', 'Bleach'].map((anime, i) => (
                    <button
                      key={i}
                      onClick={() => handleRecentClick(anime)}
                      className="px-3 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 text-xs text-white/70 hover:text-white transition-all hover:border-white/20 active:scale-95"
                    >
                      {anime}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : suggestions.length > 0 ? (
            /* Live Suggestions */
            <div className="space-y-1">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-anidesk-textDim flex items-center justify-between">
                <span>Matching Titles ({suggestions.length})</span>
                <span className="text-[9px] text-white/40">Use ↑ ↓ to navigate</span>
              </div>
              {suggestions.map((anime, index) => {
                const isSelected = selectedIndex === index;
                return (
                  <button
                    key={anime.id}
                    onClick={() => handleSelect(anime)}
                    className={`w-full flex items-center p-2.5 rounded-xl transition-all text-left ${
                      isSelected
                        ? 'bg-primary text-white shadow-glow-red scale-[1.01]'
                        : 'hover:bg-anidesk-card text-white/80 hover:text-white'
                    }`}
                  >
                    <div className="w-10 h-14 rounded-lg overflow-hidden bg-black flex-shrink-0 mr-3 border border-white/10">
                      <img
                        src={getImageUrl(anime.poster)}
                        alt={anime.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-xs truncate">{anime.title}</h4>
                      {anime.title_jp && (
                        <p className={`text-[10px] truncate ${isSelected ? 'text-white/80' : 'text-anidesk-textDim'}`}>
                          {anime.title_jp}
                        </p>
                      )}
                      <div className="flex items-center space-x-2 mt-1 text-[10px]">
                        <span className={`px-1.5 py-0.2 rounded font-extrabold uppercase ${isSelected ? 'bg-white/20 text-white' : 'bg-primary/20 text-primary'}`}>
                          {anime.type || 'Anime'}
                        </span>
                        {anime.sub > 0 && <span>SUB {anime.sub}</span>}
                        {anime.dub > 0 && <span>DUB {anime.dub}</span>}
                        {anime.score && (
                          <span className="flex items-center text-amber-400 font-bold">
                            <Star size={10} className="fill-amber-400 mr-0.5" />
                            {Number(anime.score).toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : !isLoading ? (
            /* No Results Found */
            <div className="py-12 text-center text-anidesk-textDim">
              <Film size={28} className="mx-auto mb-2 opacity-30 text-primary" />
              <p className="text-xs font-semibold text-white/60">No anime found matching "{query}"</p>
              <p className="text-[10px] text-white/30 mt-1">Press Enter to search the full catalog directory</p>
            </div>
          ) : null}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 bg-anidesk-dark/80 border-t border-anidesk-border flex items-center justify-between text-[10px] text-anidesk-textDim">
          <div className="flex items-center gap-3">
            <span><kbd className="px-1.5 py-0.5 rounded bg-anidesk-card border border-anidesk-border text-white/60 font-mono">↵</kbd> View Full Catalog</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-anidesk-card border border-anidesk-border text-white/60 font-mono">Esc</kbd> Close</span>
          </div>
          <span className="text-primary font-bold">ANIDESK Search</span>
        </div>
      </div>
    </div>
  );
};
