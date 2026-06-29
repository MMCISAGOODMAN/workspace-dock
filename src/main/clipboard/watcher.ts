import { clipboard, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '../../shared/types';
import {
  parseClipboardCapture,
  type ClipboardCapture,
} from '../../shared/clipboardHost';

let lastText = '';
let lastCapture: ClipboardCapture | null = null;
let dismissedText: string | null = null;
let interval: ReturnType<typeof setInterval> | null = null;
let appWriteUntil = 0;
let appWriteText = '';

export function markClipboardWrite(text: string): void {
  appWriteText = text;
  appWriteUntil = Date.now() + 1000;
}

function readCapture(): ClipboardCapture | null {
  const text = clipboard.readText();
  const trimmed = text?.trim() ?? '';

  if (!trimmed) {
    if (lastText !== '') {
      lastText = '';
      lastCapture = null;
    }
    return null;
  }

  if (trimmed === lastText) return lastCapture;

  if (Date.now() < appWriteUntil && trimmed === appWriteText) {
    lastText = trimmed;
    return lastCapture;
  }

  lastText = trimmed;

  if (dismissedText && trimmed !== dismissedText) {
    dismissedText = null;
  }

  if (trimmed === dismissedText) {
    lastCapture = null;
    return null;
  }

  lastCapture = parseClipboardCapture(trimmed);
  return lastCapture;
}

function notifyWindow(win: BrowserWindow, capture: ClipboardCapture | null): void {
  if (win.isDestroyed()) return;
  win.webContents.send(IPC_CHANNELS.ON_CLIPBOARD_HOST_CHANGED, capture);
}

export function syncClipboardToRenderer(win: BrowserWindow): void {
  notifyWindow(win, readCapture());
}

export function getClipboardHostSuggestion(): ClipboardCapture | null {
  return readCapture();
}

function captureChanged(prev: ClipboardCapture | null, next: ClipboardCapture | null): boolean {
  if (prev === null && next === null) return false;
  if (prev === null || next === null) return true;
  return prev.text !== next.text || prev.host?.host !== next.host?.host;
}

export function startClipboardWatcher(getWindow: () => BrowserWindow | null): void {
  if (interval) return;

  interval = setInterval(() => {
    const win = getWindow();
    if (!win || win.isDestroyed()) return;

    const prev = lastCapture;
    const next = readCapture();
    if (captureChanged(prev, next)) {
      notifyWindow(win, next);
    }
  }, 400);

  const win = getWindow();
  if (win && !win.isDestroyed()) {
    syncClipboardToRenderer(win);
  }
}

export function stopClipboardWatcher(): void {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
}

export function dismissClipboardHost(): void {
  dismissedText = lastText;
  lastCapture = null;
}
