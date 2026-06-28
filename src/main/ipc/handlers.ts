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

let mainWindow: BrowserWindow | null = null;
let panelExpanded = false;

export function setMainWindow(win: BrowserWindow): void {
  mainWindow = win;
  setAutoSnapshotWindow(win);
}

export function getPanelExpanded(): boolean {
  return panelExpanded;
}

export function setPanelExpanded(expanded: boolean): void {
  panelExpanded = expanded;
  if (mainWindow) {
    resizeWindow(expanded);
    mainWindow.webContents.send(IPC_CHANNELS.ON_PANEL_STATE_CHANGED, expanded);
  }
}

function resizeWindow(expanded: boolean): void {
  if (!mainWindow) return;

  const settings = getSettings();
  const display = screen.getDisplayNearestPoint(mainWindow.getBounds());
  const { width: screenWidth, height: screenHeight } = display.workArea;
  const { x: screenX, y: screenY } = display.workArea;

  const dockWidth = settings.dockWidth;
  const panelWidth = settings.panelWidth;
  const totalWidth = expanded ? dockWidth + panelWidth : dockWidth;

  mainWindow.setBounds({
    x: screenX + screenWidth - totalWidth,
    y: screenY,
    width: totalWidth,
    height: screenHeight,
  });
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
    clipboard.writeText(text);
    return true;
  });

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
}
