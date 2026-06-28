import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/types';

const api = {
  write: (sessionId: string, data: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.TERMINAL_WRITE, sessionId, data),
  resize: (sessionId: string, cols: number, rows: number) =>
    ipcRenderer.invoke(IPC_CHANNELS.TERMINAL_RESIZE, sessionId, cols, rows),
  close: (sessionId: string) => ipcRenderer.invoke(IPC_CHANNELS.TERMINAL_CLOSE, sessionId),
  list: () => ipcRenderer.invoke(IPC_CHANNELS.TERMINAL_LIST),
  setActive: (sessionId: string) => ipcRenderer.invoke(IPC_CHANNELS.TERMINAL_SET_ACTIVE, sessionId),
  newWindow: () => ipcRenderer.invoke(IPC_CHANNELS.TERMINAL_NEW_WINDOW),
  onData: (callback: (sessionId: string, data: string) => void) => {
    const handler = (_: unknown, sessionId: string, data: string) => callback(sessionId, data);
    ipcRenderer.on(IPC_CHANNELS.ON_TERMINAL_DATA, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.ON_TERMINAL_DATA, handler);
  },
  onExit: (callback: (sessionId: string) => void) => {
    const handler = (_: unknown, sessionId: string) => callback(sessionId);
    ipcRenderer.on(IPC_CHANNELS.ON_TERMINAL_EXIT, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.ON_TERMINAL_EXIT, handler);
  },
  onSessionsChanged: (callback: (sessions: unknown[]) => void) => {
    const handler = (_: unknown, sessions: unknown[]) => callback(sessions);
    ipcRenderer.on(IPC_CHANNELS.ON_TERMINAL_SESSIONS, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.ON_TERMINAL_SESSIONS, handler);
  },
};

contextBridge.exposeInMainWorld('terminalAPI', api);
