import { AnimeCard } from '../types/api';

export type WatchlistStatus = 'watching' | 'completed' | 'plan_to_watch' | 'on_hold' | 'dropped';

export type VisualEnhancerMode = 'vivid' | 'cinema' | 'crisp' | 'oled' | 'off';

export type AccentTheme = 'crimson' | 'cyan' | 'purple' | 'emerald' | 'amber' | 'sakura';
export type UiScale = 'compact' | 'normal' | 'tv';
export type SubtitleStyle = 'classic_yellow' | 'crisp_white' | 'neon_cyan' | 'outlined_black';
export type VideoScaleMode = 'contain' | 'cover' | 'stretch';
export type TransitionAnimation = 'none' | 'fast' | 'normal' | 'smooth';
export type PerformanceUi = 'high' | 'balanced' | 'low';
export type FontSize = 'small' | 'normal' | 'large' | 'huge';
export type WallpaperTheme = 'wallpaper1' | 'wallpaper2' | 'wallpaper3' | 'wallpaper4' | 'minimal';
export type PlayTrailerMode = 'inline' | 'modal' | 'off';
export type AudioLangPreference = 'ja' | 'en' | 'any';
export type CloseConfirmMode = 'never' | 'always';

export interface StoredDownload {
  id: string; // e.g. `${animeId}_${episodeId}_${track}`
  animeId: number;
  animeTitle: string;
  animePoster: string;
  episodeId: number;
  episodeNumber: number;
  episodeTitle: string;
  track: 'sub' | 'dub';
  quality: string;
  filename: string;
  filePath?: string;
  fileSize?: number;
  state: 'queued' | 'progressing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  speed?: string;
  receivedBytes?: number;
  totalBytes?: number;
  createdAt: number;
  completedAt?: number;
}

export interface WatchlistEntry {
  anime: AnimeCard;
  status: WatchlistStatus;
  addedAt: number;
  updatedAt: number;
}

export interface ContinueWatchingEntry {
  animeId: number;
  animeTitle: string;
  animePoster: string;
  episodeId: number;
  episodeNumber: number;
  episodeTitle: string;
  position: number; // in seconds
  duration: number; // in seconds
  track: 'sub' | 'dub';
  updatedAt: number;
}

export interface UserPreferences {
  defaultQuality: '1080p' | '720p' | '360p' | 'auto';
  defaultTrack: 'sub' | 'dub';
  autoSkipIntro: boolean;
  autoSkipOutro: boolean;
  autoPlayNext: boolean;
  visualEnhancerMode: VisualEnhancerMode;
  playbackSpeed: number;
  volume: number;

  // AnimeTV Inspired System Controls
  enable4kBanner: boolean;
  anilistSlideshow: boolean;
  hiresAnilistBanner: boolean;
  playTrailer: PlayTrailerMode;
  transitionAnimation: TransitionAnimation;
  performanceUi: PerformanceUi;
  fontSize: FontSize;
  wallpaper: WallpaperTheme;
  largeUi: boolean;
  skipFiller: boolean;
  closeConfirmation: CloseConfirmMode;
  preloadNextEp: boolean;
  preferDubAudio: boolean;
  preferredAudioLang: AudioLangPreference;

  showJapaneseTitles: boolean;
  showLiveClock: boolean;
  navigationSound: boolean;
  accentTheme: AccentTheme;
  uiScale: UiScale;
  videoScale: VideoScaleMode;
  seekDuration: number;
  subtitleLanguage: string;
  subtitleStyle: SubtitleStyle;
  subtitleFontSize: 'small' | 'normal' | 'large' | 'huge';
  reducedMotion: boolean;

  // Download & Storage Engine Settings
  downloadQuality: '1080p' | '720p' | '480p' | '360p';
  downloadStoragePath: string;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  defaultQuality: '1080p',
  defaultTrack: 'sub',
  autoSkipIntro: true,
  autoSkipOutro: true,
  autoPlayNext: true,
  visualEnhancerMode: 'off',
  playbackSpeed: 1.0,
  volume: 0.9,

  // AnimeTV Feature Defaults
  enable4kBanner: true,
  anilistSlideshow: true,
  hiresAnilistBanner: true,
  playTrailer: 'inline',
  transitionAnimation: 'normal',
  performanceUi: 'high',
  fontSize: 'normal',
  wallpaper: 'wallpaper1',
  largeUi: false,
  skipFiller: false,
  closeConfirmation: 'never',
  preloadNextEp: true,
  preferDubAudio: false,
  preferredAudioLang: 'ja',

  showJapaneseTitles: false,
  showLiveClock: true,
  navigationSound: true,
  accentTheme: 'crimson',
  uiScale: 'normal',
  videoScale: 'contain',
  seekDuration: 10,
  subtitleLanguage: 'en',
  subtitleStyle: 'crisp_white',
  subtitleFontSize: 'normal',
  reducedMotion: false,

  // Download & Storage Engine Defaults
  downloadQuality: '1080p',
  downloadStoragePath: '',
};

const STORAGE_KEYS = {
  WATCHLIST: 'anidesk_watchlist_v1',
  CONTINUE_WATCHING: 'anidesk_continue_watching_v1',
  PREFERENCES: 'anidesk_preferences_v1',
  RECENT_SEARCHES: 'anidesk_recent_searches_v1',
  WATCHED_EPISODES: 'anidesk_watched_episodes_v1',
  DOWNLOADS: 'anidesk_downloads_v1',
};

export const storage = {
  // Watchlist methods
  getWatchlist: (): Record<number, WatchlistEntry> => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.WATCHLIST);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  },

  getWatchlistStatus: (animeId: number): WatchlistStatus | null => {
    const list = storage.getWatchlist();
    return list[animeId]?.status || null;
  },

  setWatchlistStatus: (anime: AnimeCard, status: WatchlistStatus | null): void => {
    const list = storage.getWatchlist();
    if (!status) {
      delete list[anime.id];
    } else {
      list[anime.id] = {
        anime,
        status,
        addedAt: list[anime.id]?.addedAt || Date.now(),
        updatedAt: Date.now(),
      };
    }
    localStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(list));
    window.dispatchEvent(new Event('anidesk-storage-update'));
  },

  // Continue Watching methods
  getContinueWatching: (): ContinueWatchingEntry[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CONTINUE_WATCHING);
      const list: ContinueWatchingEntry[] = data ? JSON.parse(data) : [];
      return list.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch {
      return [];
    }
  },

  saveContinueWatching: (entry: Omit<ContinueWatchingEntry, 'updatedAt'>): void => {
    const list = storage.getContinueWatching().filter((e) => e.animeId !== entry.animeId);
    list.unshift({
      ...entry,
      updatedAt: Date.now(),
    });
    // Keep top 40
    const trimmed = list.slice(0, 40);
    localStorage.setItem(STORAGE_KEYS.CONTINUE_WATCHING, JSON.stringify(trimmed));
    
    // Also mark episode as watched if progress > 80%
    if (entry.duration > 0 && entry.position / entry.duration > 0.8) {
      storage.markEpisodeWatched(entry.episodeId);
    }

    window.dispatchEvent(new Event('anidesk-storage-update'));
  },

  removeContinueWatching: (animeId: number): void => {
    const list = storage.getContinueWatching().filter((e) => e.animeId !== animeId);
    localStorage.setItem(STORAGE_KEYS.CONTINUE_WATCHING, JSON.stringify(list));
    window.dispatchEvent(new Event('anidesk-storage-update'));
  },

  // Watched Episodes Tracking
  getWatchedEpisodeIds: (): Set<number> => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.WATCHED_EPISODES);
      return data ? new Set(JSON.parse(data)) : new Set();
    } catch {
      return new Set();
    }
  },

  markEpisodeWatched: (episodeId: number): void => {
    const set = storage.getWatchedEpisodeIds();
    set.add(episodeId);
    localStorage.setItem(STORAGE_KEYS.WATCHED_EPISODES, JSON.stringify(Array.from(set)));
    window.dispatchEvent(new Event('anidesk-storage-update'));
  },

  isEpisodeWatched: (episodeId: number): boolean => {
    return storage.getWatchedEpisodeIds().has(episodeId);
  },

  // Recent Searches
  getRecentSearches: (): string[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.RECENT_SEARCHES);
      return data ? JSON.parse(data) : ['Solo Leveling', 'Jujutsu Kaisen', 'Demon Slayer', 'One Piece'];
    } catch {
      return ['Solo Leveling', 'Jujutsu Kaisen', 'Demon Slayer', 'One Piece'];
    }
  },

  addRecentSearch: (query: string): void => {
    if (!query || !query.trim()) return;
    const clean = query.trim();
    const list = storage.getRecentSearches().filter((q) => q.toLowerCase() !== clean.toLowerCase());
    list.unshift(clean);
    localStorage.setItem(STORAGE_KEYS.RECENT_SEARCHES, JSON.stringify(list.slice(0, 10)));
    window.dispatchEvent(new Event('anidesk-storage-update'));
  },

  clearRecentSearches: (): void => {
    localStorage.removeItem(STORAGE_KEYS.RECENT_SEARCHES);
    window.dispatchEvent(new Event('anidesk-storage-update'));
  },

  // Preferences
  getPreferences: (): UserPreferences => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
      if (!data) return DEFAULT_PREFERENCES;
      const parsed = JSON.parse(data);
      // Auto-migrate any legacy filter mode ('vivid', 'cinema', etc.) to 'off' for pure native 1080p rendering
      if (parsed.visualEnhancerMode && parsed.visualEnhancerMode !== 'off' && !localStorage.getItem('anidesk_enhancer_user_selected')) {
        parsed.visualEnhancerMode = 'off';
      }
      return { ...DEFAULT_PREFERENCES, ...parsed };
    } catch {
      return DEFAULT_PREFERENCES;
    }
  },

  savePreferences: (patch: Partial<UserPreferences>): UserPreferences => {
    const current = storage.getPreferences();
    const updated = { ...current, ...patch };
    localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(updated));
    window.dispatchEvent(new Event('anidesk-storage-update'));
    return updated;
  },

  // Downloads methods
  getDownloads: (): StoredDownload[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DOWNLOADS);
      const list: StoredDownload[] = data ? JSON.parse(data) : [];
      return list.sort((a, b) => b.createdAt - a.createdAt);
    } catch {
      return [];
    }
  },

  saveDownload: (item: StoredDownload): void => {
    const list = storage.getDownloads().filter((d) => d.id !== item.id);
    list.unshift(item);
    localStorage.setItem(STORAGE_KEYS.DOWNLOADS, JSON.stringify(list));
    window.dispatchEvent(new Event('anidesk-storage-update'));
    window.dispatchEvent(new Event('anidesk-downloads-update'));
  },

  updateDownload: (id: string, patch: Partial<StoredDownload>): void => {
    const list = storage.getDownloads();
    const idx = list.findIndex((d) => d.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...patch };
      localStorage.setItem(STORAGE_KEYS.DOWNLOADS, JSON.stringify(list));
      window.dispatchEvent(new Event('anidesk-downloads-update'));
    }
  },

  removeDownload: (id: string): void => {
    const list = storage.getDownloads().filter((d) => d.id !== id);
    localStorage.setItem(STORAGE_KEYS.DOWNLOADS, JSON.stringify(list));
    window.dispatchEvent(new Event('anidesk-storage-update'));
    window.dispatchEvent(new Event('anidesk-downloads-update'));
  },

  isEpisodeDownloaded: (episodeId: number, track: 'sub' | 'dub' = 'sub'): boolean => {
    const list = storage.getDownloads();
    return list.some((d) => d.episodeId === episodeId && d.track === track && d.state === 'completed');
  },

  getDownloadedEpisode: (episodeId: number, track: 'sub' | 'dub' = 'sub'): StoredDownload | undefined => {
    const list = storage.getDownloads();
    return list.find((d) => d.episodeId === episodeId && d.track === track && d.state === 'completed');
  },
};
