import { app, BrowserWindow, shell } from 'electron';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { spawn } from 'child_process';

export interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseName: string;
  releaseNotes: string;
  publishedAt: string;
  downloadUrl: string;
  assetName: string;
  size: number;
}

export interface UpdateProgressPayload {
  percent: number;
  receivedBytes: number;
  totalBytes: number;
  speed: string;
  state: 'downloading' | 'completed' | 'failed';
  error?: string;
}

// Compare semantic versioning (e.g. 1.0.1 vs 1.0.0)
export function isNewerVersion(remoteVer: string, currentVer: string): boolean {
  const clean = (v: string) => v.replace(/^v/i, '').trim();
  const rParts = clean(remoteVer).split('.').map((n) => parseInt(n, 10) || 0);
  const cParts = clean(currentVer).split('.').map((n) => parseInt(n, 10) || 0);

  const maxLen = Math.max(rParts.length, cParts.length);
  for (let i = 0; i < maxLen; i++) {
    const r = rParts[i] || 0;
    const c = cParts[i] || 0;
    if (r > c) return true;
    if (r < c) return false;
  }
  return false;
}

export class AppUpdater {
  private defaultRepo = 'SAADALAHSAN/anidesk';
  private isDownloading = false;

  public async checkForUpdates(customRepo?: string): Promise<UpdateInfo> {
    const repo = (customRepo || this.defaultRepo).trim();
    const currentVersion = app.getVersion() || '1.0.0';

    try {
      const releaseData = await this.fetchJson(`https://api.github.com/repos/${repo}/releases/latest`);
      if (!releaseData || !releaseData.tag_name) {
        // Fallback: check raw package.json or version.json in repo main branch
        return await this.fallbackCheck(repo, currentVersion);
      }

      const remoteTag = releaseData.tag_name;
      const cleanRemote = remoteTag.replace(/^v/i, '');
      const hasUpdate = isNewerVersion(cleanRemote, currentVersion);

      // Find Windows .exe installer asset
      let exeAsset = (releaseData.assets || []).find((a: any) =>
        typeof a.name === 'string' && a.name.toLowerCase().endsWith('.exe')
      );

      const downloadUrl = exeAsset ? exeAsset.browser_download_url : (releaseData.html_url || `https://github.com/${repo}/releases/latest`);
      const assetName = exeAsset ? exeAsset.name : `ANIDESK-v${cleanRemote}-Setup.exe`;
      const size = exeAsset ? exeAsset.size : 0;

      return {
        hasUpdate,
        currentVersion,
        latestVersion: cleanRemote,
        releaseName: releaseData.name || `ANIDESK v${cleanRemote}`,
        releaseNotes: releaseData.body || 'Production performance enhancements and streaming mirror optimizations.',
        publishedAt: releaseData.published_at || new Date().toISOString(),
        downloadUrl,
        assetName,
        size,
      };
    } catch {
      // Fallback check if GitHub API is rate-limited or repository is not yet public
      return await this.fallbackCheck(repo, currentVersion);
    }
  }

  private async fallbackCheck(repo: string, currentVersion: string): Promise<UpdateInfo> {
    try {
      const rawUrl = `https://raw.githubusercontent.com/${repo}/main/package.json`;
      const pkg = await this.fetchJson(rawUrl);
      if (pkg && pkg.version) {
        const cleanRemote = pkg.version.replace(/^v/i, '');
        const hasUpdate = isNewerVersion(cleanRemote, currentVersion);
        return {
          hasUpdate,
          currentVersion,
          latestVersion: cleanRemote,
          releaseName: `ANIDESK v${cleanRemote}`,
          releaseNotes: 'New anime streaming servers, faster playback, and stability improvements.',
          publishedAt: new Date().toISOString(),
          downloadUrl: `https://github.com/${repo}/releases/latest`,
          assetName: `ANIDESK-Setup.exe`,
          size: 0,
        };
      }
    } catch {}

    return {
      hasUpdate: false,
      currentVersion,
      latestVersion: currentVersion,
      releaseName: `ANIDESK v${currentVersion}`,
      releaseNotes: 'You are running the latest production version.',
      publishedAt: new Date().toISOString(),
      downloadUrl: '',
      assetName: '',
      size: 0,
    };
  }

  public async downloadAndInstall(
    downloadUrl: string,
    window?: BrowserWindow | null,
    targetFilename?: string
  ): Promise<{ success: boolean; error?: string }> {
    if (this.isDownloading) {
      return { success: false, error: 'Download already in progress.' };
    }

    if (!downloadUrl || !downloadUrl.startsWith('http')) {
      return { success: false, error: 'Invalid update download URL.' };
    }

    // If downloadUrl is a GitHub webpage rather than a direct executable, open in browser
    if (!downloadUrl.toLowerCase().endsWith('.exe')) {
      shell.openExternal(downloadUrl);
      return { success: true };
    }

    this.isDownloading = true;
    const tempDir = app.getPath('temp');
    const fileName = targetFilename || `ANIDESK-Update-${Date.now()}.exe`;
    const destPath = path.join(tempDir, fileName);

    return new Promise((resolve) => {
      let receivedBytes = 0;
      let totalBytes = 0;
      let startTime = Date.now();
      let lastReportTime = 0;

      const notify = (payload: UpdateProgressPayload) => {
        if (window && !window.isDestroyed()) {
          window.webContents.send('update-download-progress', payload);
        }
      };

      const fileStream = fs.createWriteStream(destPath);

      const handleResponse = (res: http.IncomingMessage) => {
        // Handle HTTP 301/302 Redirects (Standard for GitHub Releases / AWS S3)
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fileStream.close();
          fs.unlink(destPath, () => {});
          this.downloadFromUrl(res.headers.location, destPath, window)
            .then(resolve)
            .catch((err) => resolve({ success: false, error: err.message }))
            .finally(() => {
              this.isDownloading = false;
            });
          return;
        }

        if (res.statusCode !== 200) {
          fileStream.close();
          fs.unlink(destPath, () => {});
          this.isDownloading = false;
          notify({
            percent: 0,
            receivedBytes: 0,
            totalBytes: 0,
            speed: '0 KB/s',
            state: 'failed',
            error: `Server responded with HTTP ${res.statusCode}`,
          });
          resolve({ success: false, error: `HTTP ${res.statusCode}` });
          return;
        }

        totalBytes = parseInt(res.headers['content-length'] || '0', 10);

        res.on('data', (chunk: Buffer) => {
          receivedBytes += chunk.length;
          fileStream.write(chunk);

          const now = Date.now();
          if (now - lastReportTime > 250) {
            lastReportTime = now;
            const elapsedSecs = (now - startTime) / 1000;
            const bytesPerSec = elapsedSecs > 0 ? receivedBytes / elapsedSecs : 0;
            const speed = bytesPerSec > 1024 * 1024
              ? `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`
              : `${(bytesPerSec / 1024).toFixed(0)} KB/s`;
            const percent = totalBytes > 0 ? Math.min(100, Math.round((receivedBytes / totalBytes) * 100)) : 0;

            notify({
              percent,
              receivedBytes,
              totalBytes,
              speed,
              state: 'downloading',
            });
          }
        });

        res.on('end', () => {
          fileStream.end(() => {
            this.isDownloading = false;
            notify({
              percent: 100,
              receivedBytes,
              totalBytes: receivedBytes,
              speed: 'Complete',
              state: 'completed',
            });

            // Automatically launch installer and exit app gracefully
            try {
              const child = spawn(destPath, [], {
                detached: true,
                stdio: 'ignore',
              });
              child.unref();
              setTimeout(() => {
                app.quit();
              }, 1000);
              resolve({ success: true });
            } catch (spawnErr: any) {
              // Fallback to shell open
              shell.openPath(destPath);
              resolve({ success: true });
            }
          });
        });

        res.on('error', (err) => {
          fileStream.close();
          fs.unlink(destPath, () => {});
          this.isDownloading = false;
          notify({
            percent: 0,
            receivedBytes,
            totalBytes,
            speed: '0 KB/s',
            state: 'failed',
            error: err.message,
          });
          resolve({ success: false, error: err.message });
        });
      };

      const client = downloadUrl.startsWith('https') ? https : http;
      const req = client.get(
        downloadUrl,
        {
          headers: {
            'User-Agent': 'ANIDESK-Desktop-App/1.0',
            Accept: '*/*',
          },
        },
        handleResponse
      );

      req.on('error', (err) => {
        fileStream.close();
        fs.unlink(destPath, () => {});
        this.isDownloading = false;
        notify({
          percent: 0,
          receivedBytes: 0,
          totalBytes: 0,
          speed: '0 KB/s',
          state: 'failed',
          error: err.message,
        });
        resolve({ success: false, error: err.message });
      });
    });
  }

  private downloadFromUrl(
    url: string,
    destPath: string,
    window?: BrowserWindow | null
  ): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      const fileStream = fs.createWriteStream(destPath);
      let receivedBytes = 0;
      let totalBytes = 0;
      let startTime = Date.now();
      let lastReportTime = 0;

      const notify = (payload: UpdateProgressPayload) => {
        if (window && !window.isDestroyed()) {
          window.webContents.send('update-download-progress', payload);
        }
      };

      const client = url.startsWith('https') ? https : http;
      const req = client.get(
        url,
        {
          headers: {
            'User-Agent': 'ANIDESK-Desktop-App/1.0',
            Accept: '*/*',
          },
        },
        (res) => {
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            fileStream.close();
            fs.unlink(destPath, () => {});
            this.downloadFromUrl(res.headers.location, destPath, window).then(resolve);
            return;
          }

          if (res.statusCode !== 200) {
            fileStream.close();
            fs.unlink(destPath, () => {});
            resolve({ success: false, error: `HTTP ${res.statusCode}` });
            return;
          }

          totalBytes = parseInt(res.headers['content-length'] || '0', 10);

          res.on('data', (chunk: Buffer) => {
            receivedBytes += chunk.length;
            fileStream.write(chunk);

            const now = Date.now();
            if (now - lastReportTime > 250) {
              lastReportTime = now;
              const elapsedSecs = (now - startTime) / 1000;
              const bytesPerSec = elapsedSecs > 0 ? receivedBytes / elapsedSecs : 0;
              const speed = bytesPerSec > 1024 * 1024
                ? `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`
                : `${(bytesPerSec / 1024).toFixed(0)} KB/s`;
              const percent = totalBytes > 0 ? Math.min(100, Math.round((receivedBytes / totalBytes) * 100)) : 0;

              notify({
                percent,
                receivedBytes,
                totalBytes,
                speed,
                state: 'downloading',
              });
            }
          });

          res.on('end', () => {
            fileStream.end(() => {
              notify({
                percent: 100,
                receivedBytes,
                totalBytes: receivedBytes,
                speed: 'Complete',
                state: 'completed',
              });

              try {
                const child = spawn(destPath, [], {
                  detached: true,
                  stdio: 'ignore',
                });
                child.unref();
                setTimeout(() => {
                  app.quit();
                }, 1000);
                resolve({ success: true });
              } catch {
                shell.openPath(destPath);
                resolve({ success: true });
              }
            });
          });

          res.on('error', (err) => {
            fileStream.close();
            fs.unlink(destPath, () => {});
            resolve({ success: false, error: err.message });
          });
        }
      );

      req.on('error', (err) => {
        fileStream.close();
        fs.unlink(destPath, () => {});
        resolve({ success: false, error: err.message });
      });
    });
  }

  private fetchJson(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http;
      const req = client.get(
        url,
        {
          headers: {
            'User-Agent': 'ANIDESK-Desktop-App/1.0',
            Accept: 'application/vnd.github.v3+json, application/json',
          },
          timeout: 5000,
        },
        (res) => {
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            this.fetchJson(res.headers.location).then(resolve).catch(reject);
            return;
          }

          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode}`));
            return;
          }

          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(e);
            }
          });
        }
      );

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      req.on('error', reject);
    });
  }
}

export const appUpdater = new AppUpdater();
