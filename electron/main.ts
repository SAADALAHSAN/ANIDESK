import { app, BrowserWindow, ipcMain, session, shell, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { HlsDownloader } from './hlsDownloader';
import { appUpdater } from './updater';

const downloader = new HlsDownloader();
const isDev = !app.isPackaged;

function isServerReachable(url: string, timeout = 600): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      resolve(res.statusCode === 200 || res.statusCode === 304);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(timeout, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function log(...args: any[]) {
  if (!isDev) return;
  try {
    const logFile = path.join(app.getPath('userData'), 'anidesk.log');
    const line = `[${new Date().toISOString()}] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')}\n`;
    fs.appendFileSync(logFile, line);
  } catch {
    // ignore
  }
}

log('--- MAIN PROCESS STARTED ---');

// High-performance hardware acceleration & true 1080p video decoding flags
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('enable-accelerated-video-decode');
app.commandLine.appendSwitch('enable-features', 'VaapiVideoDecoder,PlatformHEVCDecoderSupport,D3D11VideoDecoder');
app.commandLine.appendSwitch('disable-features', 'UseChromeOSDirectVideoDecoder');
app.commandLine.appendSwitch('allow-file-access-from-files');

app.name = 'ANIDESK';
try {
  app.setPath('userData', path.join(app.getPath('appData'), 'ANIDESK'));
} catch {}

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  log('createWindow() called');
  const iconPng = path.join(__dirname, '../public/icon.png');
  const iconIco = path.join(__dirname, '../public/icon.ico');
  const chosenIcon = fs.existsSync(iconIco) ? iconIco : (fs.existsSync(iconPng) ? iconPng : undefined);
  log('chosenIcon:', chosenIcon);

  mainWindow = new BrowserWindow({
    width: 1380,
    height: 860,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: '#08080C',
    frame: false, // Custom sleek titlebar
    title: 'ANIDESK',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Ensures all external anime HLS CDN streams and images load without CORS blockers
      backgroundThrottling: false, // Prevents video quality throttling or stuttering when app is backgrounded
    },
    ...(chosenIcon ? { icon: chosenIcon } : {}),
    show: true,
  });

  mainWindow.webContents.on('did-fail-load', (_e, code, desc, url) => {
    log('[Load Error]', code, desc, url);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    log('[Load Success] did-finish-load');
  });

  mainWindow.webContents.on('console-message', (_e, level, message, line, sourceId) => {
    log(`[Renderer ${level}]`, message, `(${sourceId}:${line})`);
  });

  // Intercept and inject required headers for anime streaming CDNs
  session.defaultSession.webRequest.onBeforeSendHeaders({ urls: ['*://*/*'] }, (details, callback) => {
    const url = details.url;
    const headers = { ...details.requestHeaders };

    // 1. If renderer specified target referer/origin through custom headers, use them with highest priority
    if (headers['x-target-referer'] || headers['X-Target-Referer']) {
      const targetRef = (headers['x-target-referer'] || headers['X-Target-Referer']) as string;
      headers['Referer'] = targetRef;
      try {
        const u = new URL(targetRef);
        headers['Origin'] = `${u.protocol}//${u.host}`;
      } catch {
        headers['Origin'] = targetRef;
      }
      delete headers['x-target-referer'];
      delete headers['X-Target-Referer'];
      delete headers['x-target-origin'];
      delete headers['X-Target-Origin'];
    }

    if (url.includes('enma.lol')) {
      headers['Referer'] = 'https://www.enma.lol/';
      headers['Origin'] = 'https://www.enma.lol';
      headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
    } else if (
      url.includes('tryembed.us.cc') ||
      url.includes('4animo.xyz') ||
      url.includes('vidhawk.buzz') ||
      url.includes('anixtv.pro') ||
      url.includes('flixera.co')
    ) {
      headers['Referer'] = 'https://www.enma.lol/';
      headers['Origin'] = 'https://www.enma.lol';
      headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
    } else if (url.includes('dramahot.top') || url.includes('anipixcdn.co') || url.includes('zokoanime.video')) {
      headers['Referer'] = 'https://zokoanime.video/';
      headers['Origin'] = 'https://zokoanime.video';
      headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
    } else if (
      url.includes('megaplay.buzz') ||
      url.includes('shiora.top') ||
      url.includes('nexabloom.top') ||
      url.includes('hiddenvertex.space') ||
      url.includes('qeltrix.top') ||
      url.includes('eclipseharbor.world') ||
      url.includes('tiktokcdn.com') ||
      url.includes('byteimg.com') ||
      url.includes('volans.space')
    ) {
      headers['Referer'] = 'https://megaplay.buzz/';
      headers['Origin'] = 'https://megaplay.buzz';
      headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
    } else if (
      url.includes('.m3u8') ||
      url.includes('.ts') ||
      url.includes('/hls/') ||
      url.includes('stream') ||
      url.includes('cdn') ||
      url.includes('anime')
    ) {
      try {
        const parsed = new URL(url);
        headers['Referer'] = `${parsed.protocol}//${parsed.host}/`;
        headers['Origin'] = `${parsed.protocol}//${parsed.host}`;
      } catch {
        headers['Referer'] = 'https://zokoanime.video/';
      }
      headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
    }

    callback({ requestHeaders: headers });
  });

  // Remove restrictive CSP or frame blockers for embeds
  session.defaultSession.webRequest.onHeadersReceived({ urls: ['*://*/*'] }, (details, callback) => {
    const responseHeaders = { ...details.responseHeaders };
    delete responseHeaders['x-frame-options'];
    delete responseHeaders['X-Frame-Options'];
    delete responseHeaders['content-security-policy'];
    delete responseHeaders['Content-Security-Policy'];
    
    // Ensure CORS allow origin
    responseHeaders['access-control-allow-origin'] = ['*'];
    responseHeaders['access-control-allow-headers'] = ['*'];

    callback({ responseHeaders });
  });

  const distPath = path.join(__dirname, '../dist/index.html');
  const hasDist = fs.existsSync(distPath);

  if (!isDev && hasDist) {
    // Production packaged app: Instant load from bundled local files
    mainWindow.loadFile(distPath);
  } else {
    isServerReachable('http://localhost:5173').then((isDevServerUp) => {
      if (!mainWindow) return;
      if (isDevServerUp) {
        log('Dev server detected, loading http://localhost:5173');
        mainWindow.loadURL('http://localhost:5173');
      } else if (hasDist) {
        log('Loading bundled production file:', distPath);
        mainWindow.loadFile(distPath);
      } else {
        log('Fallback: loading http://localhost:5173');
        mainWindow.loadURL('http://localhost:5173');
      }
    });
  }

  // Silent Background Auto-Update Check (runs 5s after startup)
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      appUpdater.checkForUpdates().then((updateInfo) => {
        if (updateInfo.hasUpdate && mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('app-update-available', updateInfo);
        }
      }).catch(() => {});
    }
  }, 5000);

  mainWindow.once('ready-to-show', () => {
    log('ready-to-show event received!');
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) {
      mainWindow.show();
      mainWindow.focus();
    }
  }, 1000);

  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window-state-change', true);
  });

  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window-state-change', false);
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('close', () => {
    console.log('[MAIN] Window close event triggered');
  });

  mainWindow.webContents.on('render-process-gone', (_e, details) => {
    console.error('[MAIN] Render process gone:', details);
  });

  mainWindow.on('closed', () => {
    console.log('[MAIN] Window closed');
    mainWindow = null;
  });
}

// Window control IPCs
ipcMain.handle('window-minimize', () => {
  mainWindow?.minimize();
});

ipcMain.handle('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
  return mainWindow?.isMaximized();
});

ipcMain.handle('window-close', () => {
  mainWindow?.close();
});

ipcMain.handle('window-is-maximized', () => {
  return mainWindow?.isMaximized();
});

// --- ANIDESK High-Speed Download Engine Handlers ---
ipcMain.handle('download-start', async (_event, params) => {
  try {
    return await downloader.startDownload(params, mainWindow);
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('download-cancel', (_event, id: string) => {
  downloader.cancel(id);
  return { success: true };
});

ipcMain.handle('download-open-folder', (_event, filePath?: string) => {
  if (filePath && fs.existsSync(filePath)) {
    shell.showItemInFolder(filePath);
  } else {
    shell.openPath(downloader.getDownloadDir());
  }
  return { success: true };
});

ipcMain.handle('download-open-dir', () => {
  shell.openPath(downloader.getDownloadDir());
  return { success: true };
});

ipcMain.handle('download-get-dir', () => {
  return downloader.getDownloadDir();
});

ipcMain.handle('download-select-directory', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Choose Anime Download Folder',
    properties: ['openDirectory', 'createDirectory'],
    defaultPath: downloader.getDownloadDir(),
    buttonLabel: 'Select Folder',
  });
  if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
    return null;
  }
  const chosenPath = result.filePaths[0];
  downloader.setDownloadDir(chosenPath);
  return chosenPath;
});

ipcMain.handle('download-set-dir', (_event, dir: string) => {
  return downloader.setDownloadDir(dir);
});

ipcMain.handle('download-reset-dir', () => {
  return downloader.resetDownloadDir();
});

ipcMain.handle('download-delete-file', async (_event, filePath: string) => {
  try {
    if (filePath && fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
    const subVtt = filePath.replace(/\.mp4$/, '.vtt');
    if (fs.existsSync(subVtt)) {
      await fs.promises.unlink(subVtt);
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// Fallback legacy download episode file handler
ipcMain.handle('download-file', async (_event, { url, filename, headers }: { url: string; filename: string; headers?: Record<string, string> }) => {
  try {
    const defaultPath = path.join(downloader.getDownloadDir(), filename);
    const { filePath, canceled } = await dialog.showSaveDialog({
      title: 'Save Episode',
      defaultPath,
    });

    if (canceled || !filePath) {
      return { success: false, canceled: true };
    }

    const response = await fetch(url, {
      headers: headers || {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://zokoanime.video/',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.promises.writeFile(filePath, buffer);

    return { success: true, filePath };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// --- ANIDESK Auto-Updater IPC Handlers ---
ipcMain.handle('app-get-version', () => {
  return app.getVersion();
});

ipcMain.handle('app-check-update', async (_event, customRepo?: string) => {
  return await appUpdater.checkForUpdates(customRepo);
});

ipcMain.handle('app-download-update', async (_event, downloadUrl: string) => {
  return await appUpdater.downloadAndInstall(downloadUrl, mainWindow);
});

app.whenReady().then(createWindow);

app.on('will-quit', () => {
  console.log('[MAIN] app will-quit');
});

app.on('quit', (_e, exitCode) => {
  console.log('[MAIN] app quit with code', exitCode);
});

app.on('window-all-closed', () => {
  console.log('[MAIN] window-all-closed');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
