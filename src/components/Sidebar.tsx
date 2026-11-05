import React from 'react';
import {
  Home,
  Compass,
  Calendar,
  Bookmark,
  PlaySquare,
  Users,
  Download,
  Settings,
  Sparkles,
  Radio,
  X,
  Menu,
} from 'lucide-react';
import { AniDeskLogo } from './AniDeskLogo';

export type TabType =
  | 'home'
  | 'browse'
  | 'schedule'
  | 'watchlist'
  | 'continue'
  | 'w2g'
  | 'downloads'
  | 'settings';

interface SidebarProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  continueCount?: number;
  watchlistCount?: number;
  downloadsCount?: number;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  continueCount = 0,
  watchlistCount = 0,
  downloadsCount = 0,
  isOpen = false,
  onClose = () => {},
}) => {
  const mainNav: Array<{ id: TabType; label: string; icon: any; badge?: number }> = [
    { id: 'home', label: 'Discover', icon: Home },
    { id: 'browse', label: 'Browse Catalog', icon: Compass },
    { id: 'schedule', label: 'Airing Schedule', icon: Calendar },
    { id: 'continue', label: 'Continue Watching', icon: PlaySquare, badge: continueCount },
    { id: 'watchlist', label: 'My Watchlist', icon: Bookmark, badge: watchlistCount },
  ];

  const socialNav: Array<{ id: TabType; label: string; icon: any; badge?: number }> = [
    { id: 'w2g', label: 'Watch Together', icon: Users },
    { id: 'downloads', label: 'Offline Library', icon: Download, badge: downloadsCount },
    { id: 'settings', label: 'Preferences', icon: Settings },
  ];

  const handleSelect = (id: TabType) => {
    onTabChange(id);
    onClose();
  };

  return (
    <>
      {/* Background Dim Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 top-16 bg-black/65 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Slide-out Sidebar Drawer */}
      <aside
        className={`fixed top-16 left-0 bottom-0 w-64 bg-[#0A0A10]/95 backdrop-blur-2xl border-r border-anidesk-border/70 flex flex-col justify-between select-none py-4 px-3.5 z-50 shadow-[20px_0_50px_rgba(0,0,0,0.9)] transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="space-y-5">
          {/* Top Header of Sidebar */}
          <div className="flex items-center justify-between px-2 pb-3 border-b border-white/10">
            <div className="flex items-center space-x-2.5">
              <AniDeskLogo size={24} />
              <div className="flex items-center space-x-1">
                <span className="text-xs font-black tracking-wider text-white">
                  ANI<span className="text-primary font-black">DESK</span>
                </span>
                <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded-full bg-primary/20 text-primary border border-primary/30">
                  PRO
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-all"
              title="Close Navigation"
            >
              <X size={16} />
            </button>
          </div>

          {/* Main Explore Section */}
          <div>
            <div className="px-3 pb-2 text-[10px] font-black tracking-widest text-anidesk-textDim uppercase flex items-center justify-between">
              <span>Explore</span>
            </div>
            <div className="space-y-1">
              {mainNav.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item.id)}
                    className={`w-full group relative flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-primary text-white shadow-glow-red scale-[1.02]'
                        : 'text-anidesk-textMuted hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                  <div className="flex items-center space-x-3">
                    <Icon
                      size={17}
                      className={`transition-transform duration-200 group-hover:scale-110 ${
                        isActive ? 'text-white' : 'text-anidesk-textDim group-hover:text-white'
                      }`}
                    />
                    <span className="tracking-tight">{item.label}</span>
                  </div>

                  {item.badge && item.badge > 0 ? (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition-all ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-anidesk-card text-primary border border-anidesk-border'
                      }`}
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        {/* Social & Tools Section */}
        <div>
          <div className="px-3 pb-2 text-[10px] font-black tracking-widest text-anidesk-textDim uppercase">
            <span>Hub & System</span>
          </div>
          <div className="space-y-1">
            {socialNav.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  className={`w-full group relative flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-primary text-white shadow-glow-red scale-[1.02]'
                      : 'text-anidesk-textMuted hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon
                      size={17}
                      className={`transition-transform duration-200 group-hover:scale-110 ${
                        isActive ? 'text-white' : 'text-anidesk-textDim group-hover:text-white'
                      }`}
                    />
                    <span className="tracking-tight">{item.label}</span>
                  </div>

                  {item.badge && item.badge > 0 ? (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition-all ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-anidesk-card text-primary border border-anidesk-border'
                      }`}
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Network & Engine Status Card */}
      <div className="px-1 pt-3 border-t border-anidesk-border/40">
        <div className="bg-anidesk-surface/90 rounded-2xl p-3 border border-anidesk-border/60 shadow-inner">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/50 font-bold uppercase tracking-wider">Stream Engine</span>
            <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 font-extrabold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>HLS HD</span>
            </span>
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
            <span className="text-[10px] text-emerald-400 font-mono">anifam.buzz (Active)</span>
            <span className="text-[10px] text-primary font-bold">1080p Ready</span>
          </div>
        </div>
      </div>
    </aside>
    </>
  );
};
