import type { BookmarkTree, FlatHost } from './types';
import type { DragBookmarkItem } from './bookmarkTreeOps';
import { flattenHosts } from './types';

export interface ExternalDragPayload {
  'text/plain': string;
  'application/json': string;
  'application/x-workspace-dock-host'?: string;
}

function findHost(tree: BookmarkTree, item: DragBookmarkItem): FlatHost | null {
  const all = flattenHosts(tree);
  if (item.type !== 'host') return null;
  return all.find((h) => h.id === item.id) ?? null;
}

function buildSSHCommand(host: { ip: string; port: number; username: string; lastPath?: string }): string {
  const portPart = host.port !== 22 ? ` -p ${host.port}` : '';
  const base = `ssh${portPart} ${host.username}@${host.ip}`;
  return host.lastPath ? `${base} -t 'cd ${host.lastPath} && exec $SHELL -l'` : base;
}

export function buildExternalDragPayload(
  item: DragBookmarkItem,
  tree: BookmarkTree,
): ExternalDragPayload {
  if (item.type === 'host') {
    const host = findHost(tree, item);
    if (host) {
      const ssh = buildSSHCommand(host);
      return {
        'text/plain': ssh,
        'application/json': JSON.stringify({
          type: 'host',
          id: host.id,
          name: host.name,
          ip: host.ip,
          port: host.port,
          username: host.username,
          path: host.lastPath,
          project: host.projectName,
          environment: host.environmentName,
        }),
        'application/x-workspace-dock-host': ssh,
      };
    }
  }

  const exportJson = exportNodeJson(item, tree);
  const label =
    item.type === 'project'
      ? tree.projects.find((p) => p.id === item.id)?.name
      : item.type === 'environment'
        ? tree.projects
            .find((p) => p.id === item.projectId)
            ?.environments.find((e) => e.id === item.id)?.name
        : item.type === 'role'
          ? tree.projects
              .find((p) => p.id === item.projectId)
              ?.environments.find((e) => e.id === item.environmentId)
              ?.roles.find((r) => r.id === item.id)?.name
          : item.id;

  return {
    'text/plain': `[Workspace Dock] ${item.type}: ${label ?? item.id}`,
    'application/json': exportJson,
  };
}

function exportNodeJson(item: DragBookmarkItem, tree: BookmarkTree): string {
  if (item.type === 'project') {
    const project = tree.projects.find((p) => p.id === item.id);
    return JSON.stringify({ type: 'project', data: project }, null, 2);
  }
  if (item.type === 'environment' && item.projectId) {
    const project = tree.projects.find((p) => p.id === item.projectId);
    const env = project?.environments.find((e) => e.id === item.id);
    return JSON.stringify({ type: 'environment', data: env, projectName: project?.name }, null, 2);
  }
  if (item.type === 'role' && item.projectId && item.environmentId) {
    const project = tree.projects.find((p) => p.id === item.projectId);
    const env = project?.environments.find((e) => e.id === item.environmentId);
    const role = env?.roles.find((r) => r.id === item.id);
    return JSON.stringify(
      { type: 'role', data: role, projectName: project?.name, environmentName: env?.name },
      null,
      2,
    );
  }
  return JSON.stringify(item);
}
