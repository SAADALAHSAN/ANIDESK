import { contextBridge, ipcRenderer } from 'electron';

export interface StartDownloadParams {
  id: string;
  animeTitle: string;
  episodeNumber: number;
  episodeTitle?: string;
  streamUrl: string;
  headers?: Record<string, string>;
  quality?: string;
  subtitles?: Array<{ lang: string; label: string; url: string; default?: boolean }>;
  customDir?: string;
}

export interface DownloadProgressEvent {
  id: string;
  filename: string;
  progress: number;
  receivedBytes: number;
  totalBytes: number;
  speed: string;
  state: 'progressing' | 'completed' | 'failed' | 'cancelled';
  savePath?: string;
  error?: string;
}

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

export interface UpdateProgressEvent {
  percent: number;
  receivedBytes: number;
  totalBytes: number;
  speed: string;
  state: 'downloading' | 'completed' | 'failed';
  error?: string;
}

export interface ElectronAPI {
  minimize: () => Promise<void>;
  maximize: () => Promise<boolean>;
  close: () => Promise<void>;
  isMaximized: () => Promise<boolean>;
  onWindowStateChange: (callback: (isMaximized: boolean) => void) => () => void;
  downloadFile: (params: { url: string; filename: string; headers?: Record<string, string> }) => Promise<{ success: boolean; filePath?: string; error?: string; canceled?: boolean }>;

  // ANIDESK High-Speed Download Engine APIs
  startDownload: (params: StartDownloadParams) => Promise<{ success: boolean; filePath?: string; error?: string }>;
  cancelDownload: (id: string) => Promise<{ success: boolean }>;
  openDownloadFolder: (filePath?: string) => Promise<{ success: boolean }>;
  openDownloadsDir: () => Promise<{ success: boolean }>;
  getDownloadsDir: () => Promise<string>;
  selectDownloadDirectory: () => Promise<string | null>;
  setDownloadsDir: (dir: string) => Promise<boolean>;
  resetDownloadsDir: () => Promise<string>;
  deleteDownloadFile: (filePath: string) => Promise<{ success: boolean; error?: string }>;
  onDownloadProgress: (callback: (event: DownloadProgressEvent) => void) => () => void;

  // Auto-Updater APIs
  getAppVersion: () => Promise<string>;
  checkForUpdates: (repo?: string) => Promise<UpdateInfo>;
  downloadAndInstallUpdate: (downloadUrl: string) => Promise<{ success: boolean; error?: string }>;
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => () => void;
  onUpdateDownloadProgress: (callback: (event: UpdateProgressEvent) => void) => () => void;
}

const api: ElectronAPI = {
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close: () => ipcRenderer.invoke('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  onWindowStateChange: (callback: (isMaximized: boolean) => void) => {
    const handler = (_event: any, isMax: boolean) => callback(isMax);
    ipcRenderer.on('window-state-change', handler);
    return () => {
      ipcRenderer.removeListener('window-state-change', handler);
    };
  },
  downloadFile: (params) => ipcRenderer.invoke('download-file', params),

  startDownload: (params) => ipcRenderer.invoke('download-start', params),
  cancelDownload: (id) => ipcRenderer.invoke('download-cancel', id),
  openDownloadFolder: (filePath) => ipcRenderer.invoke('download-open-folder', filePath),
  openDownloadsDir: () => ipcRenderer.invoke('download-open-dir'),
  getDownloadsDir: () => ipcRenderer.invoke('download-get-dir'),
  selectDownloadDirectory: () => ipcRenderer.invoke('download-select-directory'),
  setDownloadsDir: (dir) => ipcRenderer.invoke('download-set-dir', dir),
  resetDownloadsDir: () => ipcRenderer.invoke('download-reset-dir'),
  deleteDownloadFile: (filePath) => ipcRenderer.invoke('download-delete-file', filePath),
  onDownloadProgress: (callback) => {
    const handler = (_event: any, data: DownloadProgressEvent) => callback(data);
    ipcRenderer.on('download-progress', handler);
    return () => {
      ipcRenderer.removeListener('download-progress', handler);
    };
  },

  // Auto-Updater
  getAppVersion: () => ipcRenderer.invoke('app-get-version'),
  checkForUpdates: (repo?: string) => ipcRenderer.invoke('app-check-update', repo),
  downloadAndInstallUpdate: (downloadUrl: string) => ipcRenderer.invoke('app-download-update', downloadUrl),
  onUpdateAvailable: (callback) => {
    const handler = (_event: any, data: UpdateInfo) => callback(data);
    ipcRenderer.on('app-update-available', handler);
    return () => {
      ipcRenderer.removeListener('app-update-available', handler);
    };
  },
  onUpdateDownloadProgress: (callback) => {
    const handler = (_event: any, data: UpdateProgressEvent) => callback(data);
    ipcRenderer.on('update-download-progress', handler);
    return () => {
      ipcRenderer.removeListener('update-download-progress', handler);
    };
  },
};

contextBridge.exposeInMainWorld('electronAPI', api);
