import type {
  BookmarkTree,
  Snapshot,
  TempFavorite,
  FavoriteApp,
  LaunchAppResult,
  LaunchAllAppsResult,
  AppSettings,
  RecentHost,
  SSHConnectOptions,
  BatchExecHost,
  BatchExecResult,
  SyncStatus,
  EnvironmentType,
  SSHKeyInfo,
  TerminalWindowLayout,
  SnapshotLayout,
  ClipboardCapture,
} from '@shared/types';

export interface ElectronAPI {
  getBookmarks: () => Promise<BookmarkTree>;
  saveBookmarks: (bookmarks: BookmarkTree) => Promise<boolean>;
  exportBookmarks: () => Promise<{ success: boolean; path?: string }>;
  importBookmarks: (mode?: 'replace' | 'merge') => Promise<{ success: boolean; bookmarks?: BookmarkTree }>;
  exportSnapshots: () => Promise<{ success: boolean; path?: string }>;
  importSnapshots: () => Promise<{ success: boolean; snapshots?: Snapshot[]; error?: string }>;
  getSnapshots: () => Promise<Snapshot[]>;
  saveSnapshot: (snapshot: Snapshot) => Promise<boolean>;
  deleteSnapshot: (id: string) => Promise<boolean>;
  getTempFavorites: () => Promise<TempFavorite[]>;
  saveTempFavorite: (
    favorite: Omit<TempFavorite, 'id' | 'createdAt' | 'expiresAt'>,
  ) => Promise<TempFavorite>;
  deleteTempFavorite: (id: string) => Promise<boolean>;
  getFavoriteApps: () => Promise<FavoriteApp[]>;
  saveFavoriteApp: (
    app: Omit<FavoriteApp, 'id' | 'sortOrder' | 'createdAt'> & { id?: string },
  ) => Promise<FavoriteApp>;
  deleteFavoriteApp: (id: string) => Promise<boolean>;
  reorderFavoriteApps: (ids: string[]) => Promise<FavoriteApp[]>;
  launchFavoriteApp: (id: string) => Promise<LaunchAppResult>;
  launchAllFavoriteApps: () => Promise<LaunchAllAppsResult>;
  browseFavoriteApp: () => Promise<{ success: boolean; path?: string }>;
  getFavoriteAppIcons: (
    apps: Pick<FavoriteApp, 'id' | 'type' | 'target'>[],
  ) => Promise<Record<string, string | null>>;
  getSettings: () => Promise<AppSettings>;
  saveSettings: (settings: Partial<AppSettings>) => Promise<AppSettings>;
  getRecentHosts: () => Promise<RecentHost[]>;
  sshConnect: (options: SSHConnectOptions) => Promise<{ success: boolean; error?: string; needsPassphrase?: boolean }>;
  sshBatchConnect: (
    payload:
      | SSHConnectOptions[]
      | { sessions: SSHConnectOptions[]; layout?: TerminalWindowLayout | SnapshotLayout },
  ) => Promise<{ success: boolean; error?: string; needsPassphrase?: boolean }>;
  sshBatchExec: (payload: {
    hosts: BatchExecHost[];
    command: string;
  }) => Promise<BatchExecResult[]>;
  sshCheckOnline: (params: { ip: string; port: number }) => Promise<boolean>;
  terminalOpen: (options: SSHConnectOptions) => Promise<string>;
  terminalNewWindow: () => Promise<string>;
  terminalGetLayout: () => Promise<TerminalWindowLayout | null>;
  terminalGetAllLayouts: () => Promise<TerminalWindowLayout[]>;
  terminalApplyLayout: (layout: TerminalWindowLayout) => Promise<void>;
  sshKeysList: () => Promise<{ keys: SSHKeyInfo[]; activePath?: string }>;
  sshKeyBrowse: () => Promise<{ success: boolean; path?: string }>;
  sshSetPassphrase: (passphrase: string, remember?: boolean) => Promise<boolean>;
  sshClearPassphrase: () => Promise<boolean>;
  sshHasPassphrase: () => Promise<boolean>;
  sshKeyNeedsPassphrase: (keyPath?: string) => Promise<boolean>;
  copyToClipboard: (text: string) => Promise<boolean>;
  getClipboardHost: () => Promise<ClipboardCapture | null>;
  dismissClipboardHost: () => Promise<boolean>;
  captureScreenshot: () => Promise<{ success: boolean; error?: string; cancelled?: boolean }>;
  togglePanel: () => Promise<boolean>;
  setPanelExpanded: (expanded: boolean) => Promise<boolean>;
  getPanelState: () => Promise<boolean>;
  registerActiveSessions: (sessions: SSHConnectOptions[]) => Promise<void>;
  syncPush: (url?: string) => Promise<{ success: boolean }>;
  syncPull: (url?: string) => Promise<{ success: boolean; bookmarks?: BookmarkTree }>;
  syncStartServer: (port?: number) => Promise<SyncStatus>;
  syncStopServer: () => Promise<SyncStatus>;
  syncStatus: () => Promise<SyncStatus>;
  onPanelStateChanged: (callback: (expanded: boolean) => void) => () => void;
  onPanelToggleRequest: (callback: () => void) => () => void;
  onOpenSearch: (callback: () => void) => () => void;
  onEnvBorderChanged: (callback: (envType: EnvironmentType) => void) => () => void;
  onAutoSnapshot: (callback: (snapshot: Snapshot) => void) => () => void;
  onClipboardHostChanged: (callback: (capture: ClipboardCapture | null) => void) => () => void;
  onScreenshotDone: (callback: (result: { success: boolean; error?: string }) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export function getAPI(): ElectronAPI {
  return window.electronAPI;
}
