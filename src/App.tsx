import React, { useState, useEffect, useCallback } from 'react';
import { TitleBar } from './components/TitleBar';
import { Sidebar, TabType } from './components/Sidebar';
import { HomePage } from './pages/HomePage';
import { BrowsePage } from './pages/BrowsePage';
import { SchedulePage } from './pages/SchedulePage';
import { WatchlistPage } from './pages/WatchlistPage';
import { ContinueWatchingPage } from './pages/ContinueWatchingPage';
import { WatchTogetherPage } from './pages/WatchTogetherPage';
import { DownloadsPage } from './pages/DownloadsPage';
import { SettingsPage } from './pages/SettingsPage';
import { AnimeDetailModal } from './components/AnimeDetailModal';
import { VideoPlayer } from './components/VideoPlayer';
import { SearchModal } from './components/SearchModal';
import { UpdateModal, UpdateInfo } from './components/UpdateModal';
import { AnimeCard, EpisodeItem, PlaybackData, W2gRoom } from './types/api';
import { storage, ContinueWatchingEntry, StoredDownload } from './services/storage';
import { api } from './services/api';
import { Sparkles } from 'lucide-react';

interface ActivePlaybackState {
  playbackData: PlaybackData;
  animeTitle: string;
  animePoster: string;
  animeId: number;
  anilistId?: number;
  episodeItem: EpisodeItem;
  allEpisodes: EpisodeItem[];
}

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<TabType>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedAnime, setSelectedAnime] = useState<AnimeCard | null>(null);
  const [activePlayback, setActivePlayback] = useState<ActivePlaybackState | null>(null);
  const [watchlistCount, setWatchlistCount] = useState(0);
  const [continueCount, setContinueCount] = useState(0);
  const [downloadsCount, setDownloadsCount] = useState(0);
  const [isBufferingEpisode, setIsBufferingEpisode] = useState(false);
  const [prefs, setPrefs] = useState(() => storage.getPreferences());
  const [pendingUpdate, setPendingUpdate] = useState<UpdateInfo | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  useEffect(() => {
    if (window.electronAPI?.onUpdateAvailable) {
      const unsubscribe = window.electronAPI.onUpdateAvailable((info) => {
        setPendingUpdate(info);
        setShowUpdateModal(true);
      });
      return () => unsubscribe();
    }
  }, []);

  // Update badges from storage
  const refreshStorageCounts = useCallback(() => {
    const wl = storage.getWatchlist();
    setWatchlistCount(Object.keys(wl).length);
    const cw = storage.getContinueWatching();
    setContinueCount(cw.length);
    const dl = storage.getDownloads();
    setDownloadsCount(dl.length);
    setPrefs(storage.getPreferences());
  }, []);

  useEffect(() => {
    refreshStorageCounts();
    const handleUpdate = () => refreshStorageCounts();
    window.addEventListener('anidesk-storage-update', handleUpdate);
    window.addEventListener('anifam-storage-update', handleUpdate);
    window.addEventListener('anidesk-downloads-update', handleUpdate);
    return () => {
      window.removeEventListener('anidesk-storage-update', handleUpdate);
      window.removeEventListener('anifam-storage-update', handleUpdate);
      window.removeEventListener('anidesk-downloads-update', handleUpdate);
    };
  }, [refreshStorageCounts]);

  // Global Keyboard Shortcuts (Ctrl+K for search, Ctrl+B for sidebar drawer)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsSidebarOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        if (isSidebarOpen) {
          setIsSidebarOpen(false);
        } else if (isSearchOpen) {
          setIsSearchOpen(false);
        } else if (selectedAnime && !activePlayback) {
          setSelectedAnime(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, isSidebarOpen, selectedAnime, activePlayback]);

  // Play anime directly (from Play button on card or hero)
  const handlePlayAnime = async (anime: AnimeCard) => {
    try {
      setIsBufferingEpisode(true);
      const epRes = await api.getEpisodes(anime.id);
      const episodes = epRes.data || [];
      if (episodes.length === 0) {
        alert('No episodes available for this anime yet.');
        return;
      }

      // Check if user has continue watching entry
      const cw = storage.getContinueWatching().find((c) => c.animeId === anime.id);
      let targetEp = episodes[0];
      let preferredTrack: 'sub' | 'dub' = storage.getPreferences().defaultTrack;

      if (cw) {
        const found = episodes.find((e) => e.id === cw.episodeId);
        if (found) {
          targetEp = found;
          preferredTrack = cw.track;
        }
      }

      const aid = anime.anilist_id;
      const playback = await api.playEpisode(targetEp.id, preferredTrack, aid, targetEp.number);
      setActivePlayback({
        playbackData: playback,
        animeTitle: anime.title,
        animePoster: anime.poster,
        animeId: anime.id,
        anilistId: aid,
        episodeItem: targetEp,
        allEpisodes: episodes,
      });
    } catch (err: any) {
      alert(`Could not start playback: ${err?.message || 'Network error'}`);
    } finally {
      setIsBufferingEpisode(false);
    }
  };

  // Play specific episode (from AnimeDetailModal)
  const handlePlayEpisode = async (
    episodeId: number,
    animeTitle: string,
    episodeItem: EpisodeItem,
    allEpisodes: EpisodeItem[],
    track?: 'sub' | 'dub',
    anilistId?: number
  ) => {
    try {
      setIsBufferingEpisode(true);
      const preferredTrack = track || storage.getPreferences().defaultTrack || 'sub';
      const aid = anilistId || selectedAnime?.anilist_id;
      const playback = await api.playEpisode(episodeId, preferredTrack, aid, episodeItem.number);
      setActivePlayback({
        playbackData: playback,
        animeTitle,
        animePoster: selectedAnime?.poster || '',
        animeId: selectedAnime?.id || 0,
        anilistId: aid,
        episodeItem,
        allEpisodes,
      });
    } catch (err: any) {
      alert(`Failed to load episode stream: ${err?.message || 'Server error'}`);
    } finally {
      setIsBufferingEpisode(false);
    }
  };

  // Resume playback from Continue Watching
  const handleResumeContinue = async (entry: ContinueWatchingEntry) => {
    try {
      setIsBufferingEpisode(true);
      const [epRes, animeDetail] = await Promise.all([
        api.getEpisodes(entry.animeId).catch(() => ({ data: [] })),
        api.getAnimeDetail(entry.animeId).catch(() => null),
      ]);
      const episodes = epRes.data || [];
      let epItem = episodes.find((e) => e.id === entry.episodeId);
      if (!epItem) {
        epItem = {
          id: entry.episodeId,
          number: entry.episodeNumber,
          title: entry.episodeTitle,
          is_filler: false,
          has_sub: true,
          has_dub: true,
        };
      }

      const anilistId = animeDetail?.anilist_id;
      const playback = await api.playEpisode(entry.episodeId, entry.track, anilistId, epItem.number);
      // Pre-populate resume position
      playback.resume_position = entry.position;

      setActivePlayback({
        playbackData: playback,
        animeTitle: entry.animeTitle,
        animePoster: entry.animePoster,
        animeId: entry.animeId,
        anilistId,
        episodeItem: epItem,
        allEpisodes: episodes,
      });
    } catch (err: any) {
      alert(`Could not resume episode: ${err?.message || 'Network error'}`);
    } finally {
      setIsBufferingEpisode(false);
    }
  };

  // Change episode while in Video Player
  const handleSelectEpisodeInPlayer = async (episodeId: number) => {
    if (!activePlayback) return;
    const targetItem = activePlayback.allEpisodes.find((e) => e.id === episodeId);
    if (!targetItem) return;

    try {
      const preferredTrack = activePlayback.playbackData.track || storage.getPreferences().defaultTrack;
      const playback = await api.playEpisode(
        episodeId,
        preferredTrack,
        activePlayback.anilistId,
        targetItem.number
      );
      setActivePlayback({
        ...activePlayback,
        playbackData: playback,
        episodeItem: targetItem,
      });
    } catch (err: any) {
      alert(`Failed to switch episode: ${err?.message || 'Error'}`);
    }
  };

  // Join Watch Together Room
  const handleJoinRoom = async (room: W2gRoom) => {
    if (!room.anime || !room.episode) {
      alert('Room data incomplete.');
      return;
    }
    try {
      setIsBufferingEpisode(true);
      const track = (room.track as 'sub' | 'dub') || 'sub';
      const epRes = await api.getEpisodes(room.anime.id);
      const episodes = epRes.data || [];
      const epItem = episodes.find((e) => e.id === room.episode.id) || {
        id: room.episode.id,
        number: room.episode.number,
        title: room.episode.title || `Episode ${room.episode.number}`,
        is_filler: false,
        has_sub: true,
        has_dub: true,
      };

      const aid = room.anime.anilist_id;
      const playback = await api.playEpisode(room.episode.id, track, aid, room.episode.number);
      setActivePlayback({
        playbackData: playback,
        animeTitle: room.anime.title,
        animePoster: room.anime.poster,
        animeId: room.anime.id,
        anilistId: aid,
        episodeItem: epItem,
        allEpisodes: episodes,
      });
    } catch (err: any) {
      alert(`Could not join room stream: ${err?.message || 'Network error'}`);
    } finally {
      setIsBufferingEpisode(false);
    }
  };

  // Offline Local Playback
  const handlePlayOffline = (downloadItem: StoredDownload) => {
    if (!downloadItem.filePath) {
      alert('Downloaded file not found on disk.');
      return;
    }

    const fileUrl = downloadItem.filePath.startsWith('file://')
      ? downloadItem.filePath
      : `file:///${downloadItem.filePath.replace(/\\/g, '/')}`;

    const playback: PlaybackData = {
      episode_id: downloadItem.episodeId,
      track: downloadItem.track,
      tracks: [downloadItem.track],
      sources: [
        {
          kind: 'hls',
          server: 'Local Offline Storage',
          url: fileUrl,
          subtitles: [],
        },
      ],
    };

    const epItem: EpisodeItem = {
      id: downloadItem.episodeId,
      number: downloadItem.episodeNumber,
      title: downloadItem.episodeTitle,
      is_filler: false,
      has_sub: downloadItem.track === 'sub',
      has_dub: downloadItem.track === 'dub',
    };

    setActivePlayback({
      playbackData: playback,
      animeTitle: downloadItem.animeTitle,
      animePoster: downloadItem.animePoster,
      animeId: downloadItem.animeId,
      episodeItem: epItem,
      allEpisodes: [epItem],
    });
  };

  const handleFullSearch = (query: string) => {
    setSearchQuery(query);
    setIsSearchOpen(false);
    setCurrentTab('browse');
  };

  return (
    <div className={`flex flex-col h-screen w-screen text-white overflow-hidden select-none font-sans theme-${prefs.accentTheme || 'crimson'} scale-${prefs.uiScale || 'normal'} wallpaper-${prefs.wallpaper || 'wallpaper1'} font-size-${prefs.fontSize || 'normal'} anim-${prefs.transitionAnimation || 'normal'} perf-${prefs.performanceUi || 'high'}`}>
      {/* Windows Frameless Title Bar (hidden during fullscreen video theatre) */}
      {!activePlayback && (
        <TitleBar
          onOpenSearch={() => setIsSearchOpen(true)}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          isSidebarOpen={isSidebarOpen}
        />
      )}

      {/* Main App Layout */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Navigation Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          watchlistCount={watchlistCount}
          continueCount={continueCount}
          downloadsCount={downloadsCount}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Scrollable Main Content View */}
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          {currentTab === 'home' && (
            <HomePage
              onSelectAnime={(anime) => setSelectedAnime(anime)}
              onPlayAnime={handlePlayAnime}
              onResumeContinue={handleResumeContinue}
            />
          )}

          {currentTab === 'browse' && (
            <BrowsePage
              initialQuery={searchQuery}
              onSelectAnime={(anime) => setSelectedAnime(anime)}
              onPlayAnime={handlePlayAnime}
            />
          )}

          {currentTab === 'schedule' && (
            <SchedulePage
              onSelectAnime={(anime) => setSelectedAnime(anime)}
            />
          )}

          {currentTab === 'watchlist' && (
            <WatchlistPage
              onSelectAnime={(anime) => setSelectedAnime(anime)}
              onExploreClick={() => setCurrentTab('browse')}
            />
          )}

          {currentTab === 'continue' && (
            <ContinueWatchingPage
              onResumePlay={handleResumeContinue}
              onExploreClick={() => setCurrentTab('browse')}
            />
          )}

          {currentTab === 'w2g' && (
            <WatchTogetherPage
              onJoinRoom={handleJoinRoom}
              onSelectAnime={(anime) => setSelectedAnime(anime)}
            />
          )}

          {currentTab === 'downloads' && (
            <DownloadsPage onPlayOffline={handlePlayOffline} />
          )}

          {currentTab === 'settings' && (
            <SettingsPage />
          )}
        </main>
      </div>

      {/* Buffering Loading Indicator */}
      {isBufferingEpisode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none animate-fadeIn">
          <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-[#14141B] border border-white/10 shadow-2xl">
            <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <span className="text-xs font-bold text-white tracking-wide">
              Resolving anime stream...
            </span>
          </div>
        </div>
      )}

      {/* Anime Detail Modal */}
      {selectedAnime && (
        <AnimeDetailModal
          anime={selectedAnime}
          onClose={() => setSelectedAnime(null)}
          onPlayEpisode={handlePlayEpisode}
        />
      )}

      {/* Instant Search Ctrl+K Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectAnime={(anime) => {
          setIsSearchOpen(false);
          setSelectedAnime(anime);
        }}
        onFullSearch={handleFullSearch}
      />

      {/* Fullscreen Video Player */}
      {activePlayback && (
        <VideoPlayer
          animeId={activePlayback.animeId}
          animeTitle={activePlayback.animeTitle}
          animePoster={activePlayback.animePoster}
          playbackData={activePlayback.playbackData}
          episodeItem={activePlayback.episodeItem}
          allEpisodes={activePlayback.allEpisodes}
          onClose={() => setActivePlayback(null)}
          onSelectEpisode={handleSelectEpisodeInPlayer}
          anilistId={activePlayback.anilistId}
        />
      )}

      {/* Floating Update Notification Button */}
      {pendingUpdate && !showUpdateModal && !activePlayback && (
        <button
          onClick={() => setShowUpdateModal(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-primary hover:bg-primary-hover text-white font-black text-xs shadow-glow-red hover:scale-105 active:scale-95 transition-all border border-white/20 animate-pulse"
          title="A new ANIDESK update is ready to install"
        >
          <Sparkles size={14} />
          <span>Update Ready (v{pendingUpdate.latestVersion})</span>
        </button>
      )}

      {/* Auto-Updater Modal */}
      {showUpdateModal && (
        <UpdateModal
          updateInfo={pendingUpdate}
          onClose={() => setShowUpdateModal(false)}
        />
      )}
    </div>
  );
};
