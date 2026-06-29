import { BrowserWindow, ipcMain, screen } from 'electron';
import path from 'path';
import { IPC_CHANNELS } from '../../shared/types';
import { captureRegionToClipboard, type CaptureBounds } from './capture';

const isDev = process.env.NODE_ENV === 'development';

let overlayWindow: BrowserWindow | null = null;
let pendingResolve: ((result: { success: boolean; error?: string; cancelled?: boolean }) => void) | null =
  null;

function getVirtualDesktopBounds(): { x: number; y: number; width: number; height: number } {
  const displays = screen.getAllDisplays();
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const display of displays) {
    const b = display.bounds;
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.width);
    maxY = Math.max(maxY, b.y + b.height);
  }

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function cleanupOverlay(): void {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.close();
  }
  overlayWindow = null;
}

function finish(result: { success: boolean; error?: string; cancelled?: boolean }): void {
  cleanupOverlay();
  pendingResolve?.(result);
  pendingResolve = null;
}

function registerOverlayHandlers(): void {
  ipcMain.removeAllListeners(IPC_CHANNELS.SCREENSHOT_COMPLETE);
  ipcMain.removeAllListeners(IPC_CHANNELS.SCREENSHOT_CANCEL);

  ipcMain.once(IPC_CHANNELS.SCREENSHOT_COMPLETE, async (_e, bounds: CaptureBounds) => {
    try {
      await captureRegionToClipboard(bounds);
      finish({ success: true });
    } catch (err) {
      finish({
        success: false,
        error: err instanceof Error ? err.message : '截图失败',
      });
    }
  });

  ipcMain.once(IPC_CHANNELS.SCREENSHOT_CANCEL, () => {
    finish({ success: false, cancelled: true });
  });
}

export function startRegionScreenshot(
  getMainWindow: () => BrowserWindow | null,
): Promise<{ success: boolean; error?: string; cancelled?: boolean }> {
  if (overlayWindow) {
    return Promise.resolve({ success: false, error: '截图进行中' });
  }

  return new Promise((resolve) => {
    pendingResolve = resolve;
    registerOverlayHandlers();

    const mainWin = getMainWindow();
    const wasVisible = mainWin?.isVisible() ?? false;
    mainWin?.hide();

    const desktop = getVirtualDesktopBounds();

    overlayWindow = new BrowserWindow({
      x: desktop.x,
      y: desktop.y,
      width: desktop.width,
      height: desktop.height,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      movable: false,
      focusable: true,
      hasShadow: false,
      enableLargerThanScreen: true,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
      show: false,
    });

    overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    overlayWindow.setAlwaysOnTop(true, 'screen-saver');

    const restoreMain = () => {
      if (wasVisible && mainWin && !mainWin.isDestroyed()) {
        mainWin.show();
        mainWin.focus();
      }
    };

    overlayWindow.once('closed', () => {
      overlayWindow = null;
      restoreMain();
    });

    if (isDev) {
      overlayWindow.loadURL('http://localhost:5173/screenshot.html');
    } else {
      overlayWindow.loadFile(path.join(__dirname, '../renderer/screenshot.html'));
    }

    overlayWindow.once('ready-to-show', () => {
      overlayWindow?.show();
      overlayWindow?.focus();
    });
  });
}
