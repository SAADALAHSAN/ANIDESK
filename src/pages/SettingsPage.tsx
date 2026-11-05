import React, { useState, useEffect } from 'react';
import {
  Settings,
  Tv,
  Subtitles,
  Palette,
  Sparkles,
  Globe,
  FastForward,
  RotateCcw,
  Trash2,
  CheckCircle2,
  Cpu,
  Clock,
  Volume2,
  VolumeX,
  Languages,
  Monitor,
  Maximize2,
  RefreshCw,
  Zap,
  Download,
  HardDrive,
  FolderOpen,
  FolderEdit,
  Film,
  Layers,
  LayoutGrid,
  Image as ImageIcon,
  Type,
  Sliders,
  Check,
} from 'lucide-react';
import {
  storage,
  UserPreferences,
  AccentTheme,
  UiScale,
  SubtitleStyle,
  VideoScaleMode,
  TransitionAnimation,
  PerformanceUi,
  FontSize,
  WallpaperTheme,
  PlayTrailerMode,
  AudioLangPreference,
  CloseConfirmMode,
} from '../services/storage';
import { sound } from '../services/sound';
import { api } from '../services/api';
import { downloadManager } from '../services/downloadManager';

type SettingsTab = 'playback' | 'subtitles' | 'styling' | 'performance' | 'downloads' | 'networks';

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('playback');
  const [prefs, setPrefs] = useState<UserPreferences>(storage.getPreferences());
  const [savedToast, setSavedToast] = useState(false);
  const [pingResults, setPingResults] = useState<Record<string, number | 'error' | 'testing'>>({});
  const [downloadDir, setDownloadDir] = useState<string>('Downloads/ANIDESK');
  const [appVersion, setAppVersion] = useState('1.2.0 (MovieBox Ultra HD)');
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateResult, setUpdateResult] = useState<string | null>(null);
  const [foundUpdateInfo, setFoundUpdateInfo] = useState<any | null>(null);
  const [customRepo, setCustomRepo] = useState(() => localStorage.getItem('anidesk_update_repo') || 'SAADALAHSAN/anidesk');

  useEffect(() => {
    downloadManager.getDownloadsDir().then((dir) => {
      if (dir) setDownloadDir(dir);
    });

    if (window.electronAPI?.getAppVersion) {
      window.electronAPI.getAppVersion().then((v) => {
        if (v) setAppVersion(v);
      }).catch(() => {});
    }
  }, []);

  const handleManualCheckUpdate = async () => {
    sound.playClick();
    setIsCheckingUpdate(true);
    setUpdateResult(null);
    setFoundUpdateInfo(null);

    try {
      const info = await window.electronAPI?.checkForUpdates(customRepo);
      if (info && info.hasUpdate) {
        setFoundUpdateInfo(info);
        setUpdateResult(`New version v${info.latestVersion} available!`);
      } else {
        setUpdateResult(`You are running the latest version (v${info?.currentVersion || appVersion}).`);
      }
    } catch {
      setUpdateResult(`You are on the latest version (v${appVersion}).`);
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleChangeStorage = async () => {
    sound.playClick();
    const selected = await downloadManager.selectDownloadDirectory();
    if (selected) {
      setDownloadDir(selected);
      setPrefs(storage.getPreferences());
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 1800);
    }
  };

  const handleResetStorage = async () => {
    sound.playClick();
    const def = await downloadManager.resetDownloadsDir();
    setDownloadDir(def);
    setPrefs(storage.getPreferences());
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 1800);
  };

  const updatePreference = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    sound.playToggle();
    const updated = storage.savePreferences({ [key]: value });
    setPrefs(updated);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 1800);
  };

  const handleResetDefaults = () => {
    sound.playClick();
    if (window.confirm('Reset all settings to default values?')) {
      const defaults = storage.savePreferences({
        defaultQuality: '1080p',
        defaultTrack: 'sub',
        autoSkipIntro: true,
        autoSkipOutro: true,
        autoPlayNext: true,
        visualEnhancerMode: 'off',
        playbackSpeed: 1.0,
        volume: 0.9,
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
      });
      setPrefs(defaults);
      sound.playSelect();
    }
  };

  const handleClearHistory = () => {
    sound.playClick();
    if (window.confirm('Clear your entire watch history?')) {
      localStorage.removeItem('anidesk_continue_watching_v1');
      localStorage.removeItem('anifam_continue_watching_v1');
      window.dispatchEvent(new Event('anidesk-storage-update'));
      sound.playSelect();
      alert('Watch history cleared!');
    }
  };

  const handleClearWatchlist = () => {
    sound.playClick();
    if (window.confirm('Clear all titles from your watchlist?')) {
      localStorage.removeItem('anidesk_watchlist_v1');
      localStorage.removeItem('anifam_watchlist_v1');
      window.dispatchEvent(new Event('anidesk-storage-update'));
      sound.playSelect();
      alert('Watchlist cleared!');
    }
  };

  const handleClearBannerCache = () => {
    sound.playClick();
    localStorage.removeItem('anidesk_banner_cache_v1');
    localStorage.removeItem('anidesk_anilist_trending_v1');
    sound.playSelect();
    alert('4K Banner & AniList cache cleared! Fresh artwork will be queried on next load.');
  };

  const testMirrorPings = async () => {
    sound.playSelect();
    const mirrors = ['https://anifam.top', 'https://anifam.buzz', 'https://anifam.cfd', 'https://anifam.net'];
    const initial: Record<string, 'testing'> = {};
    mirrors.forEach((m) => (initial[m] = 'testing'));
    setPingResults(initial);

    for (const m of mirrors) {
      const start = Date.now();
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        await fetch(`${m}/api/v1/app/genres`, {
          signal: controller.signal,
          headers: { 'User-Agent': 'ANIDESK/1.0' },
        });
        clearTimeout(timeout);
        const ms = Date.now() - start;
        setPingResults((prev) => ({ ...prev, [m]: ms }));
      } catch {
        setPingResults((prev) => ({ ...prev, [m]: 'error' }));
      }
    }
  };

  const themes: Array<{ id: AccentTheme; name: string; color: string; border: string }> = [
    { id: 'crimson', name: 'ANIDESK Crimson', color: '#FF1E27', border: 'border-red-500' },
    { id: 'cyan', name: 'Cyberpunk Cyan', color: '#00F0FF', border: 'border-cyan-400' },
    { id: 'purple', name: 'Amethyst Purple', color: '#A855F7', border: 'border-purple-400' },
    { id: 'emerald', name: 'Matrix Emerald', color: '#10B981', border: 'border-emerald-400' },
    { id: 'amber', name: 'Sunset Amber', color: '#F59E0B', border: 'border-amber-400' },
    { id: 'sakura', name: 'Anime Sakura', color: '#EC4899', border: 'border-pink-400' },
  ];

  const wallpapers: Array<{ id: WallpaperTheme; name: string; desc: string }> = [
    { id: 'wallpaper1', name: 'Wallpaper 1', desc: 'Nebula Glow & Deep Violet Anime Atmosphere' },
    { id: 'wallpaper2', name: 'Wallpaper 2', desc: 'Cybernetic Azure & Electric Blue Grid' },
    { id: 'wallpaper3', name: 'Wallpaper 3', desc: 'Sakura Night & Crimson Twilight' },
    { id: 'wallpaper4', name: 'Wallpaper 4', desc: 'Emerald Aurora & Emerald Night' },
    { id: 'minimal', name: 'Clean Obsidian', desc: 'Minimal Dark Solid Surface' },
  ];

  return (
    <div className="min-h-full pb-20 px-6 md:px-10 pt-6 max-w-5xl mx-auto select-none">
      {/* Toast Notification */}
      {savedToast && (
        <div className="fixed bottom-6 right-8 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-white font-bold text-xs shadow-2xl animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>Preference updated!</span>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-primary font-bold text-xs tracking-wider uppercase mb-1">
          <Settings className="w-4 h-4" />
          <span>System & Preferences (AnimeTV Inspired)</span>
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight">
          Application Settings
        </h1>
        <p className="text-xs text-white/60 mt-1">
          Configure video playback, 4K AniList banners, slideshow trailers, custom styling, and performance options.
        </p>
      </div>

      {/* Navigation Tab Bar */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#14141E]/90 border border-white/10 mb-8 overflow-x-auto scrollbar-none shadow-xl">
        {[
          { id: 'playback', label: 'Playback (First 9 Options)', icon: Tv },
          { id: 'subtitles', label: 'Subtitles & Language', icon: Subtitles },
          { id: 'styling', label: 'Styling (First 4 Options)', icon: Palette },
          { id: 'performance', label: 'UI & Performance (AniList & Trailers)', icon: Sparkles },
          { id: 'downloads', label: 'Downloads & Storage', icon: Download },
          { id: 'networks', label: 'Networks & System', icon: Globe },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                sound.playClick();
                setActiveTab(tab.id as SettingsTab);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-primary text-white shadow-glow-red scale-100'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: PLAYBACK (First 9 Options from AnimeTV) */}
      {activeTab === 'playback' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="p-6 rounded-2xl bg-[#14141E]/80 border border-white/10 space-y-5 shadow-xl">
            <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
              <Tv size={16} className="text-primary" />
              <span>AnimeTV Video Playback Engine (First 9 Options)</span>
            </h3>

            {/* 1. Auto Next */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <span>1. Auto Next Episode</span>
                </h4>
                <p className="text-[11px] text-white/50">Automatically play the next episode when current video ends</p>
              </div>
              <input
                type="checkbox"
                checked={prefs.autoPlayNext}
                onChange={(e) => updatePreference('autoPlayNext', e.target.checked)}
                className="w-5 h-5 accent-primary rounded cursor-pointer"
              />
            </div>

            {/* 2. Auto Skip Intro */}
            <div className="flex items-center justify-between pt-4 border-t border-white/5">
              <div>
                <h4 className="text-xs font-bold text-white">2. Auto Skip Intro</h4>
                <p className="text-[11px] text-white/50">Automatically skip opening themes when intro range is detected</p>
              </div>
              <input
                type="checkbox"
                checked={prefs.autoSkipIntro}
                onChange={(e) => updatePreference('autoSkipIntro', e.target.checked)}
                className="w-5 h-5 accent-primary rounded cursor-pointer"
              />
            </div>

            {/* 3. Auto Skip Outro */}
            <div className="flex items-center justify-between pt-4 border-t border-white/5">
              <div>
                <h4 className="text-xs font-bold text-white">3. Auto Skip Outro</h4>
                <p className="text-[11px] text-white/50">Automatically skip ending credits and trigger next episode</p>
              </div>
              <input
                type="checkbox"
                checked={prefs.autoSkipOutro}
                onChange={(e) => updatePreference('autoSkipOutro', e.target.checked)}
                className="w-5 h-5 accent-primary rounded cursor-pointer"
              />
            </div>

            {/* 4. Skip Filler */}
            <div className="flex items-center justify-between pt-4 border-t border-white/5">
              <div>
                <h4 className="text-xs font-bold text-white">4. Skip Filler Episodes</h4>
                <p className="text-[11px] text-white/50">Automatically jump past non-canon filler episodes</p>
              </div>
              <input
                type="checkbox"
                checked={prefs.skipFiller}
                onChange={(e) => updatePreference('skipFiller', e.target.checked)}
                className="w-5 h-5 accent-primary rounded cursor-pointer"
              />
            </div>

            {/* 5. Video Scaling */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-white/5">
              <div>
                <h4 className="text-xs font-bold text-white">5. Video Scaling</h4>
                <p className="text-[11px] text-white/50">Control how video fills your monitor or TV display</p>
              </div>
              <div className="flex p-1 rounded-xl bg-black/40 border border-white/10">
                {([
                  { id: 'contain', label: 'Contain (Fit Original)' },
                  { id: 'cover', label: 'Cover (Fill 16:9)' },
                  { id: 'stretch', label: 'Stretch (21:9 Ultra-Wide)' },
                ] as const).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => updatePreference('videoScale', s.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      prefs.videoScale === s.id ? 'bg-primary text-white shadow-sm' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 6. Video Quality */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-white/5">
              <div>
                <h4 className="text-xs font-bold text-white">6. Video Quality</h4>
                <p className="text-[11px] text-white/50">Select preferred streaming quality</p>
              </div>
              <div className="flex p-1 rounded-xl bg-black/40 border border-white/10">
                {(['1080p', '720p', '360p', 'auto'] as const).map((q) => (
                  <button
                    key={q}
                    onClick={() => updatePreference('defaultQuality', q)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                      prefs.defaultQuality === q ? 'bg-primary text-white shadow-sm' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    {q === '1080p' ? '1080p Full HD' : q === '720p' ? '720p HD' : q === 'auto' ? 'Auto Adaptive' : q}
                  </button>
                ))}
              </div>
            </div>

            {/* 7. Seek Value */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-white/5">
              <div>
                <h4 className="text-xs font-bold text-white">7. Seek Value</h4>
                <p className="text-[11px] text-white/50">Skip length when pressing arrow keys or double-clicking</p>
              </div>
              <div className="flex p-1 rounded-xl bg-black/40 border border-white/10">
                {([5, 10, 15, 30, 60] as const).map((sec) => (
                  <button
                    key={sec}
                    onClick={() => updatePreference('seekDuration', sec)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      prefs.seekDuration === sec ? 'bg-primary text-white shadow-sm' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            </div>

            {/* 8. Close Confirmation */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-white/5">
              <div>
                <h4 className="text-xs font-bold text-white">8. Close Confirmation</h4>
                <p className="text-[11px] text-white/50">Action confirmation when exiting video player</p>
              </div>
              <div className="flex p-1 rounded-xl bg-black/40 border border-white/10">
                {[
                  { id: 'never', label: 'Instant Exit' },
                  { id: 'always', label: 'Ask Confirmation' },
                ].map((c) => (
                  <button
                    key={c.id}
                    onClick={() => updatePreference('closeConfirmation', c.id as CloseConfirmMode)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      prefs.closeConfirmation === c.id ? 'bg-primary text-white shadow-sm' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 9. Preload Next Episode */}
            <div className="flex items-center justify-between pt-4 border-t border-white/5">
              <div>
                <h4 className="text-xs font-bold text-white">9. Preload Next Episode</h4>
                <p className="text-[11px] text-white/50">Prepare episode data and stream manifest before video finishes for instant transitions</p>
              </div>
              <input
                type="checkbox"
                checked={prefs.preloadNextEp}
                onChange={(e) => updatePreference('preloadNextEp', e.target.checked)}
                className="w-5 h-5 accent-primary rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Color & Shaders Engine */}
          <div className="p-6 rounded-2xl bg-[#14141E]/80 border border-white/10 space-y-4 shadow-xl">
            <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
              <Sparkles size={16} className="text-amber-400" />
              <span>Hardware Video Enhancer (Color & Contrast Engine)</span>
            </h3>
            <div className="flex flex-wrap p-1 rounded-xl bg-black/40 border border-white/10">
              {[
                { id: 'off', label: 'Native Pure 1080p (Direct GPU Overlay)' },
                { id: 'crisp', label: 'Ultra Crisp (Edge Clarity)' },
                { id: 'vivid', label: 'Vivid (Rich Colors)' },
                { id: 'cinema', label: 'Cinema HDR (Deep Blacks)' },
                { id: 'oled', label: 'OLED Boost (Maximum Saturation)' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    localStorage.setItem('anidesk_enhancer_user_selected', 'true');
                    updatePreference('visualEnhancerMode', m.id as any);
                  }}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                    prefs.visualEnhancerMode === m.id ? 'bg-primary text-white shadow-sm' : 'text-white/60 hover:text-white'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SUBTITLE & LANGUAGES (All Options from AnimeTV) */}
      {activeTab === 'subtitles' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Subtitle Live Preview Box */}
          <div className="p-6 rounded-2xl bg-black border border-white/15 relative overflow-hidden flex flex-col items-center justify-center min-h-[170px] text-center shadow-2xl">
            <span className="absolute top-3 left-4 text-[10px] font-mono uppercase tracking-wider text-white/40">
              Live Subtitle Preview
            </span>
            <div
              className={`font-sans font-bold transition-all ${
                prefs.subtitleFontSize === 'small'
                  ? 'text-sm'
                  : prefs.subtitleFontSize === 'normal'
                  ? 'text-lg'
                  : prefs.subtitleFontSize === 'large'
                  ? 'text-2xl'
                  : 'text-3xl'
              } ${
                prefs.subtitleStyle === 'classic_yellow'
                  ? 'text-yellow-300 drop-shadow-[0_2px_4px_rgba(0,0,0,1)]'
                  : prefs.subtitleStyle === 'neon_cyan'
                  ? 'text-cyan-300 drop-shadow-[0_0_10px_rgba(0,240,255,0.8)]'
                  : prefs.subtitleStyle === 'outlined_black'
                  ? 'text-white drop-shadow-[0_3px_0_#000]'
                  : 'text-white bg-black/75 px-4 py-1.5 rounded-lg'
              }`}
            >
              "I won't let anyone get in the way of my anime dream!"
            </div>
            <p className="text-[11px] text-white/50 mt-3 font-mono">
              AnimeTV Broadcast Preset: {prefs.subtitleStyle} • {prefs.subtitleFontSize.toUpperCase()}
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#14141E]/80 border border-white/10 space-y-6 shadow-xl">
            <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
              <Subtitles size={16} className="text-primary" />
              <span>Subtitle & Language Options (AnimeTV Standard)</span>
            </h3>

            {/* 1. Subtitle Language Priority */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-white">Subtitle Language Priority</h4>
                <p className="text-[11px] text-white/50">Select language priority for video subtitles</p>
              </div>
              <div className="flex flex-wrap p-1 rounded-xl bg-black/40 border border-white/10">
                {[
                  { code: 'en', label: 'English' },
                  { code: 'es', label: 'Spanish' },
                  { code: 'fr', label: 'French' },
                  { code: 'de', label: 'German' },
                  { code: 'id', label: 'Indonesian' },
                  { code: 'ar', label: 'Arabic' },
                  { code: 'pt', label: 'Portuguese' },
                  { code: 'ja', label: 'Japanese' },
                ].map((l) => (
                  <button
                    key={l.code}
                    onClick={() => updatePreference('subtitleLanguage', l.code)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      prefs.subtitleLanguage === l.code ? 'bg-primary text-white shadow-sm' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Subtitle Style Preset */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-white/5">
              <div>
                <h4 className="text-xs font-bold text-white">Subtitle Style</h4>
                <p className="text-[11px] text-white/50">Change typeface color, box contrast, and drop shadow</p>
              </div>
              <div className="flex flex-wrap p-1 rounded-xl bg-black/40 border border-white/10">
                {[
                  { id: 'crisp_white', label: 'Style 1: Modern Boxed' },
                  { id: 'classic_yellow', label: 'Style 2: Classic Yellow' },
                  { id: 'neon_cyan', label: 'Style 3: Neon Cyan' },
                  { id: 'outlined_black', label: 'Style 4: Outlined Black' },
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => updatePreference('subtitleStyle', st.id as SubtitleStyle)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      prefs.subtitleStyle === st.id ? 'bg-primary text-white shadow-sm' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Prefer DUB Stream */}
            <div className="flex items-center justify-between pt-4 border-t border-white/5">
              <div>
                <h4 className="text-xs font-bold text-white">Prefer DUB Stream</h4>
                <p className="text-[11px] text-white/50">Always use English DUB audio stream when available</p>
              </div>
              <input
                type="checkbox"
                checked={prefs.preferDubAudio}
                onChange={(e) => updatePreference('preferDubAudio', e.target.checked)}
                className="w-5 h-5 accent-primary rounded cursor-pointer"
              />
            </div>

            {/* 4. Audio Language */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-white/5">
              <div>
                <h4 className="text-xs font-bold text-white">Preferred Audio Language</h4>
                <p className="text-[11px] text-white/50">Default audio language priority for multi-audio streams</p>
              </div>
              <div className="flex p-1 rounded-xl bg-black/40 border border-white/10">
                {[
                  { id: 'ja', label: 'Japanese (Original)' },
                  { id: 'en', label: 'English (Dub)' },
                  { id: 'any', label: 'Any Available' },
                ].map((al) => (
                  <button
                    key={al.id}
                    onClick={() => updatePreference('preferredAudioLang', al.id as AudioLangPreference)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      prefs.preferredAudioLang === al.id ? 'bg-primary text-white shadow-sm' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    {al.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Subtitle Font Size */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-white/5">
              <div>
                <h4 className="text-xs font-bold text-white">Subtitle Font Size</h4>
                <p className="text-[11px] text-white/50">Scale caption text size</p>
              </div>
              <div className="flex p-1 rounded-xl bg-black/40 border border-white/10">
                {(['small', 'normal', 'large', 'huge'] as const).map((sz) => (
                  <button
                    key={sz}
                    onClick={() => updatePreference('subtitleFontSize', sz)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                      prefs.subtitleFontSize === sz ? 'bg-primary text-white shadow-sm' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: STYLING (First 4 Options from AnimeTV) */}
      {activeTab === 'styling' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="p-6 rounded-2xl bg-[#14141E]/80 border border-white/10 space-y-6 shadow-xl">
            <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
              <Palette size={16} className="text-primary" />
              <span>Styling & Interface (First 4 Options)</span>
            </h3>

            {/* 1. Font Size */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <Type size={14} className="text-primary" />
                  <span>1. Font Size</span>
                </h4>
                <p className="text-[11px] text-white/50">Adjust entire application typography density</p>
              </div>
              <div className="flex p-1 rounded-xl bg-black/40 border border-white/10">
                {[
                  { id: 'small', label: 'Small' },
                  { id: 'normal', label: 'Normal' },
                  { id: 'large', label: 'Large' },
                  { id: 'huge', label: 'Extra Large' },
                ].map((fs) => (
                  <button
                    key={fs.id}
                    onClick={() => updatePreference('fontSize', fs.id as FontSize)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      prefs.fontSize === fs.id ? 'bg-primary text-white shadow-sm' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    {fs.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Interface Color */}
            <div className="pt-4 border-t border-white/5 space-y-3">
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <Palette size={14} className="text-primary" />
                  <span>2. Interface Color (Theme)</span>
                </h4>
                <p className="text-[11px] text-white/50">Select primary accent glow and brand theme</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {themes.map((t) => {
                  const isSelected = (prefs.accentTheme || 'crimson') === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => updatePreference('accentTheme', t.id)}
                      className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all text-left ${
                        isSelected
                          ? `bg-white/10 ${t.border} shadow-lg scale-102`
                          : 'bg-black/30 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <span
                        className="w-5 h-5 rounded-full flex-shrink-0 shadow-md"
                        style={{ backgroundColor: t.color }}
                      />
                      <div>
                        <h4 className="text-xs font-bold text-white">{t.name}</h4>
                        <p className="text-[10px] text-white/40">{isSelected ? 'Active' : 'Apply'}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Wallpaper (Fixes "app is bit too dark") */}
            <div className="pt-4 border-t border-white/5 space-y-3">
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <ImageIcon size={14} className="text-primary" />
                  <span>3. Wallpaper / Ambient Background Art</span>
                </h4>
                <p className="text-[11px] text-white/50">Change background atmosphere to eliminate pure pitch-black darkness</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {wallpapers.map((w) => {
                  const isSelected = (prefs.wallpaper || 'wallpaper1') === w.id;
                  return (
                    <button
                      key={w.id}
                      onClick={() => updatePreference('wallpaper', w.id)}
                      className={`p-4 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? 'bg-primary/20 border-primary shadow-glow-red scale-101'
                          : 'bg-black/30 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-white">{w.name}</span>
                        {isSelected && <Check size={14} className="text-primary" />}
                      </div>
                      <p className="text-[11px] text-white/50">{w.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Large UI */}
            <div className="flex items-center justify-between pt-4 border-t border-white/5">
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <LayoutGrid size={14} className="text-primary" />
                  <span>4. Large UI (Anime List Posters)</span>
                </h4>
                <p className="text-[11px] text-white/50">Use bigger anime posters and banners for couch and high-resolution viewing</p>
              </div>
              <input
                type="checkbox"
                checked={prefs.largeUi}
                onChange={(e) => updatePreference('largeUi', e.target.checked)}
                className="w-5 h-5 accent-primary rounded cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: UI & PERFORMANCE (AniList & Trailers & Transitions) */}
      {activeTab === 'performance' && (
        <div className="space-y-6 animate-fadeIn">
          {/* AniList Slideshow & Hi-Res Features */}
          <div className="p-6 rounded-2xl bg-[#14141E]/80 border border-white/10 space-y-6 shadow-xl">
            <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
              <Film size={16} className="text-primary" />
              <span>AniList Banner Slideshow & Trailer Engine</span>
            </h3>

            {/* AniList Slideshow Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <Sparkles size={14} className="text-amber-400" />
                  <span>AniList Slideshow</span>
                </h4>
                <p className="text-[11px] text-white/50">Use live AniList trending now anime list on the home slideshow banner</p>
              </div>
              <input
                type="checkbox"
                checked={prefs.anilistSlideshow}
                onChange={(e) => updatePreference('anilistSlideshow', e.target.checked)}
                className="w-5 h-5 accent-primary rounded cursor-pointer"
              />
            </div>

            {/* HiRes AniList Banner Toggle */}
            <div className="flex items-center justify-between pt-4 border-t border-white/5">
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <Sparkles size={14} className="text-amber-400" />
                  <span>Hi-Res AniList Banner</span>
                </h4>
                <p className="text-[11px] text-white/50">Get ultra high-resolution 1080p/4K Fanart & ClearLogo banners via TheTVDB & Ani.zip</p>
              </div>
              <input
                type="checkbox"
                checked={prefs.hiresAnilistBanner}
                onChange={(e) => updatePreference('hiresAnilistBanner', e.target.checked)}
                className="w-5 h-5 accent-primary rounded cursor-pointer"
              />
            </div>

            {/* Play Trailer Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-white/5">
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <Film size={14} className="text-amber-400" />
                  <span>Play Trailer</span>
                </h4>
                <p className="text-[11px] text-white/50">Enable and configure trailer playback on the AniList banner slideshow</p>
              </div>
              <div className="flex p-1 rounded-xl bg-black/40 border border-white/10">
                {[
                  { id: 'inline', label: 'Inline on Banner' },
                  { id: 'modal', label: 'Floating Modal' },
                  { id: 'off', label: 'Disabled' },
                ].map((pm) => (
                  <button
                    key={pm.id}
                    onClick={() => updatePreference('playTrailer', pm.id as PlayTrailerMode)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      prefs.playTrailer === pm.id ? 'bg-primary text-white shadow-sm' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    {pm.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Transition Animation & Performance UI */}
          <div className="p-6 rounded-2xl bg-[#14141E]/80 border border-white/10 space-y-6 shadow-xl">
            <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
              <Cpu size={16} className="text-primary" />
              <span>Transition Animation & Performance UI</span>
            </h3>

            {/* Transition Animation */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-white">Transition Animation</h4>
                <p className="text-[11px] text-white/50">Set page and card animation speed</p>
              </div>
              <div className="flex p-1 rounded-xl bg-black/40 border border-white/10">
                {[
                  { id: 'none', label: 'None' },
                  { id: 'fast', label: 'Fast (150ms)' },
                  { id: 'normal', label: 'Normal (300ms)' },
                  { id: 'smooth', label: 'Smooth (500ms)' },
                ].map((ta) => (
                  <button
                    key={ta.id}
                    onClick={() => updatePreference('transitionAnimation', ta.id as TransitionAnimation)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      prefs.transitionAnimation === ta.id ? 'bg-primary text-white shadow-sm' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    {ta.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Performance UI */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-white/5">
              <div>
                <h4 className="text-xs font-bold text-white">Performance UI</h4>
                <p className="text-[11px] text-white/50">Enable or disable visual glassmorphism effects for hardware smoothness</p>
              </div>
              <div className="flex p-1 rounded-xl bg-black/40 border border-white/10">
                {[
                  { id: 'high', label: 'High Quality (Full Shaders)' },
                  { id: 'balanced', label: 'Balanced' },
                  { id: 'low', label: 'Battery Saver' },
                ].map((pu) => (
                  <button
                    key={pu.id}
                    onClick={() => updatePreference('performanceUi', pu.id as PerformanceUi)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      prefs.performanceUi === pu.id ? 'bg-primary text-white shadow-sm' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    {pu.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Navigation Sound */}
            <div className="flex items-center justify-between pt-4 border-t border-white/5">
              <div>
                <h4 className="text-xs font-bold text-white">Navigation Sound</h4>
                <p className="text-[11px] text-white/50">Play subtle audio click feedback on menu navigation and buttons</p>
              </div>
              <input
                type="checkbox"
                checked={prefs.navigationSound}
                onChange={(e) => updatePreference('navigationSound', e.target.checked)}
                className="w-5 h-5 accent-primary rounded cursor-pointer"
              />
            </div>

            {/* Show Clock in Header */}
            <div className="flex items-center justify-between pt-4 border-t border-white/5">
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <Clock size={14} className="text-primary" />
                  <span>Show Clock in Header</span>
                </h4>
                <p className="text-[11px] text-white/50">Display live digital clock in the app header</p>
              </div>
              <input
                type="checkbox"
                checked={prefs.showLiveClock}
                onChange={(e) => updatePreference('showLiveClock', e.target.checked)}
                className="w-5 h-5 accent-primary rounded cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: DOWNLOADS & STORAGE */}
      {activeTab === 'downloads' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="p-6 rounded-2xl bg-[#14141E]/80 border border-white/10 space-y-6 shadow-xl">
            <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
              <HardDrive size={16} className="text-primary" />
              <span>Offline Video Download Storage Engine</span>
            </h3>

            {/* Storage Directory Path */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-white">Download Storage Directory</label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="flex-1 px-4 py-2.5 rounded-xl bg-black/60 border border-white/10 text-xs font-mono text-white/80 truncate">
                  {downloadDir}
                </div>
                <button
                  onClick={handleChangeStorage}
                  className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all shadow-glow-red flex items-center justify-center gap-1.5"
                >
                  <FolderOpen size={14} />
                  <span>Browse Folder</span>
                </button>
                <button
                  onClick={handleResetStorage}
                  className="px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 hover:text-white text-xs font-bold transition-all"
                  title="Reset to default Downloads folder"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>

            {/* Default Download Quality */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-white/5">
              <div>
                <h4 className="text-xs font-bold text-white">Default Download Quality</h4>
                <p className="text-[11px] text-white/50">Preferred resolution when queuing episodes for offline viewing</p>
              </div>
              <div className="flex p-1 rounded-xl bg-black/40 border border-white/10">
                {(['1080p', '720p', '480p', '360p'] as const).map((q) => (
                  <button
                    key={q}
                    onClick={() => updatePreference('downloadQuality', q)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                      prefs.downloadQuality === q ? 'bg-primary text-white shadow-sm' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: NETWORKS & SYSTEM */}
      {activeTab === 'networks' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Mirror Latency Diagnostics */}
          <div className="p-6 rounded-2xl bg-[#14141E]/80 border border-white/10 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-white">
                  Streaming CDNs & Mirrors Diagnostics
                </h3>
                <p className="text-[11px] text-white/50">Test round-trip ping latency across ANIDESK fallback CDNs</p>
              </div>
              <button
                onClick={testMirrorPings}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-glow-red transition-all"
              >
                <RefreshCw size={13} />
                <span>Test Mirrors</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {['https://anifam.top', 'https://anifam.buzz', 'https://anifam.cfd', 'https://anifam.net'].map((m) => {
                const res = pingResults[m];
                return (
                  <div key={m} className="p-3.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-mono font-bold text-white">{m.replace('https://', '')}</p>
                      <p className="text-[10px] text-white/40">Mirror Endpoint</p>
                    </div>
                    <div>
                      {res === 'testing' ? (
                        <span className="text-[10px] font-mono text-amber-400 animate-pulse">Testing...</span>
                      ) : typeof res === 'number' ? (
                        <span className="text-xs font-mono font-bold text-emerald-400">{res} ms</span>
                      ) : res === 'error' ? (
                        <span className="text-xs font-mono text-red-400">Offline</span>
                      ) : (
                        <span className="text-[10px] font-mono text-white/30">Untested</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Software Updates & Distribution */}
          <div className="p-6 rounded-2xl bg-[#14141E]/80 border border-white/10 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <Sparkles size={16} className="text-primary" />
                  <span>Software Updates & Distribution</span>
                </h3>
                <p className="text-[11px] text-white/50">
                  Production channel: v{appVersion} (Official Stable Release)
                </p>
              </div>

              <button
                onClick={handleManualCheckUpdate}
                disabled={isCheckingUpdate}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-black shadow-glow-red hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
              >
                <RefreshCw size={13} className={isCheckingUpdate ? 'animate-spin' : ''} />
                <span>{isCheckingUpdate ? 'Checking...' : 'Check for Updates'}</span>
              </button>
            </div>

            {updateResult && (
              <div className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-bold ${
                foundUpdateInfo
                  ? 'bg-primary/20 border-primary/50 text-white shadow-glow-red'
                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              }`}>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className={foundUpdateInfo ? 'text-primary' : 'text-emerald-400'} />
                  <span>{updateResult}</span>
                </div>

                {foundUpdateInfo && (
                  <button
                    onClick={() => {
                      if (foundUpdateInfo?.downloadUrl) {
                        window.electronAPI?.downloadAndInstallUpdate(foundUpdateInfo.downloadUrl);
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-black shadow-sm"
                  >
                    <Download size={12} />
                    <span>Install v{foundUpdateInfo.latestVersion}</span>
                  </button>
                )}
              </div>
            )}

            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-white/40">
              <span>GitHub Update Channel:</span>
              <span className="font-mono text-white/60 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                github.com/{customRepo}
              </span>
            </div>
          </div>

          {/* Maintenance & Reset Controls */}
          <div className="p-6 rounded-2xl bg-[#14141E]/80 border border-white/10 space-y-4 shadow-xl">
            <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
              <Trash2 size={16} className="text-red-400" />
              <span>Storage Cleanup & System Reset</span>
            </h3>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleClearBannerCache}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold transition-all"
              >
                Clear 4K Artwork & AniList Cache
              </button>
              <button
                onClick={handleClearHistory}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold transition-all"
              >
                Clear Watch History
              </button>
              <button
                onClick={handleClearWatchlist}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold transition-all"
              >
                Clear Watchlist
              </button>
              <button
                onClick={handleResetDefaults}
                className="px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 text-xs font-bold transition-all"
              >
                Reset All Settings to Defaults
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
