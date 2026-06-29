import fs from 'fs';
import path from 'path';
import { app, nativeImage } from 'electron';
import type { FavoriteApp, FavoriteAppType } from '../../shared/types';

const iconCache = new Map<string, string | null>();

function cacheKey(type: FavoriteAppType, target: string): string {
  return `${type}:${target}`;
}

function nativeImageToDataUrl(image: Electron.NativeImage): string | null {
  if (image.isEmpty()) return null;
  try {
    const dataUrl = image.toDataURL();
    return dataUrl && dataUrl.length > 50 ? dataUrl : null;
  } catch {
    return null;
  }
}

function readMacAppIcns(appPath: string): string | null {
  if (process.platform !== 'darwin' || !appPath.endsWith('.app')) return null;
  try {
    const resourcesDir = path.join(appPath, 'Contents/Resources');
    if (!fs.existsSync(resourcesDir)) return null;

    const icnsFile = fs
      .readdirSync(resourcesDir)
      .find((file) => file.endsWith('.icns') && !file.startsWith('.'));
    if (!icnsFile) return null;

    return nativeImageToDataUrl(nativeImage.createFromPath(path.join(resourcesDir, icnsFile)));
  } catch {
    return null;
  }
}

async function getLocalAppIcon(filePath: string): Promise<string | null> {
  try {
    if (!fs.existsSync(filePath)) return null;

    // On macOS .app bundles, read .icns directly — app.getFileIcon can crash Electron.
    if (process.platform === 'darwin' && filePath.endsWith('.app')) {
      return readMacAppIcns(filePath);
    }

    for (const size of ['normal', 'small'] as const) {
      try {
        const icon = await app.getFileIcon(filePath, { size });
        const dataUrl = nativeImageToDataUrl(icon);
        if (dataUrl) return dataUrl;
      } catch {
        // try next size
      }
    }

    return null;
  } catch {
    return null;
  }
}

function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
}

async function fetchAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(url, 8000);
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length === 0) return null;
    const contentType = res.headers.get('content-type')?.split(';')[0] ?? 'image/png';
    if (!contentType.startsWith('image/')) return null;
    return `data:${contentType};base64,${buffer.toString('base64')}`;
  } catch {
    return null;
  }
}

async function getUrlIcon(pageUrl: string): Promise<string | null> {
  try {
    const { hostname, origin } = new URL(pageUrl);
    const candidates = [
      `https://icons.duckduckgo.com/ip3/${hostname}.ico`,
      `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64`,
      `${origin}/favicon.ico`,
    ];
    for (const url of candidates) {
      const dataUrl = await fetchAsDataUrl(url);
      if (dataUrl) return dataUrl;
    }
  } catch {
    // invalid URL
  }
  return null;
}

export async function getFavoriteAppIcon(
  appItem: Pick<FavoriteApp, 'type' | 'target'>,
): Promise<string | null> {
  const key = cacheKey(appItem.type, appItem.target);
  if (iconCache.has(key)) {
    return iconCache.get(key) ?? null;
  }

  let icon: string | null = null;
  try {
    icon =
      appItem.type === 'url'
        ? await getUrlIcon(appItem.target)
        : await getLocalAppIcon(appItem.target);
  } catch {
    icon = null;
  }

  iconCache.set(key, icon);
  return icon;
}

export async function getFavoriteAppIcons(
  apps: Pick<FavoriteApp, 'id' | 'type' | 'target'>[],
): Promise<Record<string, string | null>> {
  const result: Record<string, string | null> = {};
  // Load sequentially — parallel getFileIcon calls can destabilize Electron on macOS.
  for (const item of apps) {
    result[item.id] = await getFavoriteAppIcon(item);
  }
  return result;
}

export function clearFavoriteAppIconCache(type?: FavoriteAppType, target?: string): void {
  if (type && target) {
    iconCache.delete(cacheKey(type, target));
    return;
  }
  iconCache.clear();
}
