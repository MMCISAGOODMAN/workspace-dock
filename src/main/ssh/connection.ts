import { Client } from 'ssh2';
import type { SSHConnectOptions, BatchExecHost, BatchExecResult } from '../../shared/types';
import { readPrivateKey } from './keys';
import { getPassphrase } from './passphrase';

function buildConnectConfig(options: {
  ip: string;
  port: number;
  username: string;
}): Record<string, unknown> {
  const privateKey = readPrivateKey();
  const passphrase = getPassphrase();
  const config: Record<string, unknown> = {
    host: options.ip,
    port: options.port,
    username: options.username,
    readyTimeout: 15000,
    tryKeyboard: true,
  };
  if (privateKey) {
    config.privateKey = privateKey;
    if (passphrase) {
      config.passphrase = passphrase;
    }
  }
  return config;
}

export function execOnHost(
  host: BatchExecHost,
  command: string,
): Promise<BatchExecResult> {
  return new Promise((resolve) => {
    const conn = new Client();
    conn
      .on('ready', () => {
        conn.exec(command, (err, stream) => {
          if (err) {
            conn.end();
            resolve({
              hostName: host.hostName,
              ip: host.ip,
              success: false,
              stdout: '',
              stderr: '',
              error: err.message,
            });
            return;
          }
          let stdout = '';
          let stderr = '';
          stream
            .on('close', () => {
              conn.end();
              resolve({
                hostName: host.hostName,
                ip: host.ip,
                success: true,
                stdout,
                stderr,
              });
            })
            .on('data', (data: Buffer) => {
              stdout += data.toString();
            });
          stream.stderr.on('data', (data: Buffer) => {
            stderr += data.toString();
          });
        });
      })
      .on('error', (err) => {
        resolve({
          hostName: host.hostName,
          ip: host.ip,
          success: false,
          stdout: '',
          stderr: '',
          error: err.message,
        });
      })
      .connect(buildConnectConfig(host));
  });
}

export async function batchExec(
  hosts: BatchExecHost[],
  command: string,
): Promise<BatchExecResult[]> {
  return Promise.all(hosts.map((host) => execOnHost(host, command)));
}

export function createSSHConnection(options: SSHConnectOptions): Promise<Client> {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn
      .on('ready', () => resolve(conn))
      .on('error', reject)
      .connect(buildConnectConfig(options));
  });
}

export { buildConnectConfig };
