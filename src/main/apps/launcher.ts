import { spawn } from 'child_process';
import fs from 'fs';
import { shell } from 'electron';
import type { FavoriteApp, LaunchAllAppsResult, LaunchAppResult } from '../../shared/types';

function isValidUrl(target: string): boolean {
  try {
    const url = new URL(target);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function parseArgs(args?: string): string[] {
  if (!args?.trim()) return [];
  return args.trim().split(/\s+/);
}

function isMacAppBundle(target: string): boolean {
  return process.platform === 'darwin' && target.endsWith('.app');
}

function spawnDetached(command: string, args: string[]): LaunchAppResult {
  try {
    const child = spawn(command, args, {
      detached: true,
      stdio: 'ignore',
    });
    child.on('error', () => {
      // Prevent unhandled 'error' events from crashing the main process.
    });
    child.unref();
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : '启动失败',
    };
  }
}

function launchOnMacOS(target: string, argList: string[]): LaunchAppResult {
  if (argList.length === 0) {
    return spawnDetached('open', [target]);
  }
  if (isMacAppBundle(target)) {
    return spawnDetached('open', ['-a', target, '--args', ...argList]);
  }
  return spawnDetached('open', [target, '--args', ...argList]);
}

async function launchLocalApp(target: string, args?: string): Promise<LaunchAppResult> {
  if (!fs.existsSync(target)) {
    return { success: false, error: `文件不存在: ${target}` };
  }

  const argList = parseArgs(args);

  // macOS: always use the system `open` command — avoid shell.openPath on .app bundles.
  if (process.platform === 'darwin') {
    return launchOnMacOS(target, argList);
  }

  let stat: fs.Stats;
  try {
    stat = fs.statSync(target);
  } catch {
    return { success: false, error: '无法读取目标文件' };
  }

  if (stat.isDirectory()) {
    const err = await shell.openPath(target);
    return err ? { success: false, error: err } : { success: true };
  }

  if (argList.length > 0) {
    if (process.platform === 'win32') {
      return spawnDetached(target, argList);
    }
    if (stat.mode & 0o111) {
      return spawnDetached(target, argList);
    }
    return { success: false, error: '目标文件不可执行，请检查路径' };
  }

  const err = await shell.openPath(target);
  return err ? { success: false, error: err } : { success: true };
}

export async function launchFavoriteApp(app: FavoriteApp): Promise<LaunchAppResult> {
  try {
    if (app.type === 'url') {
      if (!isValidUrl(app.target)) {
        return { success: false, error: `无效的 URL: ${app.target}` };
      }
      await shell.openExternal(app.target);
      return { success: true };
    }

    return launchLocalApp(app.target, app.args);
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : '启动失败',
    };
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function launchAllFavoriteApps(apps: FavoriteApp[]): Promise<LaunchAllAppsResult> {
  const sorted = [...apps].sort((a, b) => a.sortOrder - b.sortOrder);
  let launched = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const result = await launchFavoriteApp(sorted[i]);
    if (result.success) {
      launched++;
    } else {
      failed++;
      errors.push(`${sorted[i].name}: ${result.error ?? '未知错误'}`);
    }
    if (i < sorted.length - 1) {
      await delay(150);
    }
  }

  return { launched, failed, errors };
}
