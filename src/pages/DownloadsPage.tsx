import React, { useEffect, useState, useMemo } from 'react';
import {
  Download,
  FolderOpen,
  FolderEdit,
  Play,
  CheckCircle2,
  Trash2,
  HardDrive,
  AlertCircle,
  X,
  Search,
  Sparkles,
  RefreshCw,
  Film,
} from 'lucide-react';
import { storage, StoredDownload } from '../services/storage';
import { downloadManager } from '../services/downloadManager';
import { sound } from '../services/sound';
import { getImageUrl } from '../services/api';

interface DownloadsPageProps {
  onPlayOffline?: (downloadItem: StoredDownload) => void;
}

export const DownloadsPage: React.FC<DownloadsPageProps> = ({ onPlayOffline }) => {
  const [downloads, setDownloads] = useState<StoredDownload[]>(() => storage.getDownloads());
  const [filter, setFilter] = useState<'all' | 'progressing' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadDir, setDownloadDir] = useState<string>('Downloads/ANIDESK');

  const refreshDownloads = () => {
    setDownloads(storage.getDownloads());
  };

  useEffect(() => {
    refreshDownloads();
    downloadManager.getDownloadsDir().then((dir) => {
      if (dir) setDownloadDir(dir);
    });

    const handleUpdate = () => refreshDownloads();
    window.addEventListener('anidesk-downloads-update', handleUpdate);
    window.addEventListener('anidesk-storage-update', handleUpdate);

    return () => {
      window.removeEventListener('anidesk-downloads-update', handleUpdate);
      window.removeEventListener('anidesk-storage-update', handleUpdate);
    };
  }, []);

  const handleClearCompleted = () => {
    sound.playClick();
    const completed = downloads.filter((d) => d.state === 'completed');
    completed.forEach((c) => storage.removeDownload(c.id));
  };

  const handleOpenFolder = (filePath?: string) => {
    sound.playClick();
    downloadManager.openInFolder(filePath);
  };

  const handleOpenDownloadsDir = () => {
    sound.playClick();
    downloadManager.openDownloadsFolder();
  };

  const handleChangeDownloadDir = async () => {
    sound.playClick();
    const newDir = await downloadManager.selectDownloadDirectory();
    if (newDir) {
      setDownloadDir(newDir);
    }
  };

  const handleResetDownloadDir = async () => {
    sound.playClick();
    const def = await downloadManager.resetDownloadsDir();
    setDownloadDir(def);
  };

  const handleCancel = (id: string) => {
    sound.playClick();
    downloadManager.cancelDownload(id);
  };

  const handleDelete = async (item: StoredDownload) => {
    sound.playClick();
    if (confirm(`Delete offline file for "${item.animeTitle} - Episode ${item.episodeNumber}"?`)) {
      await downloadManager.deleteDownload(item);
    }
  };

  const handlePlay = (item: StoredDownload) => {
    sound.playClick();
    if (onPlayOffline) {
      onPlayOffline(item);
    }
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes || bytes === 0) return '0 MB';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  // Filtered downloads
  const filteredDownloads = useMemo(() => {
    return downloads.filter((d) => {
      if (filter === 'progressing' && d.state !== 'progressing') return false;
      if (filter === 'completed' && d.state !== 'completed') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          d.animeTitle.toLowerCase().includes(q) ||
          d.episodeTitle.toLowerCase().includes(q) ||
          `ep ${d.episodeNumber}`.includes(q)
        );
      }
      return true;
    });
  }, [downloads, filter, searchQuery]);

  // Aggregate stats
  const totalCompletedSize = useMemo(() => {
    return downloads
      .filter((d) => d.state === 'completed')
      .reduce((acc, curr) => acc + (curr.fileSize || curr.receivedBytes || 0), 0);
  }, [downloads]);

  const activeDownloadingCount = downloads.filter((d) => d.state === 'progressing').length;

  return (
    <div className="min-h-full pb-20 px-8 pt-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary font-bold text-xs tracking-wider uppercase mb-1">
            <Download className="w-4 h-4" />
            <span>High-Speed Offline Engine</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            Offline Downloads
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
              {downloads.length} Items
            </span>
            {activeDownloadingCount > 0 && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                {activeDownloadingCount} Active
              </span>
            )}
          </h1>
          <p className="text-sm text-white/50 mt-1">
            Download 1080p anime episodes with high-speed multi-threading and watch offline with zero buffering.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenDownloadsDir}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold transition-all active:scale-95"
            title="Open Downloads Directory in Windows Explorer"
          >
            <FolderOpen className="w-4 h-4 text-primary" />
            <span>Open Folder</span>
          </button>

          {downloads.some((d) => d.state === 'completed') && (
            <button
              onClick={handleClearCompleted}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/30 text-white/60 hover:text-red-400 text-xs font-bold transition-all active:scale-95"
              title="Clear completed downloads from history"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear History</span>
            </button>
          )}
        </div>
      </div>

      {/* Directory & Storage Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-[#14141E] border border-white/5 flex flex-col justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <HardDrive className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-[11px] font-black uppercase tracking-wider text-white/40">Storage Directory</h4>
              <p className="text-xs text-white/80 font-mono truncate" title={downloadDir}>
                {downloadDir}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 pl-[52px]">
            <button
              onClick={handleChangeDownloadDir}
              className="px-2.5 py-1 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 text-[10px] font-bold transition-all active:scale-95 flex items-center gap-1.5"
            >
              <FolderEdit size={12} />
              <span>Change Folder</span>
            </button>
            <button
              onClick={handleResetDownloadDir}
              className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white text-[10px] font-medium transition-all"
              title="Reset to default download folder"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#14141E] border border-white/5 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-[11px] font-black uppercase tracking-wider text-white/40">Offline Anime Space</h4>
            <p className="text-sm font-black text-white">
              {formatBytes(totalCompletedSize)}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#14141E] border border-white/5 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-[11px] font-black uppercase tracking-wider text-white/40">Downloader Mode</h4>
            <p className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <span>Concurrent HLS Engine (1080p MP4)</span>
            </p>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2 p-1 rounded-xl bg-[#14141E] border border-white/5 w-full sm:w-auto">
          <button
            onClick={() => setFilter('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filter === 'all'
                ? 'bg-primary text-white shadow-sm'
                : 'text-white/50 hover:text-white'
            }`}
          >
            All ({downloads.length})
          </button>
          <button
            onClick={() => setFilter('progressing')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filter === 'progressing'
                ? 'bg-primary text-white shadow-sm'
                : 'text-white/50 hover:text-white'
            }`}
          >
            Downloading ({activeDownloadingCount})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filter === 'completed'
                ? 'bg-primary text-white shadow-sm'
                : 'text-white/50 hover:text-white'
            }`}
          >
            Completed ({downloads.filter((d) => d.state === 'completed').length})
          </button>
        </div>

        {downloads.length > 3 && (
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-white/30" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search offline anime..."
              className="w-full bg-[#14141E] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-primary"
            />
          </div>
        )}
      </div>

      {/* Downloads List */}
      {filteredDownloads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl bg-[#14141E]/40 border border-white/5 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/30">
            <Download className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white mb-1">
              {searchQuery ? 'No matching downloads' : 'No Active or Offline Episodes'}
            </h3>
            <p className="text-xs text-white/40 max-w-md mx-auto">
              Click the download button on any episode card or inside the video player to save it offline in 1080p full quality.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDownloads.map((item) => {
            const isCompleted = item.state === 'completed';
            const isProgressing = item.state === 'progressing';
            const isFailed = item.state === 'failed';
            const posterUrl = getImageUrl(item.animePoster);

            return (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-[#14141E] border border-white/5 hover:border-white/15 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group"
              >
                {/* Left: Poster & Title Info */}
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  {/* Poster Thumbnail */}
                  <div className="w-12 h-16 rounded-xl bg-black/40 overflow-hidden shrink-0 border border-white/10 relative">
                    {posterUrl ? (
                      <img src={posterUrl} alt={item.animeTitle} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/20">
                        <Film size={20} />
                      </div>
                    )}
                    {isCompleted && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handlePlay(item)}
                          className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white shadow-lg shadow-red-500/40 hover:scale-110 active:scale-95 transition-all"
                        >
                          <Play size={12} fill="white" className="ml-0.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Metadata */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-extrabold text-white truncate max-w-sm">
                        {item.animeTitle}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary/20 text-primary border border-primary/30">
                        EP {item.episodeNumber}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-white/70 uppercase">
                        {item.track}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold">
                        {item.quality}
                      </span>
                    </div>

                    <p className="text-xs text-white/50 truncate">
                      {item.episodeTitle || item.filename}
                    </p>

                    {/* Progress Bar & Realtime Stats */}
                    {isProgressing && (
                      <div className="space-y-1.5 pt-1">
                        <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-300 shadow-glow-red"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-mono text-white/50">
                          <span className="text-primary font-bold">
                            {item.progress}% • {item.speed || 'Downloading...'}
                          </span>
                          <span>
                            {formatBytes(item.receivedBytes)} of {formatBytes(item.totalBytes)}
                          </span>
                        </div>
                      </div>
                    )}

                    {isCompleted && (
                      <div className="flex items-center gap-2 text-[11px] text-white/40 font-mono">
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 size={12} />
                          Ready for Offline Play
                        </span>
                        <span>•</span>
                        <span>{formatBytes(item.fileSize || item.receivedBytes)}</span>
                      </div>
                    )}

                    {isFailed && (
                      <p className="text-xs text-red-400 font-bold flex items-center gap-1">
                        <AlertCircle size={12} />
                        Download Failed. Check your network connection.
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-white/5 justify-end">
                  {isCompleted && (
                    <>
                      <button
                        onClick={() => handlePlay(item)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold shadow-glow-red transition-all hover:scale-105 active:scale-95"
                        title="Play offline in ANIDESK Video Player"
                      >
                        <Play size={13} fill="white" />
                        <span>Play Offline</span>
                      </button>

                      <button
                        onClick={() => handleOpenFolder(item.filePath)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-semibold border border-white/10 transition-colors"
                        title="Show in Windows File Explorer"
                      >
                        <FolderOpen size={14} className="text-primary" />
                        <span className="hidden sm:inline">Show in Folder</span>
                      </button>
                    </>
                  )}

                  {isProgressing && (
                    <button
                      onClick={() => handleCancel(item.id)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold border border-red-500/20 transition-all active:scale-95"
                      title="Cancel Download"
                    >
                      <X size={14} />
                      <span>Cancel</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(item)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-400 border border-white/10 transition-all"
                    title="Delete offline file"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
