import React, { useEffect, useState } from 'react';
import { Minus, Square, Copy, X, Search, Clock, Menu } from 'lucide-react';
import { storage } from '../services/storage';
import { sound } from '../services/sound';
import { AniDeskLogo } from './AniDeskLogo';

interface TitleBarProps {
  onOpenSearch: () => void;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export const TitleBar: React.FC<TitleBarProps> = ({ onOpenSearch, onToggleSidebar, isSidebarOpen = false }) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [showClock, setShowClock] = useState(() => storage.getPreferences().showLiveClock);
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);

    const handleStorageUpdate = () => {
      setShowClock(storage.getPreferences().showLiveClock);
    };
    window.addEventListener('anidesk-storage-update', handleStorageUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('anidesk-storage-update', handleStorageUpdate);
    };
  }, []);

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.isMaximized().then(setIsMaximized).catch(() => {});
      const unsubscribe = window.electronAPI.onWindowStateChange(setIsMaximized);
      return () => unsubscribe();
    }
  }, []);

  const handleMinimize = (e: React.MouseEvent) => {
    e.stopPropagation();
    sound.playClick();
    window.electronAPI?.minimize();
  };

  const handleMaximize = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    sound.playClick();
    window.electronAPI?.maximize();
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    sound.playClick();
    window.electronAPI?.close();
  };

  return (
    <header
      onDoubleClick={() => handleMaximize()}
      className="h-16 bg-[#09090F]/95 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-5 select-none app-drag z-50 flex-shrink-0 shadow-lg shadow-black/40"
    >
      {/* Left: 3-Bar Menu & Brand Identity */}
      <div className="flex items-center space-x-3 app-no-drag">
        {onToggleSidebar && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              sound.playClick();
              onToggleSidebar();
            }}
            className={`p-2.5 rounded-xl transition-all duration-200 flex items-center justify-center ${
              isSidebarOpen
                ? 'bg-primary text-white shadow-glow-red scale-105'
                : 'hover:bg-white/10 text-white/90 hover:text-white'
            }`}
            title="Toggle Navigation Menu (3-Bar)"
          >
            <Menu size={22} />
          </button>
        )}

        <div className="flex items-center space-x-3 pl-1">
          <div className="relative group flex items-center cursor-pointer">
            <AniDeskLogo size={36} />
          </div>
          <div className="flex flex-col justify-center">
            <div className="flex items-center space-x-1.5">
              <span className="font-black text-base tracking-wide text-white leading-tight">
                ANI<span className="text-primary font-black">DESK</span>
              </span>
              <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 tracking-wider flex items-center gap-1 shadow-sm shadow-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                v1.2 ULTRA HD
              </span>
            </div>
            <span className="text-[10px] font-bold text-white/50 tracking-wider uppercase leading-none mt-0.5">
              5.5M MovieBox Engine
            </span>
          </div>
        </div>
      </div>

      {/* Center: Expansive Quick Search Trigger (Ctrl + K) */}
      <div className="flex-1 max-w-2xl xl:max-w-3xl mx-6 xl:mx-10 app-no-drag">
        <button
          onClick={() => {
            sound.playSelect();
            onOpenSearch();
          }}
          className="w-full h-11 flex items-center justify-between px-5 py-2.5 bg-[#14141E]/95 hover:bg-[#1A1A28] border border-white/10 hover:border-primary/50 rounded-2xl text-xs text-white/70 hover:text-white transition-all duration-200 shadow-md shadow-black/50 hover:shadow-[0_0_20px_rgba(255,26,42,0.15)] group"
        >
          <div className="flex items-center space-x-3.5">
            <Search size={18} className="text-white/40 group-hover:text-primary transition-colors duration-200" />
            <span className="text-xs md:text-sm font-medium text-white/50 group-hover:text-white/90 transition-colors">
              Search anime, movies, genres, studios...
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <kbd className="text-[11px] font-mono font-bold bg-white/5 group-hover:bg-primary/20 px-2.5 py-1 rounded-lg border border-white/10 group-hover:border-primary/40 text-white/50 group-hover:text-primary transition-all shadow-sm">
              Ctrl + K
            </kbd>
          </div>
        </button>
      </div>

      {/* Right: Live Digital Clock & Window Controls */}
      <div className="flex items-center space-x-2 app-no-drag">
        {/* Live Digital Clock */}
        {showClock && (
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/5 border border-white/5 text-xs font-mono font-semibold text-white/70 mr-1">
            <Clock size={13} className="text-primary animate-pulse" />
            <span>{timeStr}</span>
          </div>
        )}

        <div className="flex items-center space-x-1 pl-1">
          <button
            onClick={handleMinimize}
            className="w-10 h-8 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Minimize"
          >
            <Minus size={15} />
          </button>
          <button
            onClick={handleMaximize}
            className="w-10 h-8 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title={isMaximized ? 'Restore' : 'Maximize'}
          >
            {isMaximized ? <Copy size={13} className="rotate-90" /> : <Square size={13} />}
          </button>
          <button
            onClick={handleClose}
            className="w-10 h-8 flex items-center justify-center text-white/60 hover:text-white hover:bg-[#E81123] rounded-lg transition-colors"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </header>
  );
};
