import { app, BrowserWindow, globalShortcut, screen } from 'electron';
import path from 'path';
import { registerIpcHandlers, setMainWindow, setPanelExpanded, getPanelExpanded, initBackgroundServices } from './ipc/handlers';
import { getSettings } from './store/database';
import { IPC_CHANNELS } from '../shared/types';

const isDev = process.env.NODE_ENV === 'development';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  const settings = getSettings();
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workArea;
  const { x: screenX, y: screenY } = primaryDisplay.workArea;

  const dockWidth = settings.dockWidth;
  const height = screenHeight;

  mainWindow = new BrowserWindow({
    width: dockWidth,
    height,
    x: screenX + screenWidth - dockWidth,
    y: screenY,
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
      if (!getPanelExpanded()) {
        setPanelExpanded(true);
      }
      mainWindow.webContents.send(IPC_CHANNELS.ON_OPEN_SEARCH);
      mainWindow.focus();
    }
  });

  globalShortcut.register('CommandOrControl+B', () => {
    setPanelExpanded(!getPanelExpanded());
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
