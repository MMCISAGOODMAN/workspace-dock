import { BrowserWindow, ipcMain, screen, type WebContents } from 'electron';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { Client, ClientChannel } from 'ssh2';
import {
  IPC_CHANNELS,
  SSHConnectOptions,
  TerminalSessionInfo,
  TerminalWindowLayout,
} from '../../shared/types';
import { createSSHConnection } from '../ssh/connection';

interface ActiveSession {
  info: TerminalSessionInfo;
  conn: Client;
  stream: ClientChannel;
  windowId: string;
}

interface TerminalWindowState {
  windowId: string;
  win: BrowserWindow;
  activeSessionId: string | null;
}

const sessions = new Map<string, ActiveSession>();
const terminalWindows = new Map<string, TerminalWindowState>();
const webContentsToWindowId = new Map<number, string>();
const isDev = process.env.NODE_ENV === 'development';

function windowIdFromSender(sender: WebContents): string | undefined {
  return webContentsToWindowId.get(sender.id);
}

function getWindowState(windowId: string): TerminalWindowState | undefined {
  const state = terminalWindows.get(windowId);
  if (state && !state.win.isDestroyed()) return state;
  if (state) terminalWindows.delete(windowId);
  return undefined;
}

function getDefaultWindowId(): string {
  for (const [id, state] of terminalWindows) {
    if (!state.win.isDestroyed()) return id;
    terminalWindows.delete(id);
  }
  return createTerminalWindow();
}

function getFocusedWindowId(): string | undefined {
  for (const state of terminalWindows.values()) {
    if (!state.win.isDestroyed() && state.win.isFocused()) {
      return state.windowId;
    }
  }
  return undefined;
}

function resolveTargetWindowId(options?: { windowId?: string; newWindow?: boolean }): string {
  if (options?.newWindow) {
    return createTerminalWindow({ focus: true });
  }
  if (options?.windowId && getWindowState(options.windowId)) {
    return options.windowId;
  }
  return getFocusedWindowId() ?? getDefaultWindowId();
}

export function createTerminalWindow(options?: {
  layout?: Partial<TerminalWindowLayout>;
  focus?: boolean;
}): string {
  const windowId = uuidv4();
  const primary = screen.getPrimaryDisplay().workArea;
  const defaultWidth = 960;
  const defaultHeight = 640;
  const layout = options?.layout;

  const win = new BrowserWindow({
    width: layout?.width ?? defaultWidth,
    height: layout?.height ?? defaultHeight,
    x: layout?.x ?? primary.x + Math.floor((primary.width - defaultWidth) / 2),
    y: layout?.y ?? primary.y + Math.floor((primary.height - defaultHeight) / 2),
    title: 'Workspace Dock — 终端',
    webPreferences: {
      preload: path.join(__dirname, '../terminal-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      additionalArguments: [`--terminal-window-id=${windowId}`],
    },
    show: false,
  });

  const state: TerminalWindowState = {
    windowId,
    win,
    activeSessionId: layout?.activeSessionId ?? null,
  };

  terminalWindows.set(windowId, state);
  webContentsToWindowId.set(win.webContents.id, windowId);

  if (isDev) {
    win.loadURL(`http://localhost:5173/terminal.html?windowId=${windowId}`);
  } else {
    win.loadFile(path.join(__dirname, '../renderer/terminal.html'), {
      query: { windowId },
    });
  }

  win.on('closed', () => {
    webContentsToWindowId.delete(win.webContents.id);
    terminalWindows.delete(windowId);
    for (const [sessionId, session] of sessions) {
      if (session.windowId === windowId) {
        session.stream.close();
        session.conn.end();
        sessions.delete(sessionId);
      }
    }
  });

  win.once('ready-to-show', () => {
    if (options?.focus !== false) win.show();
    broadcastSessions(windowId);
  });

  return windowId;
}

function ensureWindow(windowId?: string): TerminalWindowState {
  if (windowId) {
    const existing = getWindowState(windowId);
    if (existing) return existing;
  }
  const newId = createTerminalWindow({ focus: true });
  return getWindowState(newId)!;
}

export function getTerminalLayout(windowId?: string): TerminalWindowLayout | null {
  const id = windowId ?? getFocusedWindowId() ?? getDefaultWindowId();
  const state = getWindowState(id);
  if (!state) return null;
  const bounds = state.win.getBounds();
  const sessionIds = Array.from(sessions.values())
    .filter((s) => s.windowId === id)
    .map((s) => s.info.sessionId);
  const hostIds = Array.from(sessions.values())
    .filter((s) => s.windowId === id)
    .map((s) => s.info.hostId)
    .filter((hid): hid is string => !!hid);
  return {
    windowId: id,
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    activeSessionId: state.activeSessionId ?? undefined,
    sessionIds,
    hostIds,
  };
}

export function getAllTerminalLayouts(): TerminalWindowLayout[] {
  const layouts: TerminalWindowLayout[] = [];
  for (const id of terminalWindows.keys()) {
    const layout = getTerminalLayout(id);
    if (layout) layouts.push(layout);
  }
  return layouts;
}

export function applyTerminalLayout(layout: TerminalWindowLayout): void {
  const windowId = layout.windowId && getWindowState(layout.windowId)
    ? layout.windowId
    : ensureWindow().windowId;
  const win = getWindowState(windowId)!.win;
  const display = screen.getDisplayMatching({
    x: layout.x,
    y: layout.y,
    width: layout.width,
    height: layout.height,
  });
  const area = display.workArea;
  win.setBounds({
    x: Math.max(area.x, Math.min(layout.x, area.x + area.width - 200)),
    y: Math.max(area.y, Math.min(layout.y, area.y + area.height - 200)),
    width: Math.min(layout.width, area.width),
    height: Math.min(layout.height, area.height),
  });
  if (layout.activeSessionId) {
    const state = getWindowState(windowId);
    if (state) {
      state.activeSessionId = layout.activeSessionId;
      win.webContents.send(IPC_CHANNELS.ON_TERMINAL_SESSIONS, listTerminalSessions(windowId));
    }
  }
}

function broadcastSessions(windowId: string): void {
  const state = getWindowState(windowId);
  if (!state || state.win.isDestroyed()) return;
  state.win.webContents.send(IPC_CHANNELS.ON_TERMINAL_SESSIONS, listTerminalSessions(windowId));
}

function sendData(sessionId: string, data: string): void {
  const session = sessions.get(sessionId);
  if (!session) return;
  const state = getWindowState(session.windowId);
  if (state && !state.win.isDestroyed()) {
    state.win.webContents.send(IPC_CHANNELS.ON_TERMINAL_DATA, sessionId, data);
  }
}

function sendExit(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (!session) return;
  const state = getWindowState(session.windowId);
  if (state && !state.win.isDestroyed()) {
    state.win.webContents.send(IPC_CHANNELS.ON_TERMINAL_EXIT, sessionId);
  }
}

export async function openTerminalSession(
  options: SSHConnectOptions & { windowId?: string; newWindow?: boolean },
): Promise<string> {
  const windowId = resolveTargetWindowId(options);
  const state = ensureWindow(windowId);
  const win = state.win;
  const sessionId = uuidv4();
  state.activeSessionId = sessionId;

  const info: TerminalSessionInfo = {
    sessionId,
    hostId: options.hostId,
    hostName: options.hostName ?? options.ip,
    ip: options.ip,
    port: options.port,
    username: options.username,
    path: options.path,
    environmentType: options.environmentType,
    windowId,
  };

  try {
    const conn = await createSSHConnection(options);
    const initCmd = options.path ? `cd ${options.path} && exec $SHELL -l\n` : '';

    conn.shell({ term: 'xterm-256color', cols: 120, rows: 36 }, (err, stream) => {
      if (err) {
        sendData(sessionId, `\r\n\x1b[31m连接失败: ${err.message}\x1b[0m\r\n`);
        conn.end();
        return;
      }

      sessions.set(sessionId, { info, conn, stream, windowId });

      stream.on('data', (data: Buffer) => {
        sendData(sessionId, data.toString('utf-8'));
      });

      stream.on('close', () => {
        sessions.delete(sessionId);
        conn.end();
        sendExit(sessionId);
        if (state.activeSessionId === sessionId) {
          const remaining = listTerminalSessions(windowId);
          state.activeSessionId =
            remaining.length > 0 ? remaining[remaining.length - 1].sessionId : null;
        }
        broadcastSessions(windowId);
      });

      stream.stderr.on('data', (data: Buffer) => {
        sendData(sessionId, data.toString('utf-8'));
      });

      if (initCmd) {
        stream.write(initCmd);
      }

      broadcastSessions(windowId);
      win.focus();
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'SSH 连接失败';
    win.webContents.send(IPC_CHANNELS.ON_TERMINAL_DATA, sessionId, `\r\n\x1b[31m${msg}\x1b[0m\r\n`);
    throw err;
  }

  return sessionId;
}

export async function openTerminalSessionsBatch(
  sessionsList: SSHConnectOptions[],
  layout?: TerminalWindowLayout | { terminals?: TerminalWindowLayout[] },
): Promise<void> {
  const terminalLayouts =
    layout && 'terminals' in layout && layout.terminals?.length
      ? layout.terminals
      : layout && 'x' in layout
        ? [layout as TerminalWindowLayout]
        : undefined;

  if (terminalLayouts && terminalLayouts.length > 0) {
    const assigned = new Set<number>();

    for (const winLayout of terminalLayouts) {
      const windowId = createTerminalWindow({ layout: winLayout, focus: false });
      applyTerminalLayout({ ...winLayout, windowId });

      const indices = sessionsList
        .map((s, idx) => ({ s, idx }))
        .filter(({ s, idx }) => {
          if (assigned.has(idx)) return false;
          if (winLayout.hostIds?.length && s.hostId) {
            return winLayout.hostIds.includes(s.hostId);
          }
          return false;
        });

      const toOpen =
        indices.length > 0
          ? indices
          : sessionsList
              .map((s, idx) => ({ s, idx }))
              .filter(({ idx }) => !assigned.has(idx))
              .slice(0, Math.max(1, Math.ceil(sessionsList.length / terminalLayouts.length)));

      for (const { s, idx } of toOpen) {
        assigned.add(idx);
        await openTerminalSession({ ...s, windowId });
        await new Promise((r) => setTimeout(r, 300));
      }
    }

    for (let i = 0; i < sessionsList.length; i++) {
      if (!assigned.has(i)) {
        await openTerminalSession(sessionsList[i]);
        await new Promise((r) => setTimeout(r, 300));
      }
    }
    return;
  }

  if (layout && 'x' in layout) {
    applyTerminalLayout(layout as TerminalWindowLayout);
  }

  for (const session of sessionsList) {
    await openTerminalSession(session);
    await new Promise((r) => setTimeout(r, 300));
  }
}

export function closeTerminalSession(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (!session) return;
  const windowId = session.windowId;
  session.stream.close();
  session.conn.end();
  sessions.delete(sessionId);
  broadcastSessions(windowId);
}

export function writeToTerminal(sessionId: string, data: string): void {
  sessions.get(sessionId)?.stream.write(data);
}

export function resizeTerminal(sessionId: string, cols: number, rows: number): void {
  sessions.get(sessionId)?.stream.setWindow(rows, cols, 0, 0);
}

export function listTerminalSessions(windowId?: string): TerminalSessionInfo[] {
  const list = Array.from(sessions.values()).map((s) => s.info);
  if (!windowId) return list;
  return list.filter((s) => s.windowId === windowId);
}

export function setActiveTerminalSession(sessionId: string, windowId?: string): void {
  const session = sessions.get(sessionId);
  const targetWindowId = windowId ?? session?.windowId;
  if (!targetWindowId) return;
  const state = getWindowState(targetWindowId);
  if (state) {
    state.activeSessionId = sessionId;
  }
}

export function registerTerminalIpc(): void {
  ipcMain.handle(IPC_CHANNELS.TERMINAL_OPEN, (_e, options: SSHConnectOptions) =>
    openTerminalSession(options),
  );
  ipcMain.handle(IPC_CHANNELS.TERMINAL_NEW_WINDOW, () => {
    const windowId = createTerminalWindow({ focus: true });
    return windowId;
  });
  ipcMain.handle(IPC_CHANNELS.TERMINAL_WRITE, (_e, sessionId: string, data: string) => {
    writeToTerminal(sessionId, data);
  });
  ipcMain.handle(IPC_CHANNELS.TERMINAL_RESIZE, (_e, sessionId: string, cols: number, rows: number) => {
    resizeTerminal(sessionId, cols, rows);
  });
  ipcMain.handle(IPC_CHANNELS.TERMINAL_CLOSE, (_e, sessionId: string) => {
    closeTerminalSession(sessionId);
  });
  ipcMain.handle(IPC_CHANNELS.TERMINAL_LIST, (e) =>
    listTerminalSessions(windowIdFromSender(e.sender)),
  );
  ipcMain.handle(IPC_CHANNELS.TERMINAL_GET_LAYOUT, () => getTerminalLayout());
  ipcMain.handle(IPC_CHANNELS.TERMINAL_GET_ALL_LAYOUTS, () => getAllTerminalLayouts());
  ipcMain.handle(IPC_CHANNELS.TERMINAL_APPLY_LAYOUT, (_e, layout: TerminalWindowLayout) => {
    applyTerminalLayout(layout);
  });
  ipcMain.handle(IPC_CHANNELS.TERMINAL_SET_ACTIVE, (e, sessionId: string) => {
    setActiveTerminalSession(sessionId, windowIdFromSender(e.sender));
  });
}
