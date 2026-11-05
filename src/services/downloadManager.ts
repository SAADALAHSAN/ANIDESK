import { api } from './api';
import { storage, StoredDownload } from './storage';
import { AnimeCard, EpisodeItem, PlaySource } from '../types/api';

class DownloadManager {
  private isListening = false;

  constructor() {
    this.initListeners();
    this.syncSavedDownloadDir();
  }

  private syncSavedDownloadDir() {
    const savedPath = storage.getPreferences().downloadStoragePath;
    const electron = (window as any).electronAPI;
    if (savedPath && electron?.setDownloadsDir) {
      electron.setDownloadsDir(savedPath).catch(() => {});
    }
  }

  private initListeners() {
    if (this.isListening) return;
    const electron = (window as any).electronAPI;
    if (!electron?.onDownloadProgress) return;

    this.isListening = true;

    electron.onDownloadProgress((payload: any) => {
      const { id, progress, receivedBytes, totalBytes, speed, state, savePath, error } = payload;
      storage.updateDownload(id, {
        progress,
        receivedBytes,
        totalBytes,
        speed,
        state,
        ...(savePath ? { filePath: savePath } : {}),
        ...(state === 'completed' ? { completedAt: Date.now(), fileSize: receivedBytes } : {}),
      });
    });
  }

  public async startEpisodeDownload(options: {
    anime: { id: number; title: string; poster: string };
    episode: { id: number; number: number; title?: string };
    track?: 'sub' | 'dub';
    quality?: string;
    customDir?: string;
    streamUrl?: string;
    mediaHeaders?: Record<string, string>;
    subtitles?: Array<{ lang: string; label: string; url: string; default?: boolean }>;
  }): Promise<{ success: boolean; error?: string }> {
    const track = options.track || storage.getPreferences().defaultTrack || 'sub';
    const quality = options.quality || storage.getPreferences().downloadQuality || storage.getPreferences().defaultQuality || '1080p';
    const downloadId = `${options.anime.id}_${options.episode.id}_${track}`;

    // Check if already completed or downloading
    const existing = storage.getDownloads().find((d) => d.id === downloadId);
    if (existing && existing.state === 'progressing') {
      return { success: true };
    }

    let streamUrl = options.streamUrl;
    let headers = options.mediaHeaders;
    let subtitles = options.subtitles;

    // If stream URL is not pre-provided, resolve it via API
    if (!streamUrl) {
      try {
        const playback = await api.playEpisode(
          options.episode.id,
          track,
          (options.anime as any)?.anilist_id,
          options.episode.number
        );
        if (!playback?.sources || playback.sources.length === 0) {
          throw new Error('No streaming servers available for this episode.');
        }

        let bestSource = playback.sources[0];
        if (bestSource.resolvable && bestSource.server_id) {
          try {
            bestSource = await api.resolveServer(options.episode.id, bestSource.server_id, track);
          } catch {}
        }

        streamUrl = bestSource.url;
        headers = bestSource.media_headers;
        subtitles = bestSource.subtitles;
      } catch (err: any) {
        return { success: false, error: err?.message || 'Failed to resolve stream link' };
      }
    }

    if (!streamUrl) {
      return { success: false, error: 'Could not resolve playable HLS stream' };
    }

    // Prepare initial storage entry
    const safeTitle = options.anime.title.replace(/[\\/:*?"<>|]/g, '_').trim();
    const filename = `${safeTitle} - EP ${options.episode.number.toString().padStart(2, '0')}.mp4`;

    const downloadEntry: StoredDownload = {
      id: downloadId,
      animeId: options.anime.id,
      animeTitle: options.anime.title,
      animePoster: options.anime.poster,
      episodeId: options.episode.id,
      episodeNumber: options.episode.number,
      episodeTitle: options.episode.title || `Episode ${options.episode.number}`,
      track,
      quality,
      filename,
      state: 'progressing',
      progress: 0,
      speed: 'Starting...',
      receivedBytes: 0,
      totalBytes: 0,
      createdAt: Date.now(),
    };

    storage.saveDownload(downloadEntry);

    const electron = (window as any).electronAPI;
    if (electron?.startDownload) {
      try {
        const customDir = options.customDir || storage.getPreferences().downloadStoragePath || undefined;
        const res = await electron.startDownload({
          id: downloadId,
          animeTitle: options.anime.title,
          episodeNumber: options.episode.number,
          episodeTitle: options.episode.title,
          streamUrl,
          headers,
          quality,
          subtitles,
          customDir,
        });

        if (res?.filePath) {
          storage.updateDownload(downloadId, { filePath: res.filePath });
        }

        return { success: true };
      } catch (err: any) {
        storage.updateDownload(downloadId, { state: 'failed', speed: 'Failed' });
        return { success: false, error: err.message };
      }
    } else {
      console.warn('Native Electron download API unavailable in standard browser');
      return { success: false, error: 'Native Electron downloader not available' };
    }
  }

  public async bulkDownloadEpisodes(options: {
    anime: { id: number; title: string; poster: string };
    episodes: Array<{ id: number; number: number; title?: string }>;
    track?: 'sub' | 'dub';
    quality?: string;
    onProgress?: (queued: number, total: number) => void;
  }): Promise<{ queued: number; total: number }> {
    let queued = 0;
    const total = options.episodes.length;

    for (const ep of options.episodes) {
      await this.startEpisodeDownload({
        anime: options.anime,
        episode: ep,
        track: options.track,
        quality: options.quality,
      });
      queued++;
      if (options.onProgress) {
        options.onProgress(queued, total);
      }
      // Small pause between queueing so network is not flooded
      await new Promise((r) => setTimeout(r, 120));
    }

    return { queued, total };
  }

  public cancelDownload(id: string) {
    const electron = (window as any).electronAPI;
    if (electron?.cancelDownload) {
      electron.cancelDownload(id);
    }
    storage.updateDownload(id, { state: 'cancelled', speed: 'Cancelled' });
  }

  public async deleteDownload(item: StoredDownload) {
    const electron = (window as any).electronAPI;
    if (electron?.deleteDownloadFile && item.filePath) {
      await electron.deleteDownloadFile(item.filePath);
    }
    storage.removeDownload(item.id);
  }

  public openInFolder(filePath?: string) {
    const electron = (window as any).electronAPI;
    if (electron?.openDownloadFolder) {
      electron.openDownloadFolder(filePath);
    }
  }

  public openDownloadsFolder() {
    const electron = (window as any).electronAPI;
    if (electron?.openDownloadsDir) {
      electron.openDownloadsDir();
    }
  }

  public async getDownloadsDir(): Promise<string> {
    const electron = (window as any).electronAPI;
    if (electron?.getDownloadsDir) {
      return await electron.getDownloadsDir();
    }
    return 'Downloads/ANIDESK';
  }

  public async selectDownloadDirectory(): Promise<string | null> {
    const electron = (window as any).electronAPI;
    if (electron?.selectDownloadDirectory) {
      const selected = await electron.selectDownloadDirectory();
      if (selected) {
        storage.savePreferences({ downloadStoragePath: selected });
        return selected;
      }
    }
    return null;
  }

  public async resetDownloadsDir(): Promise<string> {
    const electron = (window as any).electronAPI;
    if (electron?.resetDownloadsDir) {
      const def = await electron.resetDownloadsDir();
      storage.savePreferences({ downloadStoragePath: '' });
      return def;
    }
    storage.savePreferences({ downloadStoragePath: '' });
    return 'Downloads/ANIDESK';
  }

  public async setDownloadsDir(dir: string): Promise<boolean> {
    const electron = (window as any).electronAPI;
    if (electron?.setDownloadsDir) {
      const res = await electron.setDownloadsDir(dir);
      if (res) {
        storage.savePreferences({ downloadStoragePath: dir });
      }
      return res;
    }
    return false;
  }
}

export const downloadManager = new DownloadManager();
