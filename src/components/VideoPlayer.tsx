import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Hls from 'hls.js';
import {
  PlaybackData,
  PlaySource,
  EpisodeItem,
} from '../types/api';
import { api, reorderSources } from '../services/api';
import { storage, VisualEnhancerMode } from '../services/storage';
import { downloadManager } from '../services/downloadManager';
import { sound } from '../services/sound';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  FastForward,
  RotateCcw,
  SkipForward,
  SkipBack,
  ChevronLeft,
  Server,
  Subtitles,
  Tv,
  Sparkles,
  CheckCircle2,
  XCircle,
  Loader2,
  Minus,
  Square,
  Copy,
  X,
  Download,
  HardDrive,
  AlertCircle,
  Zap,
  Lock,
  Unlock,
} from 'lucide-react';

interface ServerHealthStatus {
  status: 'checking' | 'online' | 'offline';
  ping?: number;
  resolvedSource?: PlaySource;
}

interface VideoPlayerProps {
  animeId: number;
  animeTitle: string;
  animePoster: string;
  playbackData: PlaybackData;
  episodeItem: EpisodeItem;
  allEpisodes: EpisodeItem[];
  onClose: () => void;
  onSelectEpisode: (episodeId: number) => void;
  anilistId?: number;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  animeId,
  animeTitle,
  animePoster,
  playbackData,
  episodeItem,
  allEpisodes,
  onClose,
  onSelectEpisode,
  anilistId,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Live playback state refs to prevent stale closure bugs
  const isPlayingRef = useRef<boolean>(false);
  const controlsTimeoutRef = useRef<any>(null);
  const hudTimeoutRef = useRef<any>(null);
  const lastSavedRef = useRef<number>(0);
  const pendingSeekTimeRef = useRef<number | null>(playbackData.resume_position || null);
  const hasAutoSkippedIntroRef = useRef<boolean>(false);
  const hasAutoSkippedOutroRef = useRef<boolean>(false);

  // Web Audio 200% Booster Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const audioSourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  // Watchdog & Failover Refs
  const loadWatchdogRef = useRef<any>(null);
  const failedServersRef = useRef<Set<number>>(new Set());
  const [failedServers, setFailedServers] = useState<Set<number>>(new Set());

  // Auto Skip State
  const [autoSkip, setAutoSkip] = useState<boolean>(() => storage.getPreferences().autoSkipIntro);

  // Player Screen Lock State
  const [isLocked, setIsLocked] = useState(false);
  const [showUnlockButton, setShowUnlockButton] = useState(false);
  const unlockTimerRef = useRef<any>(null);
  const loadedSourceKeyRef = useRef<string>('');

  // Player State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(() => storage.getPreferences().volume);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  // Stream Selection State
  const [currentTrack, setCurrentTrack] = useState<'sub' | 'dub'>(playbackData.track);
  const [sources, setSources] = useState<PlaySource[]>(() => reorderSources(playbackData.sources));
  const [activeSourceIndex, setActiveSourceIndex] = useState(0);
  const [currentSource, setCurrentSource] = useState<PlaySource>(() => {
    const list = reorderSources(playbackData.sources);
    return list[0] || null;
  });
  const [isIframeMode, setIsIframeMode] = useState(false);
  const [qualities, setQualities] = useState<Array<{ height: number; index: number }>>([]);
  const [currentQualityIndex, setCurrentQualityIndex] = useState<number>(-1);
  const [availableSubtitles, setAvailableSubtitles] = useState<Array<{ lang: string; label: string; url: string }>>([]);
  const [selectedSubtitle, setSelectedSubtitle] = useState<string>('en');

  // Server Health & Auto-Detection Map
  const [serverHealth, setServerHealth] = useState<Record<number, ServerHealthStatus>>({});
  const [autoSelectedMessage, setAutoSelectedMessage] = useState<string | null>(null);

  // Visual Enhancer (Default 'off' for pure native 1:1 hardware video rendering)
  const [enhancerMode, setEnhancerMode] = useState<VisualEnhancerMode>(
    () => storage.getPreferences().visualEnhancerMode || 'off'
  );

  // Center HUD (Volume / Seek / Enhancer Toast)
  const [hudMessage, setHudMessage] = useState<{ text: string; icon?: any } | null>(null);
  const [seekRipple, setSeekRipple] = useState<'left' | 'right' | null>(null);

  // Menus
  const [activeMenu, setActiveMenu] = useState<'none' | 'servers' | 'quality' | 'subs' | 'enhancer'>('none');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  const preferences = storage.getPreferences();

  // Download active stream
  const handleDownloadActiveEpisode = async () => {
    sound.playClick();
    if (!currentSource || !currentSource.url) {
      showHud('Unable to download: Stream link missing', AlertCircle);
      return;
    }

    showHud(`Queued EP ${episodeItem.number} for download!`, Download);

      const dlQuality = (currentQualityIndex >= 0 && qualities[currentQualityIndex])
        ? `${qualities[currentQualityIndex].height}p`
        : (storage.getPreferences().downloadQuality || '1080p');

      const res = await downloadManager.startEpisodeDownload({
        anime: { id: animeId, title: animeTitle, poster: animePoster },
        episode: episodeItem,
        track: currentTrack,
        quality: dlQuality,
        streamUrl: currentSource.url,
        mediaHeaders: currentSource.media_headers,
        subtitles: currentSource.subtitles,
      });

    if (res.success) {
      showHud(`Downloading EP ${episodeItem.number} in background`, CheckCircle2);
    } else {
      showHud(`Download failed: ${res.error || 'Network error'}`, AlertCircle);
    }
  };

  // Exit / Close player cleanly, ensuring fullscreen is released
  const handleExitPlayer = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    onClose();
  }, [onClose]);

  // Sync isPlayingRef
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Sync when playbackData prop changes
  useEffect(() => {
    const reordered = reorderSources(playbackData.sources);
    setSources(reordered);
    setActiveSourceIndex(0);
    setCurrentSource(reordered[0] || null);
  }, [playbackData.episode_id, playbackData.track]);

  const showHud = (text: string, icon?: any) => {
    setHudMessage({ text, icon });
    if (hudTimeoutRef.current) clearTimeout(hudTimeoutRef.current);
    hudTimeoutRef.current = setTimeout(() => {
      setHudMessage(null);
    }, 1100);
  };

  // Auto-hide controls after 2.5s of mouse stillness while playing
  const resetControlsTimer = useCallback(() => {
    if (isLocked) {
      setShowUnlockButton(true);
      if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current);
      unlockTimerRef.current = setTimeout(() => {
        setShowUnlockButton(false);
      }, 2500);
      return;
    }

    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);

    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlayingRef.current) {
        setShowControls(false);
        setActiveMenu('none');
      }
    }, 2500);
  }, [isLocked]);

  // 1. Proactive Server Health Probing & Auto-Select Working Server
  useEffect(() => {
    let isCancelled = false;
    const curSources = sources || [];
    if (curSources.length === 0) return;

    // Initialize all as checking
    const initialHealth: Record<number, ServerHealthStatus> = {};
    curSources.forEach((_, idx) => {
      initialHealth[idx] = { status: 'checking' };
    });
    setServerHealth(initialHealth);

    const probeServer = async (src: PlaySource, index: number) => {
      const startTime = Date.now();
      try {
        let streamUrl = src.url;
        let resolved = src;

        if (src.resolvable && src.server_id && (!src.url || !src.url.includes('.m3u8'))) {
          resolved = await api.resolveServer(episodeItem.id, src.server_id, currentTrack);
          streamUrl = resolved.url;
        }

        if (!streamUrl) throw new Error('No stream URL');

        const pingMs = Date.now() - startTime;
        if (isCancelled) return;

        setServerHealth((prev) => ({
          ...prev,
          [index]: { status: 'online', ping: pingMs, resolvedSource: resolved },
        }));
      } catch (err) {
        if (isCancelled) return;
        setServerHealth((prev) => ({
          ...prev,
          [index]: { status: 'offline' },
        }));
      }
    };

    // Probe all sources in parallel
    curSources.forEach((src, idx) => {
      probeServer(src, idx);
    });

    return () => {
      isCancelled = true;
    };
  }, [playbackData.episode_id, currentTrack, sources]);

  // Clean up watchdog timer
  const clearWatchdog = useCallback(() => {
    if (loadWatchdogRef.current) {
      clearTimeout(loadWatchdogRef.current);
      loadWatchdogRef.current = null;
    }
  }, []);

  // Failover to next verified working server
  const failoverToNextWorkingServer = useCallback((reason?: string) => {
    clearWatchdog();
    const curr = activeSourceIndex;
    failedServersRef.current.add(curr);
    setFailedServers(new Set(failedServersRef.current));
    setServerHealth((prev) => ({
      ...prev,
      [curr]: { status: 'offline' },
    }));

    // Find next server that has not been tried yet
    let nextIdx = -1;
    for (let i = 0; i < sources.length; i++) {
      if (!failedServersRef.current.has(i)) {
        nextIdx = i;
        break;
      }
    }

    if (nextIdx !== -1 && sources[nextIdx]) {
      const nextSrc = sources[nextIdx];
      const sName = nextSrc.server || `Server ${nextIdx + 1}`;
      console.warn(`[ANIDESK] Server ${curr} failed (${reason || 'network error'}). Auto-switching to: ${sName}`);
      showHud(`Auto-Switched to ${sName}`, CheckCircle2);
      handleServerSelect(nextSrc, nextIdx);
    } else {
      console.error('[ANIDESK] All available servers failed for this episode.');
      setErrorMessage('Streaming servers are currently unavailable for this episode. Please switch SUB/DUB track or retry.');
      setIsLoading(false);
    }
  }, [activeSourceIndex, sources, clearWatchdog]);

  // Clean watchdog on unmount
  useEffect(() => {
    return () => {
      clearWatchdog();
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, [clearWatchdog]);

  // 2. Load HLS stream with True 1080p Resolution & Auto-Failover Watchdog
  const loadStream = useCallback(async (source: PlaySource, seekPosition?: number) => {
    if (!videoRef.current || !source) return;

    setIsLoading(true);
    setErrorMessage(null);

    let activeSource = source;

    // Auto-resolve resolvable sources (Vidstream-2, Vidstream-1, etc.)
    if (source.resolvable && source.server_id && (!source.url || !source.url.includes('.m3u8'))) {
      try {
        const resolved = await api.resolveServer(episodeItem.id, source.server_id, currentTrack);
        activeSource = { ...source, ...resolved, skip: resolved.skip || source.skip };
        loadedSourceKeyRef.current = `${activeSource.server_id || activeSource.server}_${activeSource.url}`;
        setCurrentSource(activeSource);
        if (resolved.subtitles && resolved.subtitles.length > 0) {
          setAvailableSubtitles(resolved.subtitles);
          const defSub = resolved.subtitles.find((s) => s.default || s.lang === 'en');
          if (defSub) setSelectedSubtitle(defSub.lang);
        }
      } catch (err: any) {
        console.error('[ANIDESK] Failed to resolve stream for server:', source.server, err);
        setErrorMessage(`Server ${source.server} unreachable. Auto-switching to backup...`);
        failoverToNextWorkingServer('Failed to resolve server');
        return;
      }
    }

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const streamUrl = activeSource.url;
    if (!streamUrl) {
      console.warn(`[ANIDESK] Server ${activeSource.server} missing stream URL. Auto-switching...`);
      failoverToNextWorkingServer('Missing stream URL');
      return;
    }

    // Direct / Offline Local Playback support (.mp4, .ts, file://)
    if (streamUrl.startsWith('file://') || streamUrl.endsWith('.mp4') || streamUrl.endsWith('.ts')) {
      if (videoRef.current) {
        setIsIframeMode(false);
        clearWatchdog();
        videoRef.current.src = streamUrl;
        setIsLoading(false);
        setQualities([{ height: 1080, index: 0 }]);
        setCurrentQualityIndex(0);
        showHud('Offline Local Playback (1080p)', Tv);
        videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
      return;
    }

    // Direct iframe embed fallback
    if (activeSource.kind === 'iframe' && !streamUrl.includes('.m3u8')) {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.removeAttribute('src');
        videoRef.current.load();
      }
      setIsIframeMode(true);
      setIsLoading(false);
      clearWatchdog();
      return;
    }
    setIsIframeMode(false);

    // Start 6.5s watchdog timer for initial playback
    clearWatchdog();
    loadWatchdogRef.current = setTimeout(() => {
      if (videoRef.current && (videoRef.current.readyState < 2 || videoRef.current.currentTime === 0)) {
        console.warn(`[ANIDESK] Stream stalled after 6.5s on server ${activeSourceIndex}. Initiating auto-failover.`);
        failoverToNextWorkingServer('Connection timeout');
      }
    }, 6500);

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        capLevelToPlayerSize: false, // Ensures full 1080p regardless of window size
        capLevelOnFPSDrop: false,
        abrEwmaDefaultEstimate: 50000000, // 50 Mbps desktop bandwidth estimate (never defaults to 500kbps mobile)
        abrEwmaDefaultEstimateMax: 100000000,
        abrBandWidthFactor: 0.95,
        abrBandWidthUpFactor: 0.85,
        maxBufferLength: 90,
        maxMaxBufferLength: 180,
        maxBufferSize: 120 * 1024 * 1024, // 120MB high-bitrate buffer
        preserveManualLevelOnError: true, // Never silently drop to 360p on network hiccups
        minAutoBitrate: 3000000, // Enforce HD floor
        xhrSetup: (xhr) => {
          if (activeSource.media_headers) {
            const ref = activeSource.media_headers['Referer'] || activeSource.media_headers['referer'];
            if (ref) {
              try { xhr.setRequestHeader('X-Target-Referer', ref); } catch {}
            }
            const orig = activeSource.media_headers['Origin'] || activeSource.media_headers['origin'];
            if (orig) {
              try { xhr.setRequestHeader('X-Target-Origin', orig); } catch {}
            }
            Object.entries(activeSource.media_headers).forEach(([key, val]) => {
              const lower = key.toLowerCase();
              if (lower !== 'referer' && lower !== 'origin' && lower !== 'user-agent') {
                try {
                  xhr.setRequestHeader(key, val);
                } catch {}
              }
            });
          }
        },
      });

      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(videoRef.current);

      hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
        setIsLoading(false);
        clearWatchdog();

        const mappedQualities = data.levels.map((lvl, index) => ({
          height: lvl.height,
          index,
        }));
        setQualities(mappedQualities);

        // ALWAYS AUTO-LOCK HIGHEST QUALITY (1080p Full HD / 720p HD)
        if (data.levels && data.levels.length > 0) {
          const sorted = data.levels
            .map((lvl, index) => ({ height: lvl.height, index }))
            .sort((a, b) => b.height - a.height);
          const highest = sorted[0];
          hls.startLevel = highest.index;
          hls.nextLevel = highest.index;
          hls.loadLevel = highest.index;
          hls.currentLevel = highest.index;
          setCurrentQualityIndex(highest.index);
          const qualityTag = highest.height >= 1080 ? 'Ultra HD' : highest.height >= 720 ? 'HD' : 'SD';
          showHud(`${activeSource.server || 'Server'} • ${highest.height}p ${qualityTag} Locked`, Tv);
        }

        // Restore saved position
        const targetTime = seekPosition ?? pendingSeekTimeRef.current;
        if (targetTime && targetTime > 5 && videoRef.current) {
          videoRef.current.currentTime = targetTime;
          pendingSeekTimeRef.current = null;
        }

        videoRef.current?.play().then(() => setIsPlaying(true)).catch(() => {});
      });

      // Track active quality level changes and reflect accurately in UI
      hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
        if (data.level >= 0 && hls.levels && hls.levels[data.level]) {
          const currentLvl = hls.levels[data.level];
          console.log(`[ANIDESK Video Pipeline] Active level: ${currentLvl.height}p @ ${(currentLvl.bitrate / 1000000).toFixed(1)} Mbps`);
          setCurrentQualityIndex(data.level);
        }
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.warn('[ANIDESK] Fatal network error. Switching to backup server...');
              failoverToNextWorkingServer('Fatal network error');
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              failoverToNextWorkingServer('Fatal player error');
              break;
          }
        }
      });
    } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
      videoRef.current.src = streamUrl;
      videoRef.current.play().then(() => {
        setIsPlaying(true);
        setIsLoading(false);
        clearWatchdog();
      }).catch(() => {});
    }
  }, [activeSourceIndex, episodeItem.id, currentTrack, sources, clearWatchdog, failoverToNextWorkingServer]);

  // Initial load
  useEffect(() => {
    if (currentSource) {
      const sourceKey = `${currentSource.server_id || currentSource.server}_${currentSource.url}`;
      if (loadedSourceKeyRef.current === sourceKey) return;
      loadedSourceKeyRef.current = sourceKey;
      loadStream(currentSource, pendingSeekTimeRef.current || undefined);
      if (currentSource.subtitles) {
        setAvailableSubtitles(currentSource.subtitles);
        const defSub = currentSource.subtitles.find((s) => s.default || s.lang === 'en');
        if (defSub) setSelectedSubtitle(defSub.lang);
      }
    }
  }, [currentSource]);

  // Server switch with time preservation
  const handleServerSelect = async (source: PlaySource, index: number) => {
    setActiveMenu('none');
    setActiveSourceIndex(index);
    const savedTime = videoRef.current?.currentTime || 0;

    if (source.resolvable && source.server_id && (!source.url || !source.url.includes('.m3u8'))) {
      setIsLoading(true);
      try {
        const resolved = await api.resolveServer(episodeItem.id, source.server_id, currentTrack);
        const merged = { ...source, ...resolved, skip: resolved.skip || source.skip };
        loadedSourceKeyRef.current = `${merged.server_id || merged.server}_${merged.url}`;
        setCurrentSource(merged);
        loadStream(merged, savedTime);
        showHud(`Switched to ${source.server || 'Server'}`, Server);
      } catch (err) {
        console.warn(`[ANIDESK] Failed to resolve ${source.server}. Auto-failing over...`);
        failoverToNextWorkingServer('Failed to resolve server');
      }
    } else {
      loadedSourceKeyRef.current = `${source.server_id || source.server}_${source.url}`;
      setCurrentSource(source);
      loadStream(source, savedTime);
      showHud(`Switched to ${source.server || 'Server'}`, Server);
    }
  };

  // Audio track switch with time preservation
  const handleTrackChange = async (newTrack: 'sub' | 'dub') => {
    if (newTrack === currentTrack) return;
    const savedTime = videoRef.current?.currentTime || 0;
    setIsLoading(true);
    setCurrentTrack(newTrack);

    try {
      const newPlayData = await api.playEpisode(episodeItem.id, newTrack, anilistId, episodeItem.number);
      if (newPlayData.sources && newPlayData.sources.length > 0) {
        const reordered = reorderSources(newPlayData.sources);
        setSources(reordered);
        setActiveSourceIndex(0);
        const targetSrc = reordered[0];
        setCurrentSource(targetSrc);
        loadStream(targetSrc, savedTime);
        showHud(`Audio Track: ${newTrack.toUpperCase()}`, Subtitles);
      }
    } catch {
      setErrorMessage(`Failed to switch to ${newTrack.toUpperCase()} audio.`);
      setIsLoading(false);
    }
  };

  // Skip Intro / Outro Timings
  const skipIntroRange = useMemo<[number, number] | null>(() => {
    if (currentSource?.skip?.intro && Array.isArray(currentSource.skip.intro)) {
      return currentSource.skip.intro;
    }
    // Intelligent default intro for standard 20+ min anime (85s to 175s)
    if (duration > 600) {
      return [85, 175];
    }
    return null;
  }, [currentSource?.skip?.intro, duration]);

  const skipOutroRange = useMemo<[number, number] | null>(() => {
    if (currentSource?.skip?.outro && Array.isArray(currentSource.skip.outro)) {
      return currentSource.skip.outro;
    }
    // Intelligent default outro for standard 20+ min anime (last 90s before end)
    if (duration > 600) {
      return [Math.max(0, Math.floor(duration - 120)), Math.max(0, Math.floor(duration - 30))];
    }
    return null;
  }, [currentSource?.skip?.outro, duration]);

  const showSkipIntro =
    skipIntroRange &&
    currentTime >= skipIntroRange[0] &&
    currentTime <= skipIntroRange[1];

  const showSkipOutro =
    skipOutroRange &&
    currentTime >= skipOutroRange[0] &&
    currentTime <= skipOutroRange[1];

  // Auto skip intro once per session
  useEffect(() => {
    if (
      autoSkip &&
      showSkipIntro &&
      skipIntroRange &&
      videoRef.current &&
      !hasAutoSkippedIntroRef.current
    ) {
      hasAutoSkippedIntroRef.current = true;
      videoRef.current.currentTime = skipIntroRange[1] + 1;
      showHud('Auto-Skipped Opening Theme', FastForward);
    }
  }, [currentTime, showSkipIntro, skipIntroRange, autoSkip]);

  // Auto skip outro once per session
  useEffect(() => {
    if (
      autoSkip &&
      showSkipOutro &&
      skipOutroRange &&
      videoRef.current &&
      !hasAutoSkippedOutroRef.current
    ) {
      hasAutoSkippedOutroRef.current = true;
      videoRef.current.currentTime = skipOutroRange[1] + 1;
      showHud('Auto-Skipped Ending Theme', FastForward);
    }
  }, [currentTime, showSkipOutro, skipOutroRange, autoSkip]);

  const handleManualSkipIntro = () => {
    if (skipIntroRange && videoRef.current) {
      videoRef.current.currentTime = skipIntroRange[1] + 1;
      showHud('Skipped Opening', FastForward);
    }
  };

  const handleManualSkipOutro = () => {
    if (skipOutroRange && videoRef.current) {
      videoRef.current.currentTime = skipOutroRange[1] + 1;
      showHud('Skipped Ending', FastForward);
    }
  };

  // Visual Enhancer Mode Cycle
  const cycleEnhancerMode = () => {
    const modes: VisualEnhancerMode[] = ['off', 'crisp', 'vivid', 'cinema', 'oled'];
    const nextIdx = (modes.indexOf(enhancerMode) + 1) % modes.length;
    const nextMode = modes[nextIdx];
    setEnhancerMode(nextMode);
    localStorage.setItem('anidesk_enhancer_user_selected', 'true');
    storage.savePreferences({ visualEnhancerMode: nextMode });

    const labels: Record<VisualEnhancerMode, string> = {
      off: 'Native Pure 1080p (Direct GPU Overlay)',
      crisp: 'Ultra Crisp (Edge Clarity)',
      vivid: 'Vivid Anime (Rich Contrast)',
      cinema: 'Cinema Mode (Deep Blacks)',
      oled: 'OLED Boost (High Saturation)',
    };
    showHud(labels[nextMode], Sparkles);
  };

  // Time & Buffer Tracking
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const cur = videoRef.current.currentTime;
    const dur = videoRef.current.duration;
    setCurrentTime(cur);
    setDuration(dur);

    if (videoRef.current.buffered.length > 0) {
      const end = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
      setBuffered(end);
    }

    // Persist progress every 4s
    const now = Date.now();
    if (now - lastSavedRef.current > 4000 && dur > 0) {
      lastSavedRef.current = now;
      storage.saveContinueWatching({
        animeId,
        animeTitle,
        animePoster,
        episodeId: episodeItem.id,
        episodeNumber: episodeItem.number,
        episodeTitle: episodeItem.title,
        position: Math.floor(cur),
        duration: Math.floor(dur),
        track: currentTrack,
      });
    }

    if (dur > 0 && dur - cur <= 15 && dur - cur > 0) {
      const nextEp = allEpisodes.find((e) => e.number === episodeItem.number + 1);
      if (nextEp && countdown === null) {
        setCountdown(Math.floor(dur - cur));
      }
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const target = pos * duration;
    videoRef.current.currentTime = target;
    setCurrentTime(target);

    // Reset auto-skip flags when seeking before boundaries
    if (skipIntroRange && target < skipIntroRange[0]) {
      hasAutoSkippedIntroRef.current = false;
    }
    if (skipOutroRange && target < skipOutroRange[0]) {
      hasAutoSkippedOutroRef.current = false;
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
      showHud('Paused', Pause);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
      showHud('Playing', Play);
    }
  };

  // Web Audio API 200% Gain Booster
  const setupAudioBooster = useCallback(() => {
    if (!videoRef.current) return;
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const source = ctx.createMediaElementSource(videoRef.current);
          const gainNode = ctx.createGain();
          gainNode.gain.value = 1.0;
          source.connect(gainNode);
          gainNode.connect(ctx.destination);
          audioCtxRef.current = ctx;
          gainNodeRef.current = gainNode;
          audioSourceRef.current = source;
        }
      }
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {});
      }
    } catch (e) {
      console.warn('[ANIDESK] AudioContext init note:', e);
    }
  }, []);

  const handleVolumeChange = (newVol: number) => {
    if (!videoRef.current) return;
    const bounded = Math.max(0, Math.min(2.0, newVol));

    if (bounded > 1.0) {
      setupAudioBooster();
      videoRef.current.volume = 1.0;
      if (gainNodeRef.current) {
        gainNodeRef.current.gain.value = bounded;
      }
    } else {
      if (gainNodeRef.current) {
        gainNodeRef.current.gain.value = 1.0;
      }
      videoRef.current.volume = bounded;
    }

    videoRef.current.muted = bounded === 0;
    setVolume(bounded);
    setIsMuted(bounded === 0);
    storage.savePreferences({ volume: Math.min(1.0, bounded) });

    const pct = Math.round(bounded * 100);
    if (pct > 100) {
      showHud(`Volume ${pct}% (BOOSTED ⚡)`, Zap);
    } else {
      showHud(`Volume ${pct}%`, bounded === 0 ? VolumeX : Volume2);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    if (isMuted) {
      videoRef.current.muted = false;
      setIsMuted(false);
      showHud(`Volume ${Math.round(volume * 100)}%`, Volume2);
    } else {
      videoRef.current.muted = true;
      setIsMuted(true);
      showHud('Muted', VolumeX);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const nextEpisode = allEpisodes.find((e) => e.number === episodeItem.number + 1);
  const prevEpisode = allEpisodes.find((e) => e.number === episodeItem.number - 1);

  const handleNextEpisode = () => {
    if (nextEpisode) {
      hasAutoSkippedIntroRef.current = false;
      hasAutoSkippedOutroRef.current = false;
      setCountdown(null);
      onSelectEpisode(nextEpisode.id);
    }
  };

  const handlePrevEpisode = () => {
    if (prevEpisode) {
      hasAutoSkippedIntroRef.current = false;
      hasAutoSkippedOutroRef.current = false;
      setCountdown(null);
      onSelectEpisode(prevEpisode.id);
    }
  };

  // Double-tap zones
  const handlePlayerAreaDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const step = preferences.seekDuration || 10;

    if (clickX < width * 0.35) {
      if (videoRef.current) videoRef.current.currentTime -= step;
      setSeekRipple('left');
      showHud(`-${step}s`, RotateCcw);
      setTimeout(() => setSeekRipple(null), 600);
    } else if (clickX > width * 0.65) {
      if (videoRef.current) videoRef.current.currentTime += step;
      setSeekRipple('right');
      showHud(`+${step}s`, FastForward);
      setTimeout(() => setSeekRipple(null), 600);
    } else {
      toggleFullscreen();
    }
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['input', 'textarea'].includes((e.target as HTMLElement).tagName.toLowerCase())) return;

      // Lock / Unlock shortcut (L)
      if (e.key.toLowerCase() === 'l') {
        e.preventDefault();
        if (isLocked) {
          setIsLocked(false);
          setShowUnlockButton(false);
          setShowControls(true);
          showHud('Player Unlocked', Unlock);
        } else {
          setIsLocked(true);
          setActiveMenu('none');
          setShowControls(false);
          setShowUnlockButton(true);
          if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current);
          unlockTimerRef.current = setTimeout(() => setShowUnlockButton(false), 2500);
        }
        return;
      }

      // If screen is locked, suppress all playback keys & show unlock hint
      if (isLocked) {
        setShowUnlockButton(true);
        if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current);
        unlockTimerRef.current = setTimeout(() => setShowUnlockButton(false), 2500);
        return;
      }

      const step = preferences.seekDuration || 10;

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'arrowleft':
          e.preventDefault();
          if (videoRef.current) videoRef.current.currentTime -= step;
          showHud(`-${step}s`, RotateCcw);
          break;
        case 'arrowright':
          e.preventDefault();
          if (videoRef.current) videoRef.current.currentTime += step;
          showHud(`+${step}s`, FastForward);
          break;
        case 'arrowup':
          e.preventDefault();
          handleVolumeChange(volume + 0.05);
          break;
        case 'arrowdown':
          e.preventDefault();
          handleVolumeChange(volume - 0.05);
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'n':
          e.preventDefault();
          handleNextEpisode();
          break;
        case 'p':
          e.preventDefault();
          handlePrevEpisode();
          break;
        case 'e':
          e.preventDefault();
          cycleEnhancerMode();
          break;
        case 'escape':
          e.preventDefault();
          handleExitPlayer();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [volume, isMuted, isPlaying, nextEpisode, prevEpisode, enhancerMode, isLocked]);

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferPercent = duration > 0 ? (buffered / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={resetControlsTimer}
      className={`fixed inset-0 z-[99999] bg-black flex items-center justify-center select-none overflow-hidden group font-sans ${
        !showControls && isPlaying ? 'cursor-none' : 'cursor-default'
      }`}
    >
      {/* Video Stream Stage */}
      <div
        onDoubleClick={isLocked ? undefined : handlePlayerAreaDoubleClick}
        onClick={() => {
          if (isLocked) {
            setShowUnlockButton(true);
            if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current);
            unlockTimerRef.current = setTimeout(() => setShowUnlockButton(false), 2500);
            return;
          }
          togglePlay();
        }}
        className={`relative w-full h-full flex items-center justify-center ${
          isLocked ? 'cursor-default' : 'cursor-pointer'
        }`}
      >
        {isIframeMode && (
          <iframe
            src={currentSource?.url}
            className="w-full h-full border-none pointer-events-auto"
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        )}
        <video
          ref={videoRef}
          onPlay={() => setIsPlaying(true)}
          onPlaying={() => {
            setIsPlaying(true);
            setIsLoading(false);
            clearWatchdog();
          }}
          onCanPlay={() => {
            setIsLoading(false);
            clearWatchdog();
          }}
          onLoadedData={() => {
            setIsLoading(false);
            clearWatchdog();
          }}
          onLoadedMetadata={() => {
            if (videoRef.current) {
              const { videoWidth, videoHeight } = videoRef.current;
              console.log(`[ANIDESK Video Pipeline] Decoded Native Resolution: ${videoWidth}x${videoHeight}`);
            }
          }}
          onPause={() => setIsPlaying(false)}
          onTimeUpdate={handleTimeUpdate}
          onError={(e) => {
            if (isIframeMode) return;
            const err = videoRef.current?.error;
            if (!err || err.code === 1) return; // User abort or unloaded state
            if (hlsRef.current) return; // Hls.js error handler manages HLS failovers
            console.error('[ANIDESK] Video element playback error:', err);
            failoverToNextWorkingServer('Video decode error');
          }}
          onEnded={() => {
            if (nextEpisode && preferences.autoPlayNext) {
              handleNextEpisode();
            }
          }}
          className={`${isIframeMode ? 'hidden' : 'block'} w-full h-full ${
            preferences.videoScale === 'cover'
              ? 'object-cover'
              : preferences.videoScale === 'stretch'
              ? 'object-fill'
              : 'object-contain'
          } ${
            enhancerMode === 'vivid'
              ? 'video-enhancer-vivid'
              : enhancerMode === 'cinema'
              ? 'video-enhancer-cinema'
              : enhancerMode === 'crisp'
              ? 'video-enhancer-crisp'
              : enhancerMode === 'oled'
              ? 'video-enhancer-oled'
              : 'video-enhancer-off'
          }`}
        >
          {availableSubtitles.map((sub) => (
            <track
              key={sub.lang}
              kind="subtitles"
              src={sub.url}
              srcLang={sub.lang}
              label={sub.label}
              default={sub.lang === selectedSubtitle}
            />
          ))}
        </video>

        {/* Top hover sensor zone to reveal header controls when in iframe mode */}
        {isIframeMode && (
          <div
            onMouseEnter={() => setShowControls(true)}
            className="absolute top-0 left-0 right-0 h-16 z-20 pointer-events-auto"
          />
        )}

        {/* Permanent Quick-Exit Button in iframe mode when controls auto-hide */}
        {isIframeMode && !showControls && (
          <button
            onClick={handleExitPlayer}
            className="absolute top-4 left-4 z-40 p-2.5 rounded-2xl bg-black/80 hover:bg-primary border border-white/20 text-white shadow-2xl backdrop-blur-md transition-all opacity-70 hover:opacity-100 hover:scale-105 active:scale-95"
            title="Return to Anime (Esc)"
          >
            <ChevronLeft size={20} />
          </button>
        )}

        {/* Double-tap Seek Ripples */}
        {!isLocked && seekRipple === 'left' && (
          <div className="absolute left-1/4 flex flex-col items-center justify-center pointer-events-none animate-pulse">
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
              <RotateCcw size={28} />
            </div>
            <span className="text-white font-extrabold text-sm mt-2 font-mono">-10s</span>
          </div>
        )}
        {!isLocked && seekRipple === 'right' && (
          <div className="absolute right-1/4 flex flex-col items-center justify-center pointer-events-none animate-pulse">
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
              <FastForward size={28} />
            </div>
            <span className="text-white font-extrabold text-sm mt-2 font-mono">+10s</span>
          </div>
        )}

        {/* Center HUD Toast (Always perfectly centered regardless of screen size / aspect ratio) */}
        {hudMessage && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
            <div className="px-6 py-3.5 rounded-2xl bg-black/90 border border-white/20 text-white font-bold text-sm flex items-center gap-3 shadow-2xl backdrop-blur-xl animate-fadeIn transition-all transform scale-100">
              {hudMessage.icon && <hudMessage.icon size={22} className="text-primary shrink-0" />}
              <span className="tracking-wide font-extrabold">{hudMessage.text}</span>
            </div>
          </div>
        )}



        {/* Loading Spinner */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 pointer-events-none">
            <div className="w-14 h-14 rounded-full border-4 border-primary border-t-transparent animate-spin mb-3 shadow-glow-red" />
            <span className="text-xs font-bold text-white tracking-widest uppercase">
              Resolving 1080p Stream...
            </span>
          </div>
        )}

        {/* Error Overlay */}
        {errorMessage && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 px-6 text-center pointer-events-auto">
            <p className="text-base font-bold text-red-400 mb-4">{errorMessage}</p>
            <div className="flex gap-3">
              <button
                onClick={() => failoverToNextWorkingServer()}
                className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-glow-red hover:scale-105 active:scale-95 transition-all"
              >
                Auto-Switch to Backup Server
              </button>
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-white/10 text-white text-xs font-semibold hover:bg-white/20 transition-all"
              >
                Back to Anime
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Floating Unlock Screen Button (Top-Left, Appears on Hover/Tap when Locked) */}
      {isLocked && (
        <div
          className={`absolute top-6 left-6 z-50 transition-all duration-300 ${
            showUnlockButton ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'
          }`}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsLocked(false);
              setShowUnlockButton(false);
              setShowControls(true);
              showHud('Player Unlocked', Unlock);
            }}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-black/85 hover:bg-primary border border-white/20 text-white font-black text-xs shadow-2xl backdrop-blur-md transition-all hover:scale-105 active:scale-95 group/unlock"
            title="Click to Unlock Controls (L)"
          >
            <Lock size={16} className="text-amber-400 group-hover/unlock:text-white transition-colors" />
            <span>Tap to Unlock</span>
            <Unlock size={14} className="text-white/50 group-hover/unlock:text-white transition-colors ml-0.5" />
          </button>
        </div>
      )}

      {/* Floating Skip Intro / Outro Pill */}
      {!isLocked && showSkipIntro && (
        <button
          onClick={handleManualSkipIntro}
          className="absolute bottom-28 right-8 z-40 flex items-center gap-2 px-6 py-3 rounded-full bg-primary/95 text-white font-black text-xs shadow-glow-red hover:scale-105 active:scale-95 transition-all duration-200 border border-white/20"
        >
          <FastForward size={16} />
          <span>SKIP OPENING</span>
        </button>
      )}

      {!isLocked && showSkipOutro && (
        <button
          onClick={handleManualSkipOutro}
          className="absolute bottom-28 right-8 z-40 flex items-center gap-2 px-6 py-3 rounded-full bg-primary/95 text-white font-black text-xs shadow-glow-red hover:scale-105 active:scale-95 transition-all duration-200 border border-white/20"
        >
          <FastForward size={16} />
          <span>SKIP ENDING</span>
        </button>
      )}

      {/* Next Episode Countdown Banner */}
      {!isLocked && countdown !== null && nextEpisode && (
        <div className="absolute bottom-28 left-8 z-40 flex items-center gap-4 px-5 py-3 rounded-2xl bg-[#14141E]/95 border border-primary/40 shadow-2xl">
          <div>
            <p className="text-[10px] text-primary font-bold uppercase tracking-wider">Up Next in {countdown}s</p>
            <p className="text-xs font-bold text-white truncate max-w-xs">
              EP {nextEpisode.number}: {nextEpisode.title || 'Next Episode'}
            </p>
          </div>
          <button
            onClick={handleNextEpisode}
            className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-black text-xs shadow-glow-red transition-all"
          >
            Play Now
          </button>
        </div>
      )}

      {/* Top Header Bar (Auto-Hides when playing!) */}
      <div
        className={`absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/95 via-black/50 to-transparent flex items-center justify-between transition-opacity duration-300 z-30 ${
          showControls && !isLocked ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={handleExitPlayer}
            className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-all hover:scale-105 active:scale-95"
            title="Return to Anime (Esc)"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h2 className="text-base font-extrabold text-white tracking-tight">{animeTitle}</h2>
            <div className="flex items-center gap-2 text-xs text-white/60">
              <span className="font-bold text-primary">Episode {episodeItem.number}</span>
              {episodeItem.title && <span>• {episodeItem.title}</span>}
            </div>
          </div>
        </div>

        {/* Audio Track, Enhancer Controls, & Floating Exit Button */}
        <div className="flex items-center gap-2.5">
          {/* Visual Enhancer */}
          <button
            onClick={cycleEnhancerMode}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-extrabold uppercase transition-all ${
              enhancerMode !== 'off'
                ? 'bg-primary/20 border-primary text-primary shadow-glow-red'
                : 'bg-white/5 border-white/10 text-white/50 hover:text-white'
            }`}
            title="Video Color & Contrast Engine (Press E)"
          >
            <Sparkles size={13} className="text-primary animate-pulse" />
            <span>{enhancerMode}</span>
          </button>

          {/* Sub / Dub Switch */}
          <div className="flex p-1 rounded-xl bg-black/60 border border-white/10">
            <button
              onClick={() => handleTrackChange('sub')}
              className={`px-3 py-1 rounded-lg text-xs font-black uppercase transition-all ${
                currentTrack === 'sub'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              SUB
            </button>
            <button
              onClick={() => handleTrackChange('dub')}
              className={`px-3 py-1 rounded-lg text-xs font-black uppercase transition-all ${
                currentTrack === 'dub'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              DUB
            </button>
          </div>

          {/* Floating Exit / Close (X) Button */}
          <button
            onClick={handleExitPlayer}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-red-500/30 active:bg-red-600/50 text-white/90 hover:text-red-300 border border-white/15 hover:border-red-500/50 backdrop-blur-md transition-all duration-200 hover:scale-105 active:scale-95 shadow-xl group/close ml-1"
            title="Close Video Player (Esc)"
          >
            <X size={18} className="transition-transform duration-200 group-hover/close:rotate-90 text-white group-hover/close:text-red-400" />
            <span className="text-xs font-bold tracking-wide">Exit</span>
          </button>
        </div>
      </div>

      {/* Bottom Controls Bar (Auto-Hides when playing!) */}
      <div
        className={`absolute bottom-0 left-0 right-0 px-6 pb-6 pt-12 bg-gradient-to-t from-black/95 via-black/50 to-transparent flex flex-col gap-3 transition-opacity duration-300 z-30 ${
          showControls && !isLocked ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Progress Scrubbing Bar */}
        <div
          onClick={handleSeek}
          className="group/seek relative w-full h-2 hover:h-3 rounded-full bg-white/20 cursor-pointer transition-all duration-150 flex items-center"
        >
          {/* Buffer Progress */}
          <div
            className="absolute left-0 top-0 bottom-0 bg-white/25 rounded-full pointer-events-none"
            style={{ width: `${bufferPercent}%` }}
          />

          {/* Intro Segment Marker on Timeline */}
          {skipIntroRange && duration > 0 && (
            <div
              className="absolute top-0 bottom-0 bg-amber-400/80 rounded-sm pointer-events-none z-10"
              style={{
                left: `${(skipIntroRange[0] / duration) * 100}%`,
                width: `${Math.max(0.6, ((skipIntroRange[1] - skipIntroRange[0]) / duration) * 100)}%`,
              }}
              title="Opening Theme (Intro)"
            />
          )}

          {/* Outro Segment Marker on Timeline */}
          {skipOutroRange && duration > 0 && (
            <div
              className="absolute top-0 bottom-0 bg-sky-400/80 rounded-sm pointer-events-none z-10"
              style={{
                left: `${(skipOutroRange[0] / duration) * 100}%`,
                width: `${Math.max(0.6, ((skipOutroRange[1] - skipOutroRange[0]) / duration) * 100)}%`,
              }}
              title="Ending Theme (Outro)"
            />
          )}

          {/* Played Progress */}
          <div
            className="absolute left-0 top-0 bottom-0 bg-primary rounded-full pointer-events-none shadow-glow-red"
            style={{ width: `${progressPercent}%` }}
          />
          {/* Scrub Thumb */}
          <div
            className="absolute w-4 h-4 rounded-full bg-white shadow-lg pointer-events-none transform -translate-x-1/2 scale-0 group-hover/seek:scale-100 transition-transform duration-150 z-20"
            style={{ left: `${progressPercent}%` }}
          />
        </div>

        {/* Controls Toolbar */}
        <div className="flex items-center justify-between text-white">
          {/* Left Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="p-2.5 rounded-xl hover:bg-white/10 text-white transition-all active:scale-95"
            >
              {isPlaying ? <Pause size={22} fill="white" /> : <Play size={22} fill="white" />}
            </button>

            <button
              onClick={() => {
                const step = preferences.seekDuration || 10;
                if (videoRef.current) videoRef.current.currentTime -= step;
                showHud(`-${step}s`, RotateCcw);
              }}
              className="p-2 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition-all"
              title={`Seek back ${preferences.seekDuration || 10}s (Left Arrow)`}
            >
              <RotateCcw size={18} />
            </button>

            <button
              onClick={() => {
                const step = preferences.seekDuration || 10;
                if (videoRef.current) videoRef.current.currentTime += step;
                showHud(`+${step}s`, FastForward);
              }}
              className="p-2 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition-all"
              title={`Seek forward ${preferences.seekDuration || 10}s (Right Arrow)`}
            >
              <FastForward size={18} />
            </button>

            {/* Volume & 200% Audio Booster */}
            <div className="flex items-center gap-2 group/vol relative">
              <button
                onClick={toggleMute}
                className="p-2 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition-all relative"
                title={volume > 1 ? `Booster Active: ${Math.round(volume * 100)}%` : `Volume: ${Math.round(volume * 100)}%`}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX size={18} />
                ) : volume > 1 ? (
                  <div className="relative">
                    <Volume2 size={18} className="text-amber-400" />
                    <Zap size={10} className="absolute -top-1 -right-1 text-amber-300 fill-amber-300 animate-pulse" />
                  </div>
                ) : (
                  <Volume2 size={18} />
                )}
              </button>
              <div className="flex items-center gap-1.5">
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-20 h-1.5 accent-primary bg-white/20 rounded-full cursor-pointer transition-all"
                />
                {volume > 1.0 && (
                  <span className="text-[10px] font-black font-mono text-amber-300 bg-amber-500/20 px-1 py-0.5 rounded border border-amber-400/30 animate-pulse flex items-center gap-0.5">
                    <Zap size={9} />
                    {Math.round(volume * 100)}%
                  </span>
                )}
              </div>
            </div>

            {/* Timestamps */}
            <div className="text-xs font-mono font-bold text-white/70 ml-2">
              <span className="text-white">{formatTime(currentTime)}</span>
              <span className="text-white/40"> / </span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-1.5 relative">
            {/* Auto Skip Intro / Outro Toggle */}
            <button
              onClick={() => {
                const next = !autoSkip;
                setAutoSkip(next);
                storage.savePreferences({ ...preferences, autoSkipIntro: next });
                showHud(`Auto-Skip: ${next ? 'ENABLED' : 'DISABLED'}`, FastForward);
              }}
              className={`px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 border text-xs font-bold ${
                autoSkip
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-glow-amber'
                  : 'bg-white/5 border-white/10 text-white/50 hover:text-white'
              }`}
              title="Automatically skip Opening and Ending themes"
            >
              <FastForward size={14} className={autoSkip ? 'text-amber-400 animate-pulse' : ''} />
              <span className="text-[10px] font-black uppercase hidden lg:inline">
                Auto Skip {autoSkip ? 'ON' : 'OFF'}
              </span>
            </button>

            {/* Prev Episode */}
            <button
              onClick={handlePrevEpisode}
              disabled={!prevEpisode}
              className="p-2 rounded-xl hover:bg-white/10 text-white/80 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
              title="Previous Episode (P)"
            >
              <SkipBack size={18} />
            </button>

            {/* Next Episode */}
            <button
              onClick={handleNextEpisode}
              disabled={!nextEpisode}
              className="p-2 rounded-xl hover:bg-white/10 text-white/80 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
              title="Next Episode (N)"
            >
              <SkipForward size={18} />
            </button>

            {/* Server Selector Menu with Live Health Badges */}
            <div className="relative">
              <button
                onClick={() => setActiveMenu(activeMenu === 'servers' ? 'none' : 'servers')}
                className={`p-2 rounded-xl transition-all flex items-center gap-1.5 ${
                  activeMenu === 'servers'
                    ? 'bg-primary text-white shadow-glow-red'
                    : 'hover:bg-white/10 text-white/80 hover:text-white'
                }`}
                title="Select Stream Server"
              >
                <Server size={18} />
                <span className="text-[10px] font-bold uppercase hidden md:inline">
                  {currentSource?.server || 'Server'}
                </span>
              </button>

              {activeMenu === 'servers' && (
                <div className="absolute bottom-12 right-0 w-72 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 rounded-2xl bg-[#14141E] border border-white/15 p-2 space-y-1 z-50 shadow-2xl">
                  <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-white/40 flex items-center justify-between border-b border-white/5 pb-2">
                    <span>Streaming Servers ({sources.length})</span>
                    <span className="text-emerald-400 font-mono text-[9px]">Live Status</span>
                  </div>
                  {sources.map((src, i) => {
                    const health = serverHealth[i];
                    const isCurrent = activeSourceIndex === i;
                    const isEnma = (src.server || '').toLowerCase().includes('enma');

                    return (
                      <button
                        key={i}
                        onClick={() => handleServerSelect(health?.resolvedSource || src, i)}
                        className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                          isCurrent
                            ? 'bg-primary text-white shadow-sm'
                            : 'text-white/70 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {/* Live Health Status Dot */}
                          {health?.status === 'online' ? (
                            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400 animate-pulse shrink-0" />
                          ) : health?.status === 'offline' ? (
                            <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                          ) : (
                            <Loader2 size={10} className="text-amber-400 animate-spin shrink-0" />
                          )}
                          <span className="truncate">{src.server || `Server ${i + 1}`}</span>
                          {isEnma && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold uppercase shrink-0">
                              NEW
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          {health?.status === 'online' && (
                            <span className={`text-[10px] font-mono ${isCurrent ? 'text-white/90' : 'text-emerald-400'}`}>
                              {health.ping ? `${health.ping}ms` : '1080p'}
                            </span>
                          )}
                          {health?.status === 'offline' && (
                            <span className="text-[10px] font-mono text-red-400">
                              Offline
                            </span>
                          )}
                          {isCurrent && <span className="text-[9px] bg-white/20 px-1 rounded uppercase font-black">ACTIVE</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quality Selector */}
            <div className="relative">
              <button
                onClick={() => setActiveMenu(activeMenu === 'quality' ? 'none' : 'quality')}
                className={`p-2 rounded-xl transition-all ${
                  activeMenu === 'quality'
                    ? 'bg-primary text-white shadow-glow-red'
                    : 'hover:bg-white/10 text-white/80 hover:text-white'
                }`}
                title="Video Resolution"
              >
                <Tv size={18} />
              </button>

              {activeMenu === 'quality' && (
                <div className="absolute bottom-12 right-0 w-40 rounded-2xl bg-[#14141E] border border-white/15 p-2 space-y-1 z-50 shadow-2xl">
                  <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-white/40">
                    Resolution
                  </div>
                  <button
                    onClick={() => {
                      if (hlsRef.current) hlsRef.current.currentLevel = -1;
                      setCurrentQualityIndex(-1);
                      setActiveMenu('none');
                      showHud('Quality: Auto Adaptive');
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                      currentQualityIndex === -1
                        ? 'bg-primary text-white'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span>Auto</span>
                    {currentQualityIndex === -1 && <span className="text-[10px]">✓</span>}
                  </button>
                  {qualities.map((q) => (
                    <button
                      key={q.index}
                      onClick={() => {
                        if (hlsRef.current) {
                          hlsRef.current.nextLevel = q.index;
                          hlsRef.current.loadLevel = q.index;
                          hlsRef.current.currentLevel = q.index;
                        }
                        setCurrentQualityIndex(q.index);
                        setActiveMenu('none');
                        const qualityBadge = q.height >= 1080 ? 'Full HD' : q.height >= 720 ? 'HD' : 'SD';
                        showHud(`Quality: ${q.height}p ${qualityBadge}`);
                      }}
                      className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                        currentQualityIndex === q.index
                          ? 'bg-primary text-white'
                          : 'text-white/70 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span>{q.height}p</span>
                      {currentQualityIndex === q.index && <span className="text-[10px]">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Subtitles Menu */}
            <div className="relative">
              <button
                onClick={() => setActiveMenu(activeMenu === 'subs' ? 'none' : 'subs')}
                className={`p-2 rounded-xl transition-all ${
                  activeMenu === 'subs'
                    ? 'bg-primary text-white shadow-glow-red'
                    : 'hover:bg-white/10 text-white/80 hover:text-white'
                }`}
                title="Subtitles"
              >
                <Subtitles size={18} />
              </button>

              {activeMenu === 'subs' && (
                <div className="absolute bottom-12 right-0 w-44 rounded-2xl bg-[#14141E] border border-white/15 p-2 space-y-1 z-50 shadow-2xl">
                  <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-white/40">
                    Captions & Subtitles
                  </div>
                  <button
                    onClick={() => {
                      setSelectedSubtitle('off');
                      if (videoRef.current) {
                        for (let i = 0; i < videoRef.current.textTracks.length; i++) {
                          videoRef.current.textTracks[i].mode = 'disabled';
                        }
                      }
                      setActiveMenu('none');
                      showHud('Subtitles: OFF');
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                      selectedSubtitle === 'off'
                        ? 'bg-primary text-white'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span>Off</span>
                    {selectedSubtitle === 'off' && <span className="text-[10px]">✓</span>}
                  </button>
                  {availableSubtitles.map((sub) => (
                    <button
                      key={sub.lang}
                      onClick={() => {
                        setSelectedSubtitle(sub.lang);
                        if (videoRef.current) {
                          for (let i = 0; i < videoRef.current.textTracks.length; i++) {
                            const track = videoRef.current.textTracks[i];
                            track.mode = track.language === sub.lang ? 'showing' : 'disabled';
                          }
                        }
                        setActiveMenu('none');
                        showHud(`Subtitles: ${sub.label}`);
                      }}
                      className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                        selectedSubtitle === sub.lang
                          ? 'bg-primary text-white'
                          : 'text-white/70 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span>{sub.label}</span>
                      {selectedSubtitle === sub.lang && <span className="text-[10px]">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Download Episode Button */}
            <button
              onClick={handleDownloadActiveEpisode}
              className="p-2 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition-all active:scale-95 group/dl"
              title="Download Episode (1080p HD Offline)"
            >
              <Download size={18} className="group-hover/dl:text-primary transition-colors" />
            </button>

            {/* Screen Lock Toggle Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsLocked(true);
                setActiveMenu('none');
                setShowControls(false);
                setShowUnlockButton(true);
                if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current);
                unlockTimerRef.current = setTimeout(() => setShowUnlockButton(false), 2500);
              }}
              className="p-2 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition-all ml-1 group/lock"
              title="Lock Screen Controls (L)"
            >
              <Lock size={18} className="group-hover/lock:text-amber-400 transition-colors" />
            </button>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition-all ml-1"
              title="Toggle Fullscreen (F)"
            >
              {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
