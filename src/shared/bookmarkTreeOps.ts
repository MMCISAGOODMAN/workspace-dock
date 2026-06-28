import type { BookmarkTree, Host, Project, Environment, Role } from './types';

export type BookmarkNodeType = 'project' | 'environment' | 'role' | 'host';

export interface DragBookmarkItem {
  type: BookmarkNodeType;
  id: string;
  projectId?: string;
  environmentId?: string;
  roleId?: string;
}

export type DropPosition = 'before' | 'after' | 'inside';

function cloneTree(tree: BookmarkTree): BookmarkTree {
  return structuredClone(tree);
}

function removeHost(
  tree: BookmarkTree,
  hostId: string,
): { tree: BookmarkTree; host: Host | null; from: DragBookmarkItem | null } {
  let removed: Host | null = null;
  let from: DragBookmarkItem | null = null;
  for (const project of tree.projects) {
    for (const env of project.environments) {
      for (const role of env.roles) {
        const idx = role.hosts.findIndex((h) => h.id === hostId);
        if (idx >= 0) {
          removed = role.hosts.splice(idx, 1)[0];
          from = {
            type: 'host',
            id: hostId,
            projectId: project.id,
            environmentId: env.id,
            roleId: role.id,
          };
          return { tree, host: removed, from };
        }
      }
    }
  }
  return { tree, host: null, from: null };
}

function removeRole(
  tree: BookmarkTree,
  roleId: string,
  projectId: string,
  envId: string,
): { tree: BookmarkTree; role: Role | null } {
  const project = tree.projects.find((p) => p.id === projectId);
  const env = project?.environments.find((e) => e.id === envId);
  if (!env) return { tree, role: null };
  const idx = env.roles.findIndex((r) => r.id === roleId);
  if (idx < 0) return { tree, role: null };
  const role = env.roles.splice(idx, 1)[0];
  return { tree, role };
}

function removeEnvironment(
  tree: BookmarkTree,
  envId: string,
  projectId: string,
): { tree: BookmarkTree; env: Environment | null } {
  const project = tree.projects.find((p) => p.id === projectId);
  if (!project) return { tree, env: null };
  const idx = project.environments.findIndex((e) => e.id === envId);
  if (idx < 0) return { tree, env: null };
  const env = project.environments.splice(idx, 1)[0];
  return { tree, env };
}

function removeProject(tree: BookmarkTree, projectId: string): { tree: BookmarkTree; project: Project | null } {
  const idx = tree.projects.findIndex((p) => p.id === projectId);
  if (idx < 0) return { tree, project: null };
  const project = tree.projects.splice(idx, 1)[0];
  return { tree, project };
}

function insertAt<T>(arr: T[], item: T, index: number): void {
  arr.splice(Math.max(0, Math.min(index, arr.length)), 0, item);
}

export function moveBookmarkNode(
  tree: BookmarkTree,
  source: DragBookmarkItem,
  target: DragBookmarkItem,
  position: DropPosition,
): BookmarkTree | null {
  if (source.type === target.type && source.id === target.id) return null;

  const next = cloneTree(tree);

  if (source.type === 'host') {
    const { tree: t1, host } = removeHost(next, source.id);
    if (!host) return null;

    if (position === 'inside' && target.type === 'role' && target.projectId && target.environmentId) {
      const role = t1.projects
        .find((p) => p.id === target.projectId)
        ?.environments.find((e) => e.id === target.environmentId)
        ?.roles.find((r) => r.id === target.id);
      if (!role) return null;
      role.hosts.push(host);
      return t1;
    }

    if (target.type === 'host' && target.projectId && target.environmentId && target.roleId) {
      const role = t1.projects
        .find((p) => p.id === target.projectId)
        ?.environments.find((e) => e.id === target.environmentId)
        ?.roles.find((r) => r.id === target.roleId);
      if (!role) return null;
      let idx = role.hosts.findIndex((h) => h.id === target.id);
      if (idx < 0) return null;
      if (position === 'after') idx += 1;
      insertAt(role.hosts, host, idx);
      return t1;
    }
    return null;
  }

  if (source.type === 'role' && source.projectId && source.environmentId) {
    const { tree: t1, role } = removeRole(next, source.id, source.projectId, source.environmentId);
    if (!role) return null;

    if (position === 'inside' && target.type === 'environment' && target.projectId) {
      const env = t1.projects.find((p) => p.id === target.projectId)?.environments.find((e) => e.id === target.id);
      if (!env) return null;
      env.roles.push(role);
      return t1;
    }

    if (target.type === 'role' && target.projectId && target.environmentId) {
      const env = t1.projects
        .find((p) => p.id === target.projectId)
        ?.environments.find((e) => e.id === target.environmentId);
      if (!env) return null;
      let idx = env.roles.findIndex((r) => r.id === target.id);
      if (idx < 0) return null;
      if (position === 'after') idx += 1;
      insertAt(env.roles, role, idx);
      return t1;
    }
    return null;
  }

  if (source.type === 'environment' && source.projectId) {
    const { tree: t1, env } = removeEnvironment(next, source.id, source.projectId);
    if (!env) return null;

    if (position === 'inside' && target.type === 'project') {
      const project = t1.projects.find((p) => p.id === target.id);
      if (!project) return null;
      project.environments.push(env);
      return t1;
    }

    if (target.type === 'environment' && target.projectId) {
      const project = t1.projects.find((p) => p.id === target.projectId);
      if (!project) return null;
      let idx = project.environments.findIndex((e) => e.id === target.id);
      if (idx < 0) return null;
      if (position === 'after') idx += 1;
      insertAt(project.environments, env, idx);
      return t1;
    }
    return null;
  }

  if (source.type === 'project') {
    const { tree: t1, project } = removeProject(next, source.id);
    if (!project) return null;

    if (target.type === 'project') {
      let idx = t1.projects.findIndex((p) => p.id === target.id);
      if (idx < 0) return null;
      if (position === 'after') idx += 1;
      insertAt(t1.projects, project, idx);
      return t1;
    }
  }

  return null;
}

export function serializeDragItem(item: DragBookmarkItem): string {
  return JSON.stringify(item);
}

export function parseDragItem(data: string): DragBookmarkItem | null {
  try {
    return JSON.parse(data) as DragBookmarkItem;
  } catch {
    return null;
  }
}
