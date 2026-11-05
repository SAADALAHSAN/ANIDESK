import React, { useEffect, useState } from 'react';
import { Calendar, Clock, Play, Sparkles, AlertCircle, RefreshCw, ChevronRight } from 'lucide-react';
import { api, getImageUrl } from '../services/api';
import { ScheduleData, ScheduleItem, AnimeCard } from '../types/api';

interface SchedulePageProps {
  onSelectAnime: (anime: AnimeCard) => void;
  onPlayAnime?: (anime: AnimeCard, episodeNumber?: number) => void;
}

export const SchedulePage: React.FC<SchedulePageProps> = ({ onSelectAnime }) => {
  const [data, setData] = useState<ScheduleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Format today as YYYY-MM-DD in local time
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const fetchSchedule = async (date: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getSchedule(date);
      setData(res);
      // If res has days, ensure selectedDate is set properly
      if (res.date) {
        setSelectedDate(res.date);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load airing schedule');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule(selectedDate);
  }, []);

  const handleSelectDay = (dayDate: string) => {
    setSelectedDate(dayDate);
    fetchSchedule(dayDate);
  };

  const formatAiringTime = (item: ScheduleItem) => {
    if (item.time) return item.time;
    if (item.airing_at) {
      try {
        const d = new Date(item.airing_at);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } catch {
        return '';
      }
    }
    return '';
  };

  const isAlreadyAired = (item: ScheduleItem) => {
    if (!item.airing_at) return false;
    return new Date(item.airing_at).getTime() < Date.now();
  };

  return (
    <div className="min-h-full pb-20 px-8 pt-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase mb-1">
            <Calendar className="w-4 h-4" />
            <span>Simulcast Timetable</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            Airing Schedule
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/60">
              {Intl.DateTimeFormat().resolvedOptions().timeZone}
            </span>
          </h1>
          <p className="text-sm text-white/50 mt-1">
            Never miss an episode. Timetable synced with official Japanese broadcast times.
          </p>
        </div>

        <button
          onClick={() => fetchSchedule(selectedDate)}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-semibold transition-all active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Day Selector Pills */}
      {data?.days && data.days.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-thin mb-8 -mx-2 px-2">
          {data.days.map((day) => {
            const isSelected = day.date === selectedDate;
            const isToday = day.date === todayStr;
            return (
              <button
                key={day.date}
                onClick={() => handleSelectDay(day.date)}
                className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 border flex flex-col items-center gap-0.5 min-w-[96px] ${
                  isSelected
                    ? 'bg-primary text-white border-primary shadow-lg shadow-primary/25 scale-[1.02]'
                    : isToday
                    ? 'bg-primary/10 text-primary border-primary/30 hover:bg-primary/20'
                    : 'bg-[#14141B] text-white/70 border-white/5 hover:border-white/20 hover:text-white hover:bg-[#1A1A24]'
                }`}
              >
                <span>{day.label}</span>
                {isToday && (
                  <span className={`text-[10px] uppercase font-black tracking-wider ${isSelected ? 'text-white/80' : 'text-primary'}`}>
                    Today
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Content State */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-2xl bg-[#14141B] border border-white/5 animate-pulse flex items-center p-4 gap-4"
            >
              <div className="w-16 h-16 rounded-xl bg-white/5 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-white/10 rounded w-1/3" />
                <div className="h-3 bg-white/5 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertCircle className="w-12 h-12 text-primary mb-3 opacity-80" />
          <h3 className="text-lg font-bold text-white mb-1">Failed to load schedule</h3>
          <p className="text-sm text-white/50 max-w-md mb-4">{error}</p>
          <button
            onClick={() => fetchSchedule(selectedDate)}
            className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold text-xs transition-all shadow-lg shadow-primary/20"
          >
            Try Again
          </button>
        </div>
      ) : !data?.items || data.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center rounded-2xl bg-[#14141B]/40 border border-white/5">
          <Clock className="w-12 h-12 text-white/20 mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">No Broadcasts Scheduled</h3>
          <p className="text-sm text-white/40 max-w-sm">
            There are no anime releases scheduled for this date. Check adjacent days for scheduled broadcasts.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.items.map((item) => {
            const timeStr = formatAiringTime(item);
            const aired = isAlreadyAired(item);

            return (
              <div
                key={`${item.id}-${item.episode_number || 0}`}
                onClick={() => onSelectAnime(item)}
                className="group relative flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-[#14141B] hover:bg-[#181822] border border-white/5 hover:border-primary/40 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-xl hover:shadow-black/50"
              >
                {/* Left: Time + Poster + Info */}
                <div className="flex items-center gap-4 min-w-0">
                  {/* Airing Time Box */}
                  <div className="flex flex-col items-center justify-center w-16 h-16 rounded-xl bg-white/[0.03] border border-white/5 group-hover:border-primary/20 flex-shrink-0 transition-colors">
                    <Clock className="w-3.5 h-3.5 text-primary mb-1" />
                    <span className="text-xs font-black text-white font-mono tracking-wider">
                      {timeStr || '--:--'}
                    </span>
                    <span className={`text-[9px] font-semibold uppercase tracking-wider ${aired ? 'text-white/40' : 'text-emerald-400'}`}>
                      {aired ? 'Aired' : 'Soon'}
                    </span>
                  </div>

                  {/* Poster */}
                  <div className="w-12 sm:w-14 h-16 sm:h-18 rounded-xl overflow-hidden bg-white/5 flex-shrink-0 border border-white/10 group-hover:scale-105 transition-transform duration-200 relative">
                    <img
                      src={getImageUrl(item.poster)}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {item.type && (
                      <span className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/80 backdrop-blur-md text-[8px] font-bold text-white/90 uppercase">
                        {item.type}
                      </span>
                    )}
                  </div>

                  {/* Title & Metadata */}
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-primary transition-colors truncate">
                      {item.title}
                    </h3>
                    {item.title_jp && (
                      <p className="text-xs text-white/40 truncate font-japanese mt-0.5">
                        {item.title_jp}
                      </p>
                    )}

                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {item.episode_number && (
                        <span className="px-2 py-0.5 rounded-md bg-primary/20 text-primary border border-primary/30 text-[10px] font-extrabold">
                          EP {item.episode_number}
                        </span>
                      )}
                      {item.sub > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-white/5 text-white/70 border border-white/10 text-[10px] font-medium">
                          SUB {item.sub}
                        </span>
                      )}
                      {item.dub > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-white/5 text-white/70 border border-white/10 text-[10px] font-medium">
                          DUB {item.dub}
                        </span>
                      )}
                      {item.rating && (
                        <span className="px-1.5 py-0.5 rounded bg-white/5 text-white/50 text-[10px] font-medium">
                          {item.rating}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Action */}
                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                  <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 group-hover:bg-primary text-white/70 group-hover:text-white transition-all text-xs font-semibold">
                    <span>Watch</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
