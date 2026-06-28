import { exec } from 'child_process';
import { promisify } from 'util';
import { Client } from 'ssh2';
import { SSHConnectOptions } from '../../shared/types';

const execAsync = promisify(exec);

function buildSSHCommand(options: SSHConnectOptions): string {
  const { ip, port, username, path } = options;
  const portFlag = port !== 22 ? ` -p ${port}` : '';
  const baseCmd = `ssh${portFlag} ${username}@${ip}`;

  if (path) {
    return `${baseCmd} -t 'cd ${path.replace(/'/g, "'\\''")} && exec $SHELL -l'`;
  }
  return baseCmd;
}

function escapeForShell(cmd: string): string {
  return cmd.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

async function openMacTerminal(command: string): Promise<void> {
  const escaped = escapeForShell(command);
  const script = `
    tell application "Terminal"
      activate
      do script "${escaped}"
    end tell
  `;
  await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
}

async function openWindowsTerminal(command: string): Promise<void> {
  const escaped = command.replace(/"/g, '\\"');
  try {
    await execAsync(`wt.exe new-tab --title "SSH" cmd /k "${escaped}"`);
  } catch {
    await execAsync(`start cmd /k "${escaped}"`);
  }
}

async function openLinuxTerminal(command: string): Promise<void> {
  const escaped = command.replace(/"/g, '\\"');
  const terminals = [
    `gnome-terminal -- bash -c "${escaped}; exec bash"`,
    `konsole -e bash -c "${escaped}; exec bash"`,
    `xterm -e bash -c "${escaped}; exec bash"`,
  ];

  for (const termCmd of terminals) {
    try {
      await execAsync(termCmd);
      return;
    } catch {
      continue;
    }
  }
  throw new Error('未找到可用的终端程序');
}

export async function connectSSH(options: SSHConnectOptions): Promise<void> {
  const command = buildSSHCommand(options);

  switch (process.platform) {
    case 'darwin':
      await openMacTerminal(command);
      break;
    case 'win32':
      await openWindowsTerminal(command);
      break;
    default:
      await openLinuxTerminal(command);
      break;
  }
}

export async function batchConnectSSH(sessions: SSHConnectOptions[]): Promise<void> {
  for (const session of sessions) {
    await connectSSH(session);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

export function checkHostOnline(
  ip: string,
  port: number,
  timeout = 5000,
): Promise<boolean> {
  return new Promise((resolve) => {
    const conn = new Client();
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        conn.end();
        resolve(false);
      }
    }, timeout);

    conn
      .on('ready', () => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          conn.end();
          resolve(true);
        }
      })
      .on('error', () => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(false);
        }
      })
      .connect({
        host: ip,
        port,
        username: 'root',
        readyTimeout: timeout,
        tryKeyboard: true,
      });
  });
}

export function getSSHCommandString(options: SSHConnectOptions): string {
  return buildSSHCommand(options);
}

export function isValidIPOrHost(value: string): boolean {
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const hostRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/;
  return ipRegex.test(value) || hostRegex.test(value);
}
