import { BrowserWindow } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import { IPC_CHANNELS, SSHConnectOptions, Snapshot } from '../shared/types';
import { getSettings, saveSnapshot } from './store/database';
import { getAllTerminalLayouts } from './terminal/manager';

let activeSessions: SSHConnectOptions[] = [];
let timer: ReturnType<typeof setInterval> | null = null;
let mainWindow: BrowserWindow | null = null;

export function setAutoSnapshotWindow(win: BrowserWindow): void {
  mainWindow = win;
}

export function registerActiveSessions(sessions: SSHConnectOptions[]): void {
  activeSessions = sessions;
}

export function startAutoSnapshot(): void {
  stopAutoSnapshot();
  const settings = getSettings();
  if (!settings.autoSnapshotEnabled) return;

  const intervalMs = settings.autoSnapshotIntervalMinutes * 60 * 1000;
  timer = setInterval(() => {
    if (activeSessions.length === 0) return;

    const terminalLayouts = getAllTerminalLayouts();

    const snapshot: Snapshot = {
      id: uuidv4(),
      name: `自动快照 ${new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}`,
      createdAt: new Date().toISOString(),
      sessions: activeSessions.map((s) => ({
        hostId: s.hostId ?? uuidv4(),
        hostName: s.hostName ?? s.ip,
        ip: s.ip,
        port: s.port,
        username: s.username,
        path: s.path ?? '/',
        projectName: s.projectName,
        environmentName: s.environmentName,
        environmentType: s.environmentType,
      })),
      layout:
        terminalLayouts.length > 0
          ? terminalLayouts.length === 1
            ? { terminal: terminalLayouts[0] }
            : { terminals: terminalLayouts }
          : undefined,
    };

    saveSnapshot(snapshot);
    mainWindow?.webContents.send(IPC_CHANNELS.ON_AUTO_SNAPSHOT, snapshot);
  }, intervalMs);
}

export function stopAutoSnapshot(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

export function restartAutoSnapshot(): void {
  stopAutoSnapshot();
  startAutoSnapshot();
}
