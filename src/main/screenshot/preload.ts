import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../../shared/types';

const api = {
  completeSelection: (bounds: { x: number; y: number; width: number; height: number }) =>
    ipcRenderer.send(IPC_CHANNELS.SCREENSHOT_COMPLETE, bounds),
  cancelSelection: () => ipcRenderer.send(IPC_CHANNELS.SCREENSHOT_CANCEL),
};

contextBridge.exposeInMainWorld('screenshotAPI', api);
