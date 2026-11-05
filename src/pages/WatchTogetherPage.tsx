import React, { useEffect, useState } from 'react';
import { Users, Play, Radio, Plus, RefreshCw, AlertCircle, Lock, Globe, MessageSquare, Volume2 } from 'lucide-react';
import { api, getImageUrl } from '../services/api';
import { W2gRoom, AnimeCard } from '../types/api';

interface WatchTogetherPageProps {
  onJoinRoom: (room: W2gRoom) => void;
  onSelectAnime: (anime: AnimeCard) => void;
}

export const WatchTogetherPage: React.FC<WatchTogetherPageProps> = ({
  onJoinRoom,
  onSelectAnime,
}) => {
  const [rooms, setRooms] = useState<W2gRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomTitle, setNewRoomTitle] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getW2gRooms();
      setRooms(res.data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch Watch Together rooms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomTitle.trim()) return;
    alert(`Room "${newRoomTitle}" created! Share code will be generated.`);
    setShowCreateModal(false);
    setNewRoomTitle('');
  };

  return (
    <div className="min-h-full pb-20 px-8 pt-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase mb-1">
            <Radio className="w-4 h-4 animate-pulse text-red-500" />
            <span>Synced Multiplayer Playback</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            Watch Together
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              Live Rooms
            </span>
          </h1>
          <p className="text-sm text-white/50 mt-1">
            Stream anime synchronized in real-time with friends and the global anime community.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchRooms}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-semibold transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold transition-all shadow-lg shadow-primary/25 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Create Room</span>
          </button>
        </div>
      </div>

      {/* Content State */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-64 rounded-2xl bg-[#14141B] border border-white/5 animate-pulse p-5 flex flex-col justify-between"
            >
              <div className="h-6 bg-white/10 rounded w-3/4 mb-4" />
              <div className="h-28 bg-white/5 rounded-xl" />
              <div className="h-4 bg-white/10 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertCircle className="w-12 h-12 text-primary mb-3 opacity-80" />
          <h3 className="text-lg font-bold text-white mb-1">Failed to load rooms</h3>
          <p className="text-sm text-white/50 max-w-md mb-4">{error}</p>
          <button
            onClick={fetchRooms}
            className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold text-xs transition-all shadow-lg shadow-primary/20"
          >
            Try Again
          </button>
        </div>
      ) : rooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center rounded-2xl bg-[#14141B]/30 border border-white/5">
          <Users className="w-14 h-14 text-white/20 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No Active Public Rooms</h3>
          <p className="text-sm text-white/40 max-w-md mb-6">
            There are currently no public watch rooms open. Be the first to start a room and invite others!
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs transition-all shadow-lg shadow-primary/25 active:scale-95"
          >
            Create First Room
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map((room) => {
            const memberCount = room.members ?? room.members_count ?? 1;
            const roomName = room.name || room.title || 'Anime Watch Party';
            const isLive = room.status === 'live' || room.status === 'playing';

            return (
              <div
                key={room.public_id}
                className="group flex flex-col rounded-2xl overflow-hidden bg-[#14141B] border border-white/5 hover:border-primary/40 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10"
              >
                {/* Anime Banner Preview */}
                <div className="relative aspect-video w-full overflow-hidden bg-[#0A0A0E]">
                  <img
                    src={getImageUrl(room.anime?.poster)}
                    alt={room.anime?.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300 filter brightness-[1.04] contrast-[1.02]"
                  />

                  {/* Room Status Badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 backdrop-blur-md ${
                        isLive
                          ? 'bg-red-500/80 text-white shadow-lg shadow-red-500/30'
                          : 'bg-white/10 text-white/80'
                      }`}
                    >
                      {isLive && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />}
                      {room.status || 'Live'}
                    </span>

                    {room.track && (
                      <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-bold text-white border border-white/10 uppercase">
                        {room.track}
                      </span>
                    )}
                  </div>

                  {/* Member Count */}
                  <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-white/90 text-[11px] font-bold border border-white/10">
                    <Users className="w-3.5 h-3.5 text-primary" />
                    <span>{memberCount}</span>
                  </div>

                  {/* Anime Quick Info at Bottom */}
                  <div className="absolute bottom-3 left-3 right-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-primary text-[10px] font-black text-white">
                        EP {room.episode?.number || 1}
                      </span>
                      <h4 className="text-xs font-bold text-white/90 truncate">
                        {room.anime?.title}
                      </h4>
                    </div>
                  </div>
                </div>

                {/* Room Info */}
                <div className="p-5 flex flex-col flex-1 justify-between gap-4">
                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-primary transition-colors line-clamp-1 mb-2">
                      {roomName}
                    </h3>

                    {/* Host Info */}
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full overflow-hidden bg-white/10 border border-white/10 flex-shrink-0">
                        {room.host?.avatar ? (
                          <img
                            src={getImageUrl(room.host.avatar)}
                            alt={room.host.name || room.host.username}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white/60">
                            {(room.host?.username || 'H')[0].toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-white/80 truncate">
                            {room.host?.name || room.host?.username || 'Room Host'}
                          </span>
                          {room.host?.rank && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[9px] font-extrabold uppercase">
                              {room.host.rank}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-white/40 block">Host</span>
                      </div>
                    </div>
                  </div>

                  {/* Join Action */}
                  <div className="flex items-center gap-3 pt-3 border-t border-white/5">
                    <button
                      onClick={() => onJoinRoom(room)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs transition-all shadow-md shadow-primary/20 active:scale-95"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Join Watch Party</span>
                    </button>
                    {room.anime && (
                      <button
                        onClick={() => onSelectAnime(room.anime)}
                        title="View Anime Info"
                        className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-colors"
                      >
                        <Globe className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Room Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md rounded-2xl bg-[#14141B] border border-white/10 p-6 shadow-2xl">
            <h2 className="text-xl font-black text-white mb-1">Create Watch Room</h2>
            <p className="text-xs text-white/50 mb-5">
              Host a synchronized watch room and watch anime with your community.
            </p>

            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-2">
                  Room Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Solo Leveling Episode 12 Watchalong"
                  value={newRoomTitle}
                  onChange={(e) => setNewRoomTitle(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white placeholder-white/40 text-xs focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5">
                <div className="flex items-center gap-3">
                  {isPrivate ? (
                    <Lock className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Globe className="w-4 h-4 text-emerald-400" />
                  )}
                  <div>
                    <h4 className="text-xs font-bold text-white">
                      {isPrivate ? 'Private Room' : 'Public Room'}
                    </h4>
                    <p className="text-[10px] text-white/40">
                      {isPrivate ? 'Only users with the room link can join' : 'Visible on the community room browser'}
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="w-4 h-4 accent-primary rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-white/60 hover:text-white text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold transition-all shadow-lg shadow-primary/25"
                >
                  Create & Launch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
