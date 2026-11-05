import React, { useState, useEffect } from 'react';
import { AnimeCard as AnimeCardType, AnimeDetail, EpisodeItem } from '../types/api';
import { api, getImageUrl } from '../services/api';
import { storage, WatchlistStatus } from '../services/storage';
import { downloadManager } from '../services/downloadManager';
import {
  X,
  Play,
  Star,
  Bookmark,
  Calendar,
  Clock,
  Film,
  Building,
  Check,
  ChevronDown,
  Search,
  Download,
  CheckCircle2,
  ArrowDownToLine,
  Loader2,
  Layers,
  Sparkles,
  FolderDown,
} from 'lucide-react';
import { sound } from '../services/sound';

interface AnimeDetailModalProps {
  anime: AnimeCardType;
  onClose: () => void;
  onPlayEpisode: (
    episodeId: number,
    animeTitle: string,
    episodeItem: EpisodeItem,
    allEpisodes: EpisodeItem[],
    track?: 'sub' | 'dub',
    anilistId?: number
  ) => void;
}

export const AnimeDetailModal: React.FC<AnimeDetailModalProps> = ({
  anime,
  onClose,
  onPlayEpisode,
}) => {
  const [detail, setDetail] = useState<AnimeDetail | null>(null);
  const [episodes, setEpisodes] = useState<EpisodeItem[]>([]);
  const [activeTab, setActiveTab] = useState<'episodes' | 'related'>('episodes');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState<number>(0);
  const [epSearch, setEpSearch] = useState('');
  const [watchlistStatus, setWatchlistStatus] = useState<WatchlistStatus | null>(() => {
    return storage.getWatchlistStatus(anime.id);
  });
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [downloadingEps, setDownloadingEps] = useState<Record<number, boolean>>({});
  const [, setDlUpdateTick] = useState(0);

  // Track & Quality State
  const [selectedTrack, setSelectedTrack] = useState<'sub' | 'dub'>(() => storage.getPreferences().defaultTrack || 'sub');
  const [selectedQuality, setSelectedQuality] = useState<'1080p' | '720p' | '480p' | '360p'>(
    () => storage.getPreferences().downloadQuality || '1080p'
  );

  // Bulk Download State
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkTab, setBulkTab] = useState<'all' | 'select'>('all');
  const [selectedEpisodeIds, setSelectedEpisodeIds] = useState<Set<number>>(new Set());
  const [rangeStart, setRangeStart] = useState<number>(1);
  const [rangeEnd, setRangeEnd] = useState<number>(12);
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);
  const [bulkToast, setBulkToast] = useState<string | null>(null);

  useEffect(() => {
    const onDlUpdate = () => setDlUpdateTick((t) => t + 1);
    window.addEventListener('anidesk-downloads-update', onDlUpdate);
    return () => window.removeEventListener('anidesk-downloads-update', onDlUpdate);
  }, []);

  const handleDownloadEpisode = async (ep: EpisodeItem, e: React.MouseEvent) => {
    e.stopPropagation();
    sound.playClick();
    setDownloadingEps((prev) => ({ ...prev, [ep.id]: true }));
    const res = await downloadManager.startEpisodeDownload({
      anime: { id: anime.id, title: anime.title, poster: anime.poster },
      episode: ep,
      track: selectedTrack,
      quality: selectedQuality,
    });
    if (!res.success) {
      alert(`Could not start download: ${res.error || 'Network error'}`);
      setDownloadingEps((prev) => ({ ...prev, [ep.id]: false }));
    }
  };

  const handleStartBulkDownload = async () => {
    sound.playSelect();
    let targets: EpisodeItem[] = [];
    if (bulkTab === 'all') {
      targets = episodes;
    } else {
      targets = episodes.filter((ep) => selectedEpisodeIds.has(ep.id));
    }

    if (targets.length === 0) {
      alert('Please select at least one episode to download.');
      return;
    }

    setIsBulkDownloading(true);
    setShowBulkModal(false);
    setBulkToast(`Queuing ${targets.length} episodes (${selectedQuality} • ${selectedTrack.toUpperCase()})...`);

    await downloadManager.bulkDownloadEpisodes({
      anime: { id: anime.id, title: anime.title, poster: anime.poster },
      episodes: targets,
      track: selectedTrack,
      quality: selectedQuality,
    });

    setIsBulkDownloading(false);
    setBulkToast(`All ${targets.length} episodes added to download queue!`);
    setTimeout(() => setBulkToast(null), 3500);
  };

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    Promise.all([
      api.getAnimeDetail(anime.id).catch(() => null),
      api.getEpisodes(anime.id).catch(() => ({ data: [] })),
    ]).then(([detailRes, epsRes]) => {
      if (!isMounted) return;
      if (detailRes) setDetail(detailRes);
      if (epsRes && epsRes.data) setEpisodes(epsRes.data);
      setIsLoading(false);
    });

    const continueEntry = storage.getContinueWatching().find((c) => c.animeId === anime.id);
  const resumeEp = continueEntry
    ? episodes.find((e) => e.id === continueEntry.episodeId) || episodes[0]
    : episodes[0];
  const resumeLabel = continueEntry ? `Resume EP ${resumeEp?.number || 1}` : 'Play EP 1';

  return () => {
      isMounted = false;
    };
  }, [anime.id]);

  const handleStatusChange = (status: WatchlistStatus | null) => {
    storage.setWatchlistStatus(anime, status);
    setWatchlistStatus(status);
    setShowStatusMenu(false);
  };

  const bannerUrl = getImageUrl(detail?.banner || anime.banner || anime.poster);
  const posterUrl = getImageUrl(detail?.poster || anime.poster);
  const hasDubEpisodes = episodes.some((e) => e.has_dub);

  // Group episodes into chunks of 50 for tabs
  const chunkSize = 50;
  const totalChunks = Math.ceil(episodes.length / chunkSize) || 1;
  const filteredEpisodes = episodes.filter((ep) => {
    if (!epSearch) return true;
    return ep.number.toString().includes(epSearch) || ep.title?.toLowerCase().includes(epSearch.toLowerCase());
  });

  const displayedEpisodes = epSearch
    ? filteredEpisodes
    : episodes.slice(selectedRange * chunkSize, (selectedRange + 1) * chunkSize);

  const continueEntry = storage.getContinueWatching().find((c) => c.animeId === anime.id);
  const resumeEp = continueEntry
    ? episodes.find((e) => e.id === continueEntry.episodeId) || episodes[0]
    : episodes[0];
  const resumeLabel = continueEntry ? `Resume EP ${resumeEp?.number || 1}` : 'Play EP 1';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 lg:p-8 select-none">
      <div className="relative w-full max-w-5xl max-h-[92vh] bg-anifam-card rounded-2xl overflow-hidden border border-anifam-border shadow-2xl flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-40 p-2 rounded-full bg-black/60 hover:bg-anifam-red text-white backdrop-blur-md border border-white/10 transition-colors"
        >
          <X size={18} />
        </button>

        {/* Scrollable Container */}
        <div className="overflow-y-auto flex-1">
          {/* Hero Banner Header */}
          <div className="relative w-full h-72 md:h-80 overflow-hidden bg-anifam-surface">
            <img
              src={bannerUrl}
              alt={anime.title}
              className="w-full h-full object-cover object-top opacity-95 brightness-[1.04] contrast-[1.02]"
              onError={(e) => {
                (e.target as HTMLImageElement).src = posterUrl;
              }}
            />
            <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-anifam-card to-transparent pointer-events-none" />

            {/* Poster & Quick Header Info */}
            <div className="absolute bottom-6 left-6 right-6 flex items-end space-x-6">
              <img
                src={posterUrl}
                alt={anime.title}
                className="w-28 md:w-36 aspect-[3/4] object-cover rounded-xl shadow-2xl border-2 border-white/10 flex-shrink-0"
              />
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-anifam-red text-white text-[10px] font-bold uppercase shadow-glow-red">
                    {anime.type || 'TV'}
                  </span>
                  {anime.score && anime.score > 0 && (
                    <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-bold">
                      <Star size={11} className="fill-amber-400 text-amber-400" />
                      <span>{Number(anime.score).toFixed(1)}</span>
                    </span>
                  )}
                  {anime.sub > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-white/10 text-white text-[10px] font-semibold">
                      SUB {anime.sub}
                    </span>
                  )}
                  {anime.dub > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-anifam-softRed/20 text-anifam-softRed border border-anifam-softRed/40 text-[10px] font-semibold">
                      DUB {anime.dub}
                    </span>
                  )}
                </div>

                <h1 className="text-xl md:text-3xl font-extrabold text-white tracking-tight leading-tight line-clamp-2">
                  {anime.title}
                </h1>
                {anime.title_jp && (
                  <p className="text-xs text-anifam-textDim font-medium">{anime.title_jp}</p>
                )}

                {/* Primary Action Buttons */}
                <div className="flex items-center space-x-3 pt-2">
                  {episodes.length > 0 && resumeEp && (
                    <button
                      onClick={() =>
                        onPlayEpisode(
                          resumeEp.id,
                          anime.title,
                          resumeEp,
                          episodes,
                          selectedTrack,
                          detail?.anilist_id || anime.anilist_id
                        )
                      }
                      className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-glow-red hover:scale-105 active:scale-95 transition-all"
                    >
                      <Play size={15} fill="currentColor" />
                      <span>{resumeLabel}</span>
                    </button>
                  )}

                  {/* Watchlist Status Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setShowStatusMenu(!showStatusMenu)}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-medium border backdrop-blur-md transition-all ${
                        watchlistStatus
                          ? 'bg-anifam-red/20 text-anifam-softRed border-anifam-red/40'
                          : 'bg-white/10 hover:bg-white/15 text-white border-white/15'
                      }`}
                    >
                      <Bookmark size={14} fill={watchlistStatus ? 'currentColor' : 'none'} />
                      <span className="capitalize">
                        {watchlistStatus ? watchlistStatus.replace(/_/g, ' ') : 'Add to List'}
                      </span>
                      <ChevronDown size={13} />
                    </button>

                    {showStatusMenu && (
                      <div className="absolute top-full mt-2 left-0 w-44 bg-anifam-surface border border-anifam-border rounded-xl shadow-2xl p-1 z-50 text-xs text-white">
                        <button
                          onClick={() => handleStatusChange('watching')}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-anifam-card text-left text-anifam-textMuted hover:text-white"
                        >
                          <span>Watching</span>
                          {watchlistStatus === 'watching' && <Check size={14} className="text-anifam-red" />}
                        </button>
                        <button
                          onClick={() => handleStatusChange('plan_to_watch')}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-anifam-card text-left text-anifam-textMuted hover:text-white"
                        >
                          <span>Plan to Watch</span>
                          {watchlistStatus === 'plan_to_watch' && <Check size={14} className="text-anifam-red" />}
                        </button>
                        <button
                          onClick={() => handleStatusChange('completed')}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-anifam-card text-left text-anifam-textMuted hover:text-white"
                        >
                          <span>Completed</span>
                          {watchlistStatus === 'completed' && <Check size={14} className="text-anifam-red" />}
                        </button>
                        <button
                          onClick={() => handleStatusChange('on_hold')}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-anifam-card text-left text-anifam-textMuted hover:text-white"
                        >
                          <span>On Hold</span>
                          {watchlistStatus === 'on_hold' && <Check size={14} className="text-anifam-red" />}
                        </button>
                        <button
                          onClick={() => handleStatusChange('dropped')}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-anifam-card text-left text-anifam-textMuted hover:text-white"
                        >
                          <span>Dropped</span>
                          {watchlistStatus === 'dropped' && <Check size={14} className="text-anifam-red" />}
                        </button>
                        {watchlistStatus && (
                          <button
                            onClick={() => handleStatusChange(null)}
                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-anifam-card text-anifam-red font-semibold border-t border-anifam-border mt-1"
                          >
                            Remove from List
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Details & Navigation Content */}
          <div className="p-6 space-y-6">
            {/* Metadata Pills & Synopsis */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Left Column: Synopsis & Genres */}
              <div className="md:col-span-3 space-y-4">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-anifam-textDim mb-1.5">
                    Overview
                  </h3>
                  <p className="text-xs md:text-sm text-anifam-textMuted leading-relaxed">
                    {detail?.synopsis || anime.synopsis || 'No synopsis available for this anime.'}
                  </p>
                </div>

                {/* Genres */}
                {detail?.genres && detail.genres.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-anifam-textDim mb-2">
                      Genres
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {detail.genres.map((g) => (
                        <span
                          key={g.id}
                          className="text-xs px-2.5 py-1 rounded-lg bg-anifam-surface border border-anifam-border text-anifam-textMuted hover:text-white transition-colors"
                        >
                          {g.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Metadata Box */}
              <div className="bg-anifam-surface/80 rounded-xl p-4 border border-anifam-border/60 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-anifam-textDim flex items-center space-x-1.5">
                    <Film size={13} />
                    <span>Type</span>
                  </span>
                  <span className="font-semibold text-white">{detail?.type || anime.type || 'TV'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-anifam-textDim flex items-center space-x-1.5">
                    <Calendar size={13} />
                    <span>Aired</span>
                  </span>
                  <span className="font-semibold text-white">{detail?.aired || anime.status || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-anifam-textDim flex items-center space-x-1.5">
                    <Clock size={13} />
                    <span>Duration</span>
                  </span>
                  <span className="font-semibold text-white">{detail?.duration || anime.duration || '24m'}</span>
                </div>
                {detail?.studios && detail.studios.length > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-anifam-textDim flex items-center space-x-1.5">
                      <Building size={13} />
                      <span>Studio</span>
                    </span>
                    <span className="font-semibold text-white truncate max-w-[120px]">
                      {detail.studios.map((s) => s.name).join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Tabs Header: Episodes / Comments / Related */}
            <div className="border-b border-anifam-border flex items-center justify-between pt-4">
              <div className="flex space-x-6">
                <button
                  onClick={() => setActiveTab('episodes')}
                  className={`pb-3 text-xs font-bold uppercase tracking-wider relative transition-colors ${
                    activeTab === 'episodes' ? 'text-anifam-red' : 'text-anifam-textMuted hover:text-white'
                  }`}
                >
                  Episodes ({episodes.length})
                  {activeTab === 'episodes' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-anifam-red shadow-glow-red" />
                  )}
                </button>
              </div>

              {/* Episode Search Bar (when in episodes tab) */}
              {activeTab === 'episodes' && episodes.length > 10 && (
                <div className="relative pb-2">
                  <Search size={13} className="absolute left-2.5 top-2.5 text-anifam-textDim" />
                  <input
                    type="text"
                    value={epSearch}
                    onChange={(e) => setEpSearch(e.target.value)}
                    placeholder="Search episode..."
                    className="w-40 pl-8 pr-3 py-1 bg-anifam-surface border border-anifam-border rounded-lg text-xs text-white placeholder-anifam-textDim focus:outline-none focus:border-anifam-red"
                  />
                </div>
              )}
            </div>

            {/* Tab 1: Episodes Grid */}
            {activeTab === 'episodes' && (
              <div className="space-y-4">
                {/* Master Episode & Download Toolbar (SUB/DUB, Quality, Bulk DL) */}
                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 flex flex-wrap items-center justify-between gap-3 shadow-lg backdrop-blur-md">
                  {/* Left: SUB / DUB Toggle */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-white/40 uppercase tracking-wider hidden sm:inline">Audio Track:</span>
                    <div className="flex p-1 rounded-xl bg-[#14141E] border border-white/10">
                      <button
                        onClick={() => {
                          sound.playToggle();
                          setSelectedTrack('sub');
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          selectedTrack === 'sub'
                            ? 'bg-primary text-white shadow-glow-red'
                            : 'text-white/60 hover:text-white'
                        }`}
                      >
                        <span>🇯🇵 Japanese (SUB)</span>
                      </button>
                      <button
                        onClick={() => {
                          sound.playToggle();
                          setSelectedTrack('dub');
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          selectedTrack === 'dub'
                            ? 'bg-primary text-white shadow-glow-red'
                            : 'text-white/60 hover:text-white'
                        }`}
                        title={hasDubEpisodes ? 'English Dubbed Audio' : 'DUB may not be available for all episodes'}
                      >
                        <span>🎙️ English (DUB)</span>
                        {hasDubEpisodes && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                      </button>
                    </div>
                  </div>

                  {/* Center: Download Quality Selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-white/40 uppercase tracking-wider hidden sm:inline">Quality:</span>
                    <div className="flex p-1 rounded-xl bg-[#14141E] border border-white/10">
                      {(['1080p', '720p', '480p', '360p'] as const).map((q) => (
                        <button
                          key={q}
                          onClick={() => {
                            sound.playToggle();
                            setSelectedQuality(q);
                            storage.savePreferences({ downloadQuality: q });
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase transition-all ${
                            selectedQuality === q
                              ? 'bg-white/20 text-white shadow-sm border border-white/20'
                              : 'text-white/50 hover:text-white'
                          }`}
                          title={`Preferred download quality: ${q}`}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Right: Bulk Download Action Button */}
                  <button
                    onClick={() => {
                      sound.playClick();
                      setShowBulkModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-orange-600 hover:from-primary-hover hover:to-orange-500 text-white text-xs font-black uppercase tracking-wider shadow-glow-red transition-all active:scale-95"
                    title="Bulk download entire anime or select specific episodes"
                  >
                    <ArrowDownToLine size={14} className="stroke-[2.5]" />
                    <span>Bulk Download</span>
                  </button>
                </div>

                {/* Bulk Progress & Toast Bar */}
                {bulkToast && (
                  <div className="p-3 rounded-xl bg-primary/20 border border-primary/30 text-white text-xs font-bold flex items-center justify-between gap-2 animate-fadeIn">
                    <div className="flex items-center gap-2">
                      <Sparkles size={14} className="text-primary" />
                      <span>{bulkToast}</span>
                    </div>
                  </div>
                )}

                {/* Range Selector Tabs (e.g. 1-50, 51-100) */}
                {totalChunks > 1 && !epSearch && (
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: totalChunks }).map((_, idx) => {
                      const start = idx * chunkSize + 1;
                      const end = Math.min((idx + 1) * chunkSize, episodes.length);
                      const isSel = selectedRange === idx;

                      return (
                        <button
                          key={idx}
                          onClick={() => setSelectedRange(idx)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                            isSel
                              ? 'bg-anifam-red text-white shadow-glow-red'
                              : 'bg-anifam-surface text-anifam-textMuted hover:text-white hover:bg-anifam-card border border-anifam-border'
                          }`}
                        >
                          {start} - {end}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Episodes Cards Grid */}
                {isLoading ? (
                  <div className="py-12 text-center text-xs text-anifam-textMuted animate-pulse">
                    Loading episode list...
                  </div>
                ) : displayedEpisodes.length === 0 ? (
                  <div className="py-12 text-center text-xs text-anifam-textDim">
                    No episodes found.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
                    {displayedEpisodes.map((ep) => {
                      const isWatched = storage.isEpisodeWatched(ep.id);
                      const isDownloaded = storage.isEpisodeDownloaded(ep.id);
                      const isDownloading =
                        downloadingEps[ep.id] ||
                        storage.getDownloads().some((d) => d.episodeId === ep.id && d.state === 'progressing');

                      return (
                        <button
                          key={ep.id}
                          onClick={() =>
                            onPlayEpisode(
                              ep.id,
                              anime.title,
                              ep,
                              episodes,
                              selectedTrack,
                              detail?.anilist_id || anime.anilist_id
                            )
                          }
                          className={`group flex flex-col p-2.5 rounded-xl border transition-all text-left shadow-sm hover:shadow-glow-red ${
                            isWatched
                              ? 'bg-anidesk-card/60 border-emerald-500/20 hover:border-emerald-500/40'
                              : 'bg-anidesk-surface hover:bg-anidesk-card border-anidesk-border hover:border-primary/50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-white group-hover:text-primary transition-colors flex items-center gap-1">
                              EP {ep.number}
                              {isWatched && <Check size={12} className="text-emerald-400 stroke-[3]" />}
                            </span>
                            <div className="flex items-center space-x-1.5">
                              {ep.has_sub && (
                                <span className="text-[9px] font-bold px-1 rounded bg-black/60 text-white/60">
                                  SUB
                                </span>
                              )}
                              {ep.has_dub && (
                                <span className="text-[9px] font-bold px-1 rounded bg-primary/20 text-primary">
                                  DUB
                                </span>
                              )}
                              <div
                                role="button"
                                onClick={(e) => handleDownloadEpisode(ep, e)}
                                className={`px-2 py-1 rounded-lg border transition-all flex items-center gap-1 shadow-sm active:scale-95 ${
                                  isDownloaded
                                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25'
                                    : isDownloading
                                    ? 'bg-primary/20 border-primary/40 text-primary animate-pulse'
                                    : 'bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/15 hover:border-white/20'
                                }`}
                                title={
                                  isDownloaded
                                    ? `Downloaded Offline (EP ${ep.number})`
                                    : isDownloading
                                    ? `Downloading EP ${ep.number}...`
                                    : `Download EP ${ep.number} (${selectedQuality} • ${selectedTrack.toUpperCase()})`
                                }
                              >
                                {isDownloaded ? (
                                  <>
                                    <CheckCircle2 size={11} className="text-emerald-400 shrink-0" />
                                    <span className="text-[10px] font-black uppercase text-emerald-400">Saved</span>
                                  </>
                                ) : isDownloading ? (
                                  <>
                                    <Loader2 size={11} className="text-primary animate-spin shrink-0" />
                                    <span className="text-[10px] font-black uppercase text-primary">DL</span>
                                  </>
                                ) : (
                                  <>
                                    <Download size={11} className="shrink-0" />
                                    <span className="text-[10px] font-black uppercase">DL</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <p className="text-[11px] text-anidesk-textDim truncate group-hover:text-white/70 transition-colors">
                            {ep.title || `Episode ${ep.number}`}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Download Modal Overlay */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-xl rounded-3xl bg-[#14141E] border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-black/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center text-white shadow-glow-red">
                  <ArrowDownToLine size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white tracking-tight">Bulk Download Anime</h3>
                  <p className="text-xs text-white/50 truncate max-w-sm">{anime.title}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  sound.playClick();
                  setShowBulkModal(false);
                }}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Mode Selector Tabs (All Episodes vs Select Episodes) */}
            <div className="p-5 pb-3 space-y-4">
              <div className="grid grid-cols-2 p-1 rounded-2xl bg-black/40 border border-white/10">
                <button
                  onClick={() => {
                    sound.playClick();
                    setBulkTab('all');
                  }}
                  className={`py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                    bulkTab === 'all'
                      ? 'bg-primary text-white shadow-glow-red'
                      : 'text-white/50 hover:text-white'
                  }`}
                >
                  <FolderDown size={14} />
                  <span>Download All ({episodes.length} EPs)</span>
                </button>
                <button
                  onClick={() => {
                    sound.playClick();
                    setBulkTab('select');
                    if (selectedEpisodeIds.size === 0) {
                      // Default first 12 episodes selected if empty
                      const initial = new Set<number>();
                      episodes.slice(0, 12).forEach((e) => initial.add(e.id));
                      setSelectedEpisodeIds(initial);
                    }
                  }}
                  className={`py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                    bulkTab === 'select'
                      ? 'bg-primary text-white shadow-glow-red'
                      : 'text-white/50 hover:text-white'
                  }`}
                >
                  <Layers size={14} />
                  <span>Select Episodes ({selectedEpisodeIds.size})</span>
                </button>
              </div>

              {/* Global Track & Quality Config for Bulk */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-black/20 border border-white/5 text-xs">
                <div>
                  <span className="text-[11px] font-bold text-white/40 uppercase tracking-wider block mb-1.5">Audio Track</span>
                  <div className="flex p-1 rounded-xl bg-[#181824] border border-white/10">
                    <button
                      onClick={() => {
                        sound.playToggle();
                        setSelectedTrack('sub');
                      }}
                      className={`flex-1 py-1 rounded-lg font-bold text-[11px] transition-all ${
                        selectedTrack === 'sub' ? 'bg-primary text-white' : 'text-white/50 hover:text-white'
                      }`}
                    >
                      🇯🇵 SUB
                    </button>
                    <button
                      onClick={() => {
                        sound.playToggle();
                        setSelectedTrack('dub');
                      }}
                      className={`flex-1 py-1 rounded-lg font-bold text-[11px] transition-all ${
                        selectedTrack === 'dub' ? 'bg-primary text-white' : 'text-white/50 hover:text-white'
                      }`}
                    >
                      🎙️ DUB
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-white/40 uppercase tracking-wider block mb-1.5">Resolution</span>
                  <div className="flex p-1 rounded-xl bg-[#181824] border border-white/10">
                    {(['1080p', '720p', '480p'] as const).map((q) => (
                      <button
                        key={q}
                        onClick={() => {
                          sound.playToggle();
                          setSelectedQuality(q);
                        }}
                        className={`flex-1 py-1 rounded-lg font-bold text-[11px] uppercase transition-all ${
                          selectedQuality === q ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white'
                        }`}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Tab Specific Content */}
            <div className="px-5 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
              {bulkTab === 'all' ? (
                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-3">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles size={16} className="text-primary" />
                    <span>Full Season Package</span>
                  </h4>
                  <p className="text-xs text-white/70 leading-relaxed">
                    All <strong className="text-white">{episodes.length} episodes</strong> of{' '}
                    <strong className="text-white">{anime.title}</strong> will be downloaded sequentially in high quality (
                    {selectedQuality}) with synchronized subtitles and saved into your chosen anime storage directory.
                  </p>
                  <div className="pt-2 flex items-center justify-between text-xs text-white/50 border-t border-white/5">
                    <span>Estimated Queue: {episodes.length} files</span>
                    <span>Storage format: MP4 (Full Bitrate)</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Range Selector & Fast Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-black/30 border border-white/5">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-white/50 font-bold">Range:</span>
                      <input
                        type="number"
                        min={1}
                        max={episodes.length}
                        value={rangeStart}
                        onChange={(e) => setRangeStart(parseInt(e.target.value) || 1)}
                        className="w-14 px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-white font-mono text-center text-xs"
                      />
                      <span className="text-white/30">to</span>
                      <input
                        type="number"
                        min={1}
                        max={episodes.length}
                        value={rangeEnd}
                        onChange={(e) => setRangeEnd(parseInt(e.target.value) || episodes.length)}
                        className="w-14 px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-white font-mono text-center text-xs"
                      />
                      <button
                        onClick={() => {
                          sound.playClick();
                          const newSet = new Set(selectedEpisodeIds);
                          episodes.forEach((ep) => {
                            if (ep.number >= rangeStart && ep.number <= rangeEnd) {
                              newSet.add(ep.id);
                            }
                          });
                          setSelectedEpisodeIds(newSet);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 font-bold transition-all"
                      >
                        Apply
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          sound.playClick();
                          setSelectedEpisodeIds(new Set(episodes.map((e) => e.id)));
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-semibold"
                      >
                        Select All
                      </button>
                      <button
                        onClick={() => {
                          sound.playClick();
                          setSelectedEpisodeIds(new Set());
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-semibold"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {/* Episode Grid Selector */}
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-52 overflow-y-auto p-1">
                    {episodes.map((ep) => {
                      const isSelected = selectedEpisodeIds.has(ep.id);
                      return (
                        <button
                          key={ep.id}
                          onClick={() => {
                            sound.playClick();
                            const next = new Set(selectedEpisodeIds);
                            if (next.has(ep.id)) {
                              next.delete(ep.id);
                            } else {
                              next.add(ep.id);
                            }
                            setSelectedEpisodeIds(next);
                          }}
                          className={`py-2 px-1 rounded-xl text-xs font-bold transition-all border ${
                            isSelected
                              ? 'bg-primary text-white border-primary shadow-glow-sm'
                              : 'bg-white/5 border-white/5 text-white/60 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          EP {ep.number}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer CTA */}
            <div className="p-5 border-t border-white/10 bg-black/40 flex items-center justify-between gap-4 mt-3">
              <span className="text-xs text-white/50">
                {bulkTab === 'all'
                  ? `${episodes.length} Episodes Ready`
                  : `${selectedEpisodeIds.size} Episodes Selected`}
              </span>

              <button
                onClick={handleStartBulkDownload}
                disabled={bulkTab === 'select' && selectedEpisodeIds.size === 0}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary to-orange-600 hover:from-primary-hover hover:to-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-wider shadow-glow-red transition-all active:scale-95"
              >
                <ArrowDownToLine size={16} />
                <span>
                  {bulkTab === 'all'
                    ? `Download All (${episodes.length} EPs)`
                    : `Download Selected (${selectedEpisodeIds.size} EPs)`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
