import { safeStorage } from 'electron';
import Store from 'electron-store';
import fs from 'fs';
import { getActiveKeyPath } from './keys';

const passphraseStore = new Store<{ sshPassphraseEnc?: string }>({
  name: 'workspace-dock-secrets',
});

let memoryPassphrase: string | undefined;

export function isPrivateKeyEncrypted(keyPath?: string): boolean {
  const target = keyPath ?? getActiveKeyPath();
  if (!target || !fs.existsSync(target)) return false;
  try {
    const content = fs.readFileSync(target, 'utf-8');
    return (
      content.includes('ENCRYPTED') ||
      (content.includes('Proc-Type: 4,ENCRYPTED') && content.includes('DEK-Info'))
    );
  } catch {
    return false;
  }
}

export function getPassphrase(): string | undefined {
  if (memoryPassphrase) return memoryPassphrase;
  const enc = passphraseStore.get('sshPassphraseEnc');
  if (enc && safeStorage.isEncryptionAvailable()) {
    try {
      memoryPassphrase = safeStorage.decryptString(Buffer.from(enc, 'base64'));
      return memoryPassphrase;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export function hasPassphrase(): boolean {
  return !!getPassphrase();
}

export function setPassphrase(passphrase: string, remember: boolean): void {
  memoryPassphrase = passphrase;
  if (remember && safeStorage.isEncryptionAvailable()) {
    passphraseStore.set(
      'sshPassphraseEnc',
      safeStorage.encryptString(passphrase).toString('base64'),
    );
  } else {
    passphraseStore.delete('sshPassphraseEnc');
  }
}

export function clearPassphrase(): void {
  memoryPassphrase = undefined;
  passphraseStore.delete('sshPassphraseEnc');
}

export function isPassphraseError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('passphrase') ||
    lower.includes('encrypted') ||
    lower.includes('cannot parse privatekey') ||
    lower.includes('bad decrypt')
  );
}
