import { app, BrowserWindow, globalShortcut, screen } from 'electron';
import path from 'path';
import { registerIpcHandlers, setMainWindow, initBackgroundServices, triggerScreenshotCapture } from './ipc/handlers';
import { getSettings } from './store/database';
import { IPC_CHANNELS, getDockWindowBounds } from '../shared/types';

const isDev = process.env.NODE_ENV === 'development';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  const settings = getSettings();
  const primaryDisplay = screen.getPrimaryDisplay();
  const workArea = primaryDisplay.workArea;

  const bounds = getDockWindowBounds(false, workArea, settings.dockWidth, settings.panelWidth);

  mainWindow = new BrowserWindow({
    ...bounds,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    show: false,
  });

  setMainWindow(mainWindow);

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function registerShortcuts(): void {
  globalShortcut.register('CommandOrControl+P', () => {
    if (mainWindow) {
      mainWindow.webContents.send(IPC_CHANNELS.ON_OPEN_SEARCH);
      mainWindow.focus();
    }
  });

  globalShortcut.register('CommandOrControl+B', () => {
    mainWindow?.webContents.send(IPC_CHANNELS.PANEL_TOGGLE_REQUEST);
  });

  globalShortcut.register('CommandOrControl+Shift+S', () => {
    void triggerScreenshotCapture();
  });
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();
  registerShortcuts();
  initBackgroundServices();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
