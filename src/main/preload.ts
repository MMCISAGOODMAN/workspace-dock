import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/types';

const api = {
  getBookmarks: () => ipcRenderer.invoke(IPC_CHANNELS.GET_BOOKMARKS),
  saveBookmarks: (bookmarks: unknown) => ipcRenderer.invoke(IPC_CHANNELS.SAVE_BOOKMARKS, bookmarks),
  exportBookmarks: () => ipcRenderer.invoke(IPC_CHANNELS.EXPORT_BOOKMARKS),
  importBookmarks: (mode?: 'replace' | 'merge') =>
    ipcRenderer.invoke(IPC_CHANNELS.IMPORT_BOOKMARKS, mode),
  exportSnapshots: () => ipcRenderer.invoke(IPC_CHANNELS.EXPORT_SNAPSHOTS),
  importSnapshots: () => ipcRenderer.invoke(IPC_CHANNELS.IMPORT_SNAPSHOTS),
  getSnapshots: () => ipcRenderer.invoke(IPC_CHANNELS.GET_SNAPSHOTS),
  saveSnapshot: (snapshot: unknown) => ipcRenderer.invoke(IPC_CHANNELS.SAVE_SNAPSHOT, snapshot),
  deleteSnapshot: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.DELETE_SNAPSHOT, id),
  getTempFavorites: () => ipcRenderer.invoke(IPC_CHANNELS.GET_TEMP_FAVORITES),
  saveTempFavorite: (favorite: unknown) =>
    ipcRenderer.invoke(IPC_CHANNELS.SAVE_TEMP_FAVORITE, favorite),
  deleteTempFavorite: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.DELETE_TEMP_FAVORITE, id),
  getFavoriteApps: () => ipcRenderer.invoke(IPC_CHANNELS.GET_FAVORITE_APPS),
  saveFavoriteApp: (app: unknown) => ipcRenderer.invoke(IPC_CHANNELS.SAVE_FAVORITE_APP, app),
  deleteFavoriteApp: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.DELETE_FAVORITE_APP, id),
  reorderFavoriteApps: (ids: string[]) =>
    ipcRenderer.invoke(IPC_CHANNELS.REORDER_FAVORITE_APPS, ids),
  launchFavoriteApp: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.LAUNCH_FAVORITE_APP, id),
  launchAllFavoriteApps: () => ipcRenderer.invoke(IPC_CHANNELS.LAUNCH_ALL_FAVORITE_APPS),
  browseFavoriteApp: () => ipcRenderer.invoke(IPC_CHANNELS.BROWSE_FAVORITE_APP),
  getFavoriteAppIcons: (apps: unknown) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_FAVORITE_APP_ICONS, apps),
  getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.GET_SETTINGS),
  saveSettings: (settings: unknown) => ipcRenderer.invoke(IPC_CHANNELS.SAVE_SETTINGS, settings),
  getRecentHosts: () => ipcRenderer.invoke(IPC_CHANNELS.GET_RECENT_HOSTS),
  sshConnect: (options: unknown) => ipcRenderer.invoke(IPC_CHANNELS.SSH_CONNECT, options),
  sshBatchConnect: (payload: unknown) =>
    ipcRenderer.invoke(IPC_CHANNELS.SSH_BATCH_CONNECT, payload),
  sshBatchExec: (payload: unknown) => ipcRenderer.invoke(IPC_CHANNELS.SSH_BATCH_EXEC, payload),
  sshCheckOnline: (params: { ip: string; port: number }) =>
    ipcRenderer.invoke(IPC_CHANNELS.SSH_CHECK_ONLINE, params),
  terminalOpen: (options: unknown) => ipcRenderer.invoke(IPC_CHANNELS.TERMINAL_OPEN, options),
  terminalNewWindow: () => ipcRenderer.invoke(IPC_CHANNELS.TERMINAL_NEW_WINDOW),
  terminalGetLayout: () => ipcRenderer.invoke(IPC_CHANNELS.TERMINAL_GET_LAYOUT),
  terminalGetAllLayouts: () => ipcRenderer.invoke(IPC_CHANNELS.TERMINAL_GET_ALL_LAYOUTS),
  terminalApplyLayout: (layout: unknown) =>
    ipcRenderer.invoke(IPC_CHANNELS.TERMINAL_APPLY_LAYOUT, layout),
  sshKeysList: () => ipcRenderer.invoke(IPC_CHANNELS.SSH_KEYS_LIST),
  sshKeyBrowse: () => ipcRenderer.invoke(IPC_CHANNELS.SSH_KEY_BROWSE),
  sshSetPassphrase: (passphrase: string, remember?: boolean) =>
    ipcRenderer.invoke(IPC_CHANNELS.SSH_SET_PASSPHRASE, { passphrase, remember }),
  sshClearPassphrase: () => ipcRenderer.invoke(IPC_CHANNELS.SSH_CLEAR_PASSPHRASE),
  sshHasPassphrase: () => ipcRenderer.invoke(IPC_CHANNELS.SSH_HAS_PASSPHRASE),
  sshKeyNeedsPassphrase: (keyPath?: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.SSH_KEY_NEEDS_PASSPHRASE, keyPath),
  copyToClipboard: (text: string) => ipcRenderer.invoke(IPC_CHANNELS.COPY_TO_CLIPBOARD, text),
  getClipboardHost: () => ipcRenderer.invoke(IPC_CHANNELS.GET_CLIPBOARD_HOST),
  dismissClipboardHost: () => ipcRenderer.invoke(IPC_CHANNELS.DISMISS_CLIPBOARD_HOST),
  captureScreenshot: () => ipcRenderer.invoke(IPC_CHANNELS.SCREENSHOT_CAPTURE),
  togglePanel: () => ipcRenderer.invoke(IPC_CHANNELS.PANEL_TOGGLE),
  setPanelExpanded: (expanded: boolean) =>
    ipcRenderer.invoke(IPC_CHANNELS.PANEL_SET_EXPANDED, expanded),
  getPanelState: () => ipcRenderer.invoke(IPC_CHANNELS.GET_PANEL_STATE),
  registerActiveSessions: (sessions: unknown) =>
    ipcRenderer.invoke(IPC_CHANNELS.REGISTER_ACTIVE_SESSIONS, sessions),
  syncPush: (url?: string) => ipcRenderer.invoke(IPC_CHANNELS.SYNC_PUSH, url),
  syncPull: (url?: string) => ipcRenderer.invoke(IPC_CHANNELS.SYNC_PULL, url),
  syncStartServer: (port?: number) => ipcRenderer.invoke(IPC_CHANNELS.SYNC_START_SERVER, port),
  syncStopServer: () => ipcRenderer.invoke(IPC_CHANNELS.SYNC_STOP_SERVER),
  syncStatus: () => ipcRenderer.invoke(IPC_CHANNELS.SYNC_STATUS),
  onPanelStateChanged: (callback: (expanded: boolean) => void) => {
    const handler = (_: unknown, expanded: boolean) => callback(expanded);
    ipcRenderer.on(IPC_CHANNELS.ON_PANEL_STATE_CHANGED, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.ON_PANEL_STATE_CHANGED, handler);
  },
  onPanelToggleRequest: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on(IPC_CHANNELS.PANEL_TOGGLE_REQUEST, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.PANEL_TOGGLE_REQUEST, handler);
  },
  onOpenSearch: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on(IPC_CHANNELS.ON_OPEN_SEARCH, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.ON_OPEN_SEARCH, handler);
  },
  onEnvBorderChanged: (callback: (envType: string) => void) => {
    const handler = (_: unknown, envType: string) => callback(envType);
    ipcRenderer.on(IPC_CHANNELS.SET_ENV_BORDER, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.SET_ENV_BORDER, handler);
  },
  onAutoSnapshot: (callback: (snapshot: unknown) => void) => {
    const handler = (_: unknown, snapshot: unknown) => callback(snapshot);
    ipcRenderer.on(IPC_CHANNELS.ON_AUTO_SNAPSHOT, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.ON_AUTO_SNAPSHOT, handler);
  },
  onClipboardHostChanged: (callback: (suggestion: unknown) => void) => {
    const handler = (_: unknown, suggestion: unknown) => callback(suggestion);
    ipcRenderer.on(IPC_CHANNELS.ON_CLIPBOARD_HOST_CHANGED, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.ON_CLIPBOARD_HOST_CHANGED, handler);
  },
  onScreenshotDone: (callback: (result: { success: boolean; error?: string }) => void) => {
    const handler = (_: unknown, result: { success: boolean; error?: string }) => callback(result);
    ipcRenderer.on(IPC_CHANNELS.ON_SCREENSHOT_DONE, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.ON_SCREENSHOT_DONE, handler);
  },
};

contextBridge.exposeInMainWorld('electronAPI', api);

export type ElectronAPI = typeof api;

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
