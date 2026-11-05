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

  // Downloads
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

  // Auto-Updater
  getAppVersion: () => Promise<string>;
  checkForUpdates: (repo?: string) => Promise<UpdateInfo>;
  downloadAndInstallUpdate: (downloadUrl: string) => Promise<{ success: boolean; error?: string }>;
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => () => void;
  onUpdateDownloadProgress: (callback: (event: UpdateProgressEvent) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
