import { ipcMain, BrowserWindow, clipboard, screen, dialog } from 'electron';
import fs from 'fs';
import {
  IPC_CHANNELS,
  SSHConnectOptions,
  BatchExecHost,
  BookmarkTree,
  mergeBookmarkTrees,
  TerminalWindowLayout,
  SnapshotLayout,
  getDockWindowBounds,
  FavoriteApp,
  Snapshot,
} from '../../shared/types';
import {
  getBookmarks,
  saveBookmarks,
  getSnapshots,
  saveSnapshot,
  deleteSnapshot,
  getTempFavorites,
  saveTempFavorite,
  deleteTempFavorite,
  getFavoriteApps,
  saveFavoriteApp,
  deleteFavoriteApp,
  reorderFavoriteApps,
  importSnapshots,
  getSettings,
  saveSettings,
  getRecentHosts,
  addRecentHost,
  updateHostLastPath,
} from '../store/database';
import {
  connectSSH,
  batchConnectSSH,
  checkHostOnline,
  getSSHCommandString,
} from '../ssh/manager';
import { batchExec } from '../ssh/connection';
import { openTerminalSession, registerTerminalIpc, openTerminalSessionsBatch } from '../terminal/manager';
import { listSSHKeys, getActiveKeyPath } from '../ssh/keys';
import {
  getPassphrase,
  setPassphrase,
  clearPassphrase,
  hasPassphrase,
  isPrivateKeyEncrypted,
  isPassphraseError,
} from '../ssh/passphrase';
import {
  getSyncStatus,
  startSyncServer,
  stopSyncServer,
  pullBookmarks,
  pushBookmarks,
} from '../sync/server';
import {
  registerActiveSessions,
  restartAutoSnapshot,
  setAutoSnapshotWindow,
} from '../auto-snapshot';
import {
  getClipboardHostSuggestion,
  startClipboardWatcher,
  markClipboardWrite,
  dismissClipboardHost,
  syncClipboardToRenderer,
} from '../clipboard/watcher';
import { startRegionScreenshot } from '../screenshot/overlay';
import { launchFavoriteApp, launchAllFavoriteApps } from '../apps/launcher';
import { getFavoriteAppIcons, clearFavoriteAppIconCache } from '../apps/icons';

let mainWindow: BrowserWindow | null = null;
let panelExpanded = false;

type ScreenshotResult = { success: boolean; error?: string; cancelled?: boolean };

function notifyScreenshotResult(result: ScreenshotResult): void {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (result.success) {
    mainWindow.webContents.send(IPC_CHANNELS.ON_SCREENSHOT_DONE, { success: true });
  } else if (!result.cancelled && result.error) {
    mainWindow.webContents.send(IPC_CHANNELS.ON_SCREENSHOT_DONE, {
      success: false,
      error: result.error,
    });
  }
}

export async function triggerScreenshotCapture(): Promise<ScreenshotResult> {
  const result = await startRegionScreenshot(() => mainWindow);
  notifyScreenshotResult(result);
  return result;
}

export function setMainWindow(win: BrowserWindow): void {
  mainWindow = win;
  setAutoSnapshotWindow(win);
  win.webContents.on('did-finish-load', () => {
    syncClipboardToRenderer(win);
  });
}

export function getPanelExpanded(): boolean {
  return panelExpanded;
}

export function setPanelExpanded(expanded: boolean): void {
  if (panelExpanded === expanded) return;
  panelExpanded = expanded;
  if (mainWindow) {
    resizeWindow(expanded);
  }
}

function resizeWindow(expanded: boolean): void {
  if (!mainWindow) return;

  const settings = getSettings();
  const display = screen.getDisplayNearestPoint(mainWindow.getBounds());
  const target = getDockWindowBounds(
    expanded,
    display.workArea,
    settings.dockWidth,
    settings.panelWidth,
  );

  mainWindow.setBounds(target);
}

async function handleConnect(options: SSHConnectOptions): Promise<{ success: boolean; error?: string; needsPassphrase?: boolean }> {
  const settings = getSettings();

  if (isPrivateKeyEncrypted(settings.sshKeyPath) && !getPassphrase()) {
    return { success: false, error: 'SSH 密钥已加密，请输入密码短语', needsPassphrase: true };
  }

  try {
    if (settings.useBuiltInTerminal) {
      await openTerminalSession(options);
    } else {
      await connectSSH(options);
    }

    if (options.hostId) {
      addRecentHost({
        hostId: options.hostId,
        hostName: options.hostName ?? options.ip,
        ip: options.ip,
        port: options.port,
        username: options.username,
        projectName: options.projectName,
        environmentName: options.environmentName,
      });
      if (options.path) {
        updateHostLastPath(options.hostId, options.path);
      }
    }

    if (settings.windowBorderEnabled && options.environmentType) {
      mainWindow?.webContents.send(IPC_CHANNELS.SET_ENV_BORDER, options.environmentType);
    }

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'SSH 连接失败';
    return {
      success: false,
      error: message,
      needsPassphrase: isPassphraseError(message),
    };
  }
}

export function registerIpcHandlers(): void {
  registerTerminalIpc();

  ipcMain.handle(IPC_CHANNELS.GET_BOOKMARKS, () => getBookmarks());
  ipcMain.handle(IPC_CHANNELS.SAVE_BOOKMARKS, (_e, bookmarks) => {
    saveBookmarks(bookmarks);
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.EXPORT_BOOKMARKS, async () => {
    const result = await dialog.showSaveDialog(mainWindow!, {
      title: '导出书签',
      defaultPath: 'workspace-dock-bookmarks.json',
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (result.canceled || !result.filePath) return { success: false };
    fs.writeFileSync(result.filePath, JSON.stringify(getBookmarks(), null, 2), 'utf-8');
    return { success: true, path: result.filePath };
  });

  ipcMain.handle(IPC_CHANNELS.IMPORT_BOOKMARKS, async (_e, mode: 'replace' | 'merge' = 'merge') => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: '导入书签',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile'],
    });
    if (result.canceled || !result.filePaths[0]) return { success: false };
    const data = JSON.parse(fs.readFileSync(result.filePaths[0], 'utf-8')) as BookmarkTree;
    const merged =
      mode === 'replace' ? data : mergeBookmarkTrees(getBookmarks(), data);
    saveBookmarks(merged);
    return { success: true, bookmarks: merged };
  });

  ipcMain.handle(IPC_CHANNELS.EXPORT_SNAPSHOTS, async () => {
    const result = await dialog.showSaveDialog(mainWindow!, {
      title: '导出快照',
      defaultPath: 'workspace-dock-snapshots.json',
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (result.canceled || !result.filePath) return { success: false };
    fs.writeFileSync(result.filePath, JSON.stringify(getSnapshots(), null, 2), 'utf-8');
    return { success: true, path: result.filePath };
  });

  ipcMain.handle(IPC_CHANNELS.IMPORT_SNAPSHOTS, async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: '导入快照',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile'],
    });
    if (result.canceled || !result.filePaths[0]) return { success: false };
    try {
      const raw = JSON.parse(fs.readFileSync(result.filePaths[0], 'utf-8'));
      const incoming = (Array.isArray(raw) ? raw : raw.snapshots) as Snapshot[];
      if (!Array.isArray(incoming)) {
        return { success: false, error: '无效的快照文件格式' };
      }
      const snapshots = importSnapshots(incoming);
      return { success: true, snapshots };
    } catch {
      return { success: false, error: '无法解析快照文件' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.GET_SNAPSHOTS, () => getSnapshots());
  ipcMain.handle(IPC_CHANNELS.SAVE_SNAPSHOT, (_e, snapshot) => {
    saveSnapshot(snapshot);
    return true;
  });
  ipcMain.handle(IPC_CHANNELS.DELETE_SNAPSHOT, (_e, id: string) => {
    deleteSnapshot(id);
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.GET_TEMP_FAVORITES, () => getTempFavorites());
  ipcMain.handle(IPC_CHANNELS.SAVE_TEMP_FAVORITE, (_e, favorite) => saveTempFavorite(favorite));
  ipcMain.handle(IPC_CHANNELS.DELETE_TEMP_FAVORITE, (_e, id: string) => {
    deleteTempFavorite(id);
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.GET_FAVORITE_APPS, () => getFavoriteApps());
  ipcMain.handle(
    IPC_CHANNELS.SAVE_FAVORITE_APP,
    (_e, app: Omit<FavoriteApp, 'id' | 'sortOrder' | 'createdAt'> & { id?: string }) => {
      if (app.id) {
        const existing = getFavoriteApps().find((a) => a.id === app.id);
        if (existing && (existing.type !== app.type || existing.target !== app.target)) {
          clearFavoriteAppIconCache(existing.type, existing.target);
        }
      }
      clearFavoriteAppIconCache(app.type, app.target);
      return saveFavoriteApp(app);
    },
  );
  ipcMain.handle(IPC_CHANNELS.DELETE_FAVORITE_APP, (_e, id: string) => {
    const existing = getFavoriteApps().find((a) => a.id === id);
    if (existing) clearFavoriteAppIconCache(existing.type, existing.target);
    deleteFavoriteApp(id);
    return true;
  });
  ipcMain.handle(IPC_CHANNELS.REORDER_FAVORITE_APPS, (_e, ids: string[]) => {
    reorderFavoriteApps(ids);
    return getFavoriteApps();
  });
  ipcMain.handle(IPC_CHANNELS.LAUNCH_FAVORITE_APP, async (_e, id: string) => {
    try {
      const app = getFavoriteApps().find((a) => a.id === id);
      if (!app) return { success: false, error: '应用不存在' };
      return await launchFavoriteApp(app);
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : '启动失败',
      };
    }
  });
  ipcMain.handle(IPC_CHANNELS.LAUNCH_ALL_FAVORITE_APPS, async () => {
    try {
      return await launchAllFavoriteApps(getFavoriteApps());
    } catch (err) {
      return {
        launched: 0,
        failed: getFavoriteApps().length,
        errors: [err instanceof Error ? err.message : '批量启动失败'],
      };
    }
  });
  ipcMain.handle(IPC_CHANNELS.BROWSE_FAVORITE_APP, async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: '选择应用',
      properties: process.platform === 'darwin' ? ['openFile', 'openDirectory'] : ['openFile'],
      filters: [
        { name: 'Applications', extensions: ['app', 'exe', 'sh', 'AppImage'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    if (result.canceled || !result.filePaths[0]) return { success: false };
    return { success: true, path: result.filePaths[0] };
  });
  ipcMain.handle(
    IPC_CHANNELS.GET_FAVORITE_APP_ICONS,
    async (_e, apps: Pick<FavoriteApp, 'id' | 'type' | 'target'>[]) => {
      try {
        return await getFavoriteAppIcons(apps);
      } catch {
        return {};
      }
    },
  );

  ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, () => getSettings());
  ipcMain.handle(IPC_CHANNELS.SAVE_SETTINGS, (_e, settings) => {
    const merged = saveSettings(settings);
    restartAutoSnapshot();
    if (merged.syncLocalServerEnabled) {
      startSyncServer(merged.syncServerPort).catch(() => {});
    } else {
      stopSyncServer();
    }
    return merged;
  });

  ipcMain.handle(IPC_CHANNELS.GET_RECENT_HOSTS, () => getRecentHosts());

  ipcMain.handle(IPC_CHANNELS.SSH_CONNECT, (_e, options: SSHConnectOptions) =>
    handleConnect(options),
  );

  ipcMain.handle(
    IPC_CHANNELS.SSH_BATCH_CONNECT,
    async (
      _e,
      payload:
        | SSHConnectOptions[]
        | {
            sessions: SSHConnectOptions[];
            layout?: TerminalWindowLayout | SnapshotLayout;
          },
    ) => {
      const sessions = Array.isArray(payload) ? payload : payload.sessions;
      const layout = Array.isArray(payload) ? undefined : payload.layout;
      const settings = getSettings();
      if (isPrivateKeyEncrypted(settings.sshKeyPath) && !getPassphrase()) {
        return {
          success: false,
          error: 'SSH 密钥已加密，请输入密码短语',
          needsPassphrase: true,
        };
      }
      try {
        if (settings.useBuiltInTerminal) {
          const batchLayout =
            layout && 'terminals' in layout
              ? layout
              : layout && 'x' in layout
                ? (layout as TerminalWindowLayout)
                : undefined;
          await openTerminalSessionsBatch(sessions, batchLayout);
        } else {
          await batchConnectSSH(sessions);
        }
        for (const session of sessions) {
          if (session.hostId) {
            addRecentHost({
              hostId: session.hostId,
              hostName: session.hostName ?? session.ip,
              ip: session.ip,
              port: session.port,
              username: session.username,
              projectName: session.projectName,
              environmentName: session.environmentName,
            });
            if (session.path) updateHostLastPath(session.hostId, session.path);
          }
        }
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : '批量 SSH 连接失败',
        };
      }
    },
  );

  ipcMain.handle(IPC_CHANNELS.SSH_KEYS_LIST, () => ({
    keys: listSSHKeys(),
    activePath: getActiveKeyPath(),
  }));

  ipcMain.handle(IPC_CHANNELS.SSH_KEY_BROWSE, async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: '选择 SSH 私钥',
      defaultPath: `${process.env.HOME ?? ''}/.ssh`,
      filters: [{ name: 'SSH Key', extensions: ['*'] }],
      properties: ['openFile'],
    });
    if (result.canceled || !result.filePaths[0]) return { success: false };
    return { success: true, path: result.filePaths[0] };
  });

  ipcMain.handle(
    IPC_CHANNELS.SSH_SET_PASSPHRASE,
    (_e, payload: { passphrase: string; remember?: boolean }) => {
      setPassphrase(payload.passphrase, payload.remember ?? false);
      return true;
    },
  );

  ipcMain.handle(IPC_CHANNELS.SSH_CLEAR_PASSPHRASE, () => {
    clearPassphrase();
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.SSH_HAS_PASSPHRASE, () => hasPassphrase());

  ipcMain.handle(IPC_CHANNELS.SSH_KEY_NEEDS_PASSPHRASE, (_e, keyPath?: string) =>
    isPrivateKeyEncrypted(keyPath),
  );

  ipcMain.handle(
    IPC_CHANNELS.SSH_BATCH_EXEC,
    async (_e, { hosts, command }: { hosts: BatchExecHost[]; command: string }) => {
      return batchExec(hosts, command);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.SSH_CHECK_ONLINE,
    async (_e, { ip, port }: { ip: string; port: number }) => checkHostOnline(ip, port),
  );

  ipcMain.handle(IPC_CHANNELS.COPY_TO_CLIPBOARD, (_e, text: string) => {
    markClipboardWrite(text);
    clipboard.writeText(text);
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.GET_CLIPBOARD_HOST, () => getClipboardHostSuggestion());

  ipcMain.handle(IPC_CHANNELS.DISMISS_CLIPBOARD_HOST, () => {
    dismissClipboardHost();
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.SCREENSHOT_CAPTURE, () => triggerScreenshotCapture());

  ipcMain.handle(IPC_CHANNELS.GET_PANEL_STATE, () => panelExpanded);
  ipcMain.handle(IPC_CHANNELS.PANEL_TOGGLE, () => {
    setPanelExpanded(!panelExpanded);
    return panelExpanded;
  });
  ipcMain.handle(IPC_CHANNELS.PANEL_SET_EXPANDED, (_e, expanded: boolean) => {
    setPanelExpanded(expanded);
    return panelExpanded;
  });

  ipcMain.handle(IPC_CHANNELS.REGISTER_ACTIVE_SESSIONS, (_e, sessions: SSHConnectOptions[]) => {
    registerActiveSessions(sessions);
  });

  ipcMain.handle(IPC_CHANNELS.SYNC_PUSH, async (_e, url?: string) => {
    const settings = getSettings();
    const target = url || settings.syncServerUrl;
    if (!target) throw new Error('未配置同步服务器地址');
    await pushBookmarks(target, getBookmarks());
    return { success: true };
  });

  ipcMain.handle(IPC_CHANNELS.SYNC_PULL, async (_e, url?: string) => {
    const settings = getSettings();
    const target = url || settings.syncServerUrl;
    if (!target) throw new Error('未配置同步服务器地址');
    const remote = await pullBookmarks(target);
    const merged = mergeBookmarkTrees(getBookmarks(), remote);
    saveBookmarks(merged);
    return { success: true, bookmarks: merged };
  });

  ipcMain.handle(IPC_CHANNELS.SYNC_START_SERVER, async (_e, port?: number) => {
    const settings = getSettings();
    await startSyncServer(port ?? settings.syncServerPort);
    return getSyncStatus();
  });

  ipcMain.handle(IPC_CHANNELS.SYNC_STOP_SERVER, () => {
    stopSyncServer();
    return getSyncStatus();
  });

  ipcMain.handle(IPC_CHANNELS.SYNC_STATUS, () => getSyncStatus());
}

export function getSSHCommand(options: SSHConnectOptions): string {
  return getSSHCommandString(options);
}

export function initBackgroundServices(): void {
  const settings = getSettings();
  if (settings.syncLocalServerEnabled) {
    startSyncServer(settings.syncServerPort).catch(() => {});
  }
  restartAutoSnapshot();
  startClipboardWatcher(() => mainWindow);
}
