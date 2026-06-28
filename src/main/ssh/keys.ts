import fs from 'fs';
import os from 'os';
import path from 'path';
import { execSync } from 'child_process';
import type { SSHKeyInfo } from '../../shared/types';
import { getSettings } from '../store/database';

const DEFAULT_KEY_NAMES = ['id_ed25519', 'id_rsa', 'id_ecdsa'];

function detectKeyType(name: string): SSHKeyInfo['type'] {
  if (name.includes('ed25519')) return 'ed25519';
  if (name.includes('rsa')) return 'rsa';
  if (name.includes('ecdsa')) return 'ecdsa';
  return 'other';
}

function getFingerprint(pubPath: string): string | undefined {
  try {
    const out = execSync(`ssh-keygen -lf "${pubPath}"`, { encoding: 'utf-8', timeout: 3000 });
    const parts = out.trim().split(/\s+/);
    return parts[1];
  } catch {
    return undefined;
  }
}

function isPrivateKeyFile(filePath: string): boolean {
  const base = path.basename(filePath);
  if (base.endsWith('.pub')) return false;
  if (['config', 'known_hosts', 'authorized_keys', 'authorized_keys2'].includes(base)) return false;
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return (
      content.includes('PRIVATE KEY') ||
      content.startsWith('-----BEGIN OPENSSH PRIVATE KEY-----') ||
      content.startsWith('-----BEGIN RSA PRIVATE KEY-----')
    );
  } catch {
    return false;
  }
}

export function listSSHKeys(): SSHKeyInfo[] {
  const sshDir = path.join(os.homedir(), '.ssh');
  if (!fs.existsSync(sshDir)) return [];

  const keys: SSHKeyInfo[] = [];
  const seen = new Set<string>();

  for (const name of DEFAULT_KEY_NAMES) {
    const privatePath = path.join(sshDir, name);
    if (fs.existsSync(privatePath)) {
      const pubPath = `${privatePath}.pub`;
      keys.push({
        path: privatePath,
        name,
        type: detectKeyType(name),
        hasPublicKey: fs.existsSync(pubPath),
        fingerprint: fs.existsSync(pubPath) ? getFingerprint(pubPath) : undefined,
      });
      seen.add(privatePath);
    }
  }

  try {
    for (const entry of fs.readdirSync(sshDir)) {
      const full = path.join(sshDir, entry);
      if (seen.has(full) || entry.endsWith('.pub')) continue;
      if (!isPrivateKeyFile(full)) continue;
      const pubPath = `${full}.pub`;
      keys.push({
        path: full,
        name: entry,
        type: detectKeyType(entry),
        hasPublicKey: fs.existsSync(pubPath),
        fingerprint: fs.existsSync(pubPath) ? getFingerprint(pubPath) : undefined,
      });
    }
  } catch {
    // ignore
  }

  return keys;
}

export function readPrivateKey(keyPath?: string): Buffer | undefined {
  const settings = getSettings();
  const target = keyPath ?? settings.sshKeyPath;

  const candidates: string[] = [];
  if (target) candidates.push(target);
  for (const name of DEFAULT_KEY_NAMES) {
    candidates.push(path.join(os.homedir(), '.ssh', name));
  }

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try {
        return fs.readFileSync(p);
      } catch {
        continue;
      }
    }
  }
  return undefined;
}

export function getActiveKeyPath(): string | undefined {
  const settings = getSettings();
  if (settings.sshKeyPath && fs.existsSync(settings.sshKeyPath)) {
    return settings.sshKeyPath;
  }
  for (const name of DEFAULT_KEY_NAMES) {
    const p = path.join(os.homedir(), '.ssh', name);
    if (fs.existsSync(p)) return p;
  }
  return undefined;
}
