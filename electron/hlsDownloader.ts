import fs from 'fs';
import path from 'path';
import { app, BrowserWindow } from 'electron';

export interface StartDownloadParams {
  id: string;
  animeTitle: string;
  episodeNumber: number;
  episodeTitle?: string;
  streamUrl: string;
  headers?: Record<string, string>;
  quality?: string; // '1080p' | '720p' | '480p' | '360p' | 'auto'
  subtitles?: Array<{ lang: string; label: string; url: string; default?: boolean }>;
  customDir?: string;
}

export interface DownloadProgressPayload {
  id: string;
  filename: string;
  progress: number;
  receivedBytes: number;
  totalBytes: number;
  speed: string; // e.g. "3.5 MB/s"
  state: 'progressing' | 'completed' | 'failed' | 'cancelled';
  savePath?: string;
  error?: string;
}

interface ActiveJob {
  id: string;
  filename: string;
  filePath: string;
  abortController: AbortController;
  writeStream?: fs.WriteStream;
  isCancelled: boolean;
}

export class HlsDownloader {
  private activeJobs = new Map<string, ActiveJob>();
  private defaultDownloadDir: string;
  private currentDownloadDir: string;

  constructor() {
    this.defaultDownloadDir = path.join(app.getPath('downloads'), 'ANIDESK');
    this.currentDownloadDir = this.defaultDownloadDir;
    this.ensureDir(this.currentDownloadDir);
  }

  public getDownloadDir(): string {
    return this.currentDownloadDir;
  }

  public setDownloadDir(newDir: string): boolean {
    if (!newDir || typeof newDir !== 'string') return false;
    try {
      this.ensureDir(newDir);
      this.currentDownloadDir = newDir;
      return true;
    } catch {
      return false;
    }
  }

  public resetDownloadDir(): string {
    this.currentDownloadDir = this.defaultDownloadDir;
    this.ensureDir(this.currentDownloadDir);
    return this.currentDownloadDir;
  }

  private ensureDir(dirPath: string) {
    try {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    } catch {}
  }

  private sanitizeFilename(name: string): string {
    return name.replace(/[\\/:*?"<>|]/g, '_').trim();
  }

  private sendProgress(window: BrowserWindow | null, payload: DownloadProgressPayload) {
    if (window && !window.isDestroyed()) {
      window.webContents.send('download-progress', payload);
    }
  }

  public cancel(id: string) {
    const job = this.activeJobs.get(id);
    if (job) {
      job.isCancelled = true;
      job.abortController.abort();
      if (job.writeStream) {
        job.writeStream.destroy();
      }
      try {
        if (fs.existsSync(job.filePath)) {
          fs.unlinkSync(job.filePath);
        }
      } catch {}
      this.activeJobs.delete(id);
    }
  }

  public async startDownload(params: StartDownloadParams, window: BrowserWindow | null): Promise<{ success: boolean; filePath: string }> {
    const baseDir = params.customDir && fs.existsSync(params.customDir)
      ? params.customDir
      : this.currentDownloadDir;
    const safeAnime = this.sanitizeFilename(params.animeTitle);
    const animeDir = path.join(baseDir, safeAnime);

    if (!fs.existsSync(animeDir)) {
      fs.mkdirSync(animeDir, { recursive: true });
    }

    const filename = `${safeAnime} - EP ${params.episodeNumber.toString().padStart(2, '0')}.mp4`;
    const filePath = path.join(animeDir, filename);

    // Cancel any existing job with same ID
    this.cancel(params.id);

    const abortController = new AbortController();
    const job: ActiveJob = {
      id: params.id,
      filename,
      filePath,
      abortController,
      isCancelled: false,
    };
    this.activeJobs.set(params.id, job);

    // Run download in background asynchronously
    this.executeDownload(params, job, window).catch((err) => {
      if (!job.isCancelled) {
        this.sendProgress(window, {
          id: params.id,
          filename,
          progress: 0,
          receivedBytes: 0,
          totalBytes: 0,
          speed: '0 KB/s',
          state: 'failed',
          error: err.message || 'Download error',
        });
        this.activeJobs.delete(params.id);
      }
    });

    return { success: true, filePath };
  }

  private async executeDownload(
    params: StartDownloadParams,
    job: ActiveJob,
    window: BrowserWindow | null
  ): Promise<void> {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      ...(params.headers || {}),
    };

    // 1. Download subtitle if available
    if (params.subtitles && params.subtitles.length > 0) {
      const defaultSub = params.subtitles.find((s) => s.default) || params.subtitles[0];
      if (defaultSub?.url) {
        try {
          const subFilename = job.filename.replace(/\.mp4$/, '.vtt');
          const subPath = path.join(path.dirname(job.filePath), subFilename);
          const subRes = await fetch(defaultSub.url, { headers, signal: job.abortController.signal });
          if (subRes.ok) {
            const subText = await subRes.text();
            await fs.promises.writeFile(subPath, subText, 'utf-8');
          }
        } catch {}
      }
    }

    // 2. Fetch Master Playlist or direct stream
    const masterRes = await fetch(params.streamUrl, {
      headers,
      signal: job.abortController.signal,
    });

    if (!masterRes.ok) {
      throw new Error(`Failed to load stream (HTTP ${masterRes.status})`);
    }

    const contentType = masterRes.headers.get('content-type') || '';
    const initialText = await masterRes.text();

    let targetVariantUrl = params.streamUrl;
    let variantPlaylistText = initialText;

    // 3. Handle Master Playlist (resolutions selection)
    if (initialText.includes('#EXT-X-STREAM-INF')) {
      const lines = initialText.split('\n').map((l) => l.trim());
      const variants: Array<{ bandwidth: number; resolution: string; height: number; url: string }> = [];

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('#EXT-X-STREAM-INF')) {
          const inf = lines[i];
          const nextUrl = lines[i + 1];
          if (nextUrl && !nextUrl.startsWith('#')) {
            const resMatch = inf.match(/RESOLUTION=(\d+)x(\d+)/);
            const bwMatch = inf.match(/BANDWIDTH=(\d+)/);
            const height = resMatch ? parseInt(resMatch[2], 10) : 720;
            const bandwidth = bwMatch ? parseInt(bwMatch[1], 10) : 0;
            variants.push({
              bandwidth,
              resolution: resMatch ? `${resMatch[1]}x${resMatch[2]}` : 'Unknown',
              height,
              url: new URL(nextUrl, params.streamUrl).href,
            });
          }
        }
      }

      // Sort variants highest quality first
      variants.sort((a, b) => b.height - a.height);

      // Select best matching quality
      let selectedVariant = variants[0];
      if (params.quality && params.quality !== 'auto') {
        const targetH = parseInt(params.quality.replace('p', ''), 10);
        const match = variants.find((v) => v.height <= targetH);
        if (match) selectedVariant = match;
      }

      if (selectedVariant) {
        targetVariantUrl = selectedVariant.url;
        const vRes = await fetch(targetVariantUrl, { headers, signal: job.abortController.signal });
        if (!vRes.ok) throw new Error(`Failed to load variant playlist (${vRes.status})`);
        variantPlaylistText = await vRes.text();
      }
    }

    // 4. Parse segment URLs from media playlist
    const vLines = variantPlaylistText.split('\n').map((l) => l.trim());
    const segmentUrls: string[] = [];

    for (let i = 0; i < vLines.length; i++) {
      const line = vLines[i];
      if (line.startsWith('#EXTINF')) {
        const next = vLines[i + 1];
        if (next && !next.startsWith('#')) {
          segmentUrls.push(new URL(next, targetVariantUrl).href);
        }
      }
    }

    if (segmentUrls.length === 0) {
      throw new Error('No video segments found in playlist');
    }

    // 5. Open write stream for the output file
    const writeStream = fs.createWriteStream(job.filePath);
    job.writeStream = writeStream;

    let receivedBytes = 0;
    let completedSegments = 0;
    const totalSegments = segmentUrls.length;

    // Approximate total bytes: sample first chunk or estimate ~1.5MB per segment
    let estimatedTotalBytes = totalSegments * 1.5 * 1024 * 1024;

    let lastTime = Date.now();
    let bytesSinceLastCheck = 0;
    let currentSpeed = '0 KB/s';

    // In-memory buffer map to write chunks sequentially
    const bufferMap = new Map<number, Buffer>();
    let nextIndexToWrite = 0;

    const flushAvailableBuffers = () => {
      while (bufferMap.has(nextIndexToWrite)) {
        const buf = bufferMap.get(nextIndexToWrite)!;
        bufferMap.delete(nextIndexToWrite);
        writeStream.write(buf);
        nextIndexToWrite++;
      }
    };

    // Concurrency pool (4 workers)
    const CONCURRENCY = 4;
    let currentIndex = 0;

    const downloadWorker = async () => {
      while (currentIndex < segmentUrls.length) {
        if (job.isCancelled) return;

        const segIndex = currentIndex++;
        const segUrl = segmentUrls[segIndex];

        let retries = 3;
        let segBuffer: Buffer | null = null;

        while (retries > 0 && !segBuffer && !job.isCancelled) {
          try {
            const res = await fetch(segUrl, { headers, signal: job.abortController.signal });
            if (res.ok) {
              const arrayBuf = await res.arrayBuffer();
              segBuffer = Buffer.from(arrayBuf);
            } else {
              retries--;
              await new Promise((r) => setTimeout(r, 600));
            }
          } catch (e: any) {
            if (job.isCancelled) return;
            retries--;
            await new Promise((r) => setTimeout(r, 600));
          }
        }

        if (!segBuffer) {
          throw new Error(`Failed to download video chunk #${segIndex + 1}`);
        }

        // Cache and write in sequential order
        bufferMap.set(segIndex, segBuffer);
        flushAvailableBuffers();

        completedSegments++;
        receivedBytes += segBuffer.byteLength;
        bytesSinceLastCheck += segBuffer.byteLength;

        // Calculate actual total bytes estimate as we gather chunk sizes
        if (completedSegments > 5) {
          const avgChunkSize = receivedBytes / completedSegments;
          estimatedTotalBytes = Math.round(avgChunkSize * totalSegments);
        }

        // Speed & Progress calculation (throttled every 400ms)
        const now = Date.now();
        const elapsed = (now - lastTime) / 1000;
        if (elapsed >= 0.4 || completedSegments === totalSegments) {
          const bytesPerSec = bytesSinceLastCheck / elapsed;
          currentSpeed =
            bytesPerSec > 1024 * 1024
              ? `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`
              : `${Math.round(bytesPerSec / 1024)} KB/s`;

          lastTime = now;
          bytesSinceLastCheck = 0;

          const progress = Math.min(
            99,
            Math.round((completedSegments / totalSegments) * 100)
          );

          this.sendProgress(window, {
            id: params.id,
            filename: job.filename,
            progress,
            receivedBytes,
            totalBytes: estimatedTotalBytes,
            speed: currentSpeed,
            state: 'progressing',
            savePath: job.filePath,
          });
        }
      }
    };

    // Run parallel workers
    const workers = Array.from({ length: Math.min(CONCURRENCY, segmentUrls.length) }).map(() =>
      downloadWorker()
    );
    await Promise.all(workers);

    if (job.isCancelled) {
      return;
    }

    // Flush any remaining buffers
    flushAvailableBuffers();

    // Close write stream
    await new Promise<void>((resolve, reject) => {
      writeStream.end(() => resolve());
      writeStream.on('error', reject);
    });

    this.activeJobs.delete(params.id);

    // Send 100% completion event
    this.sendProgress(window, {
      id: params.id,
      filename: job.filename,
      progress: 100,
      receivedBytes,
      totalBytes: receivedBytes,
      speed: 'Done',
      state: 'completed',
      savePath: job.filePath,
    });
  }
}
