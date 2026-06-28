import http from 'http';
import type { BookmarkTree } from '../../shared/types';
import { getBookmarks, saveBookmarks } from '../store/database';

let server: http.Server | null = null;
let status: { running: boolean; port: number; lastSyncAt?: string; lastError?: string } = {
  running: false,
  port: 9876,
};

export function getSyncStatus() {
  return { ...status };
}

export function startSyncServer(port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    if (server) {
      resolve();
      return;
    }

    server = http.createServer((req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      if (req.url === '/api/bookmarks' && req.method === 'GET') {
        const bookmarks = getBookmarks();
        status.lastSyncAt = new Date().toISOString();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(bookmarks, null, 2));
        return;
      }

      if (req.url === '/api/bookmarks' && (req.method === 'PUT' || req.method === 'POST')) {
        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });
        req.on('end', () => {
          try {
            const data = JSON.parse(body) as BookmarkTree;
            saveBookmarks(data);
            status.lastSyncAt = new Date().toISOString();
            status.lastError = undefined;
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
          } catch (err) {
            status.lastError = err instanceof Error ? err.message : 'Parse error';
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: status.lastError }));
          }
        });
        return;
      }

      if (req.url === '/api/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', app: 'workspace-dock' }));
        return;
      }

      res.writeHead(404);
      res.end('Not Found');
    });

    server.on('error', (err) => {
      status.lastError = err.message;
      status.running = false;
      reject(err);
    });

    server.listen(port, '0.0.0.0', () => {
      status.running = true;
      status.port = port;
      status.lastError = undefined;
      resolve();
    });
  });
}

export function stopSyncServer(): void {
  if (server) {
    server.close();
    server = null;
  }
  status.running = false;
}

export async function pullBookmarks(url: string): Promise<BookmarkTree> {
  const res = await fetch(`${url.replace(/\/$/, '')}/api/bookmarks`);
  if (!res.ok) throw new Error(`同步失败: HTTP ${res.status}`);
  status.lastSyncAt = new Date().toISOString();
  return (await res.json()) as BookmarkTree;
}

export async function pushBookmarks(url: string, bookmarks: BookmarkTree): Promise<void> {
  const res = await fetch(`${url.replace(/\/$/, '')}/api/bookmarks`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bookmarks),
  });
  if (!res.ok) throw new Error(`推送失败: HTTP ${res.status}`);
  status.lastSyncAt = new Date().toISOString();
}
