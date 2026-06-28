export type EnvironmentType = 'production' | 'staging' | 'development' | 'test';
export type RoleType = 'database' | 'gateway' | 'app' | 'storage';

export interface Host {
  id: string;
  name: string;
  ip: string;
  port: number;
  username: string;
  lastPath?: string;
  tags?: string[];
  online?: boolean;
  lastConnectedAt?: string;
}

export interface Role {
  id: string;
  name: string;
  type: RoleType;
  hosts: Host[];
}

export interface Environment {
  id: string;
  name: string;
  type: EnvironmentType;
  roles: Role[];
}

export interface Project {
  id: string;
  name: string;
  environments: Environment[];
}

export interface BookmarkTree {
  projects: Project[];
}

export interface SnapshotSession {
  hostId: string;
  hostName: string;
  ip: string;
  port: number;
  username: string;
  path: string;
  projectName?: string;
  environmentName?: string;
  environmentType?: EnvironmentType;
}

export interface WindowLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TerminalWindowLayout extends WindowLayout {
  windowId?: string;
  activeSessionId?: string;
  sessionIds?: string[];
  /** Host IDs in this window — used when restoring snapshots */
  hostIds?: string[];
}

export interface SnapshotLayout {
  terminal?: TerminalWindowLayout;
  terminals?: TerminalWindowLayout[];
}

export interface Snapshot {
  id: string;
  name: string;
  createdAt: string;
  sessions: SnapshotSession[];
  layout?: SnapshotLayout;
}

export interface SSHKeyInfo {
  path: string;
  name: string;
  type: 'ed25519' | 'rsa' | 'ecdsa' | 'other';
  hasPublicKey: boolean;
  fingerprint?: string;
}

export interface TempFavorite {
  id: string;
  name: string;
  ip: string;
  port: number;
  username: string;
  createdAt: string;
  expiresAt: string;
}

export interface RecentHost {
  hostId: string;
  hostName: string;
  ip: string;
  port: number;
  username: string;
  connectedAt: string;
  projectName?: string;
  environmentName?: string;
}

export interface AppSettings {
  theme: 'dark' | 'light' | 'system';
  sshDefaultUser: string;
  sshDefaultPort: number;
  tempFavoriteHours: number;
  panelWidth: number;
  dockWidth: number;
  useBuiltInTerminal: boolean;
  autoSnapshotEnabled: boolean;
  autoSnapshotIntervalMinutes: number;
  windowBorderEnabled: boolean;
  syncServerUrl: string;
  syncServerPort: number;
  syncLocalServerEnabled: boolean;
  sshKeyPath?: string;
  sshRememberPassphrase?: boolean;
}

export interface SearchResult {
  type: 'host' | 'project' | 'environment' | 'role';
  id: string;
  label: string;
  subtitle: string;
  host?: Host;
  projectId?: string;
  environmentId?: string;
  roleId?: string;
}

export interface SSHConnectOptions {
  ip: string;
  port: number;
  username: string;
  path?: string;
  hostId?: string;
  hostName?: string;
  projectName?: string;
  environmentName?: string;
  environmentType?: EnvironmentType;
  newWindow?: boolean;
  windowId?: string;
}

export interface BatchExecHost {
  hostId?: string;
  hostName: string;
  ip: string;
  port: number;
  username: string;
}

export interface BatchExecResult {
  hostName: string;
  ip: string;
  success: boolean;
  stdout: string;
  stderr: string;
  error?: string;
}

export interface SnapshotDiffItem {
  type: 'added' | 'removed' | 'changed' | 'unchanged';
  hostId: string;
  hostName: string;
  ip: string;
  oldPath?: string;
  newPath?: string;
  detail?: string;
}

export interface TerminalSessionInfo {
  sessionId: string;
  hostId?: string;
  hostName: string;
  ip: string;
  port: number;
  username: string;
  path?: string;
  environmentType?: EnvironmentType;
  windowId?: string;
}

export interface SyncStatus {
  running: boolean;
  port: number;
  lastSyncAt?: string;
  lastError?: string;
}

export const ENV_COLORS: Record<EnvironmentType, string> = {
  production: '#3fb950',
  staging: '#d29922',
  development: '#58a6ff',
  test: '#8b949e',
};

/** Window border colors (production=red per design, test=green) */
export const ENV_BORDER_COLORS: Record<EnvironmentType, string> = {
  production: '#f85149',
  staging: '#d29922',
  development: '#58a6ff',
  test: '#3fb950',
};

export const ENV_LABELS: Record<EnvironmentType, string> = {
  production: '生产',
  staging: '预发布',
  development: '开发',
  test: '测试',
};

export const ROLE_ICONS: Record<RoleType, string> = {
  database: '🗄',
  gateway: '🌐',
  app: '🖥',
  storage: '📦',
};

export const ROLE_LABELS: Record<RoleType, string> = {
  database: '数据库',
  gateway: '网关',
  app: '应用服务器',
  storage: '存储',
};

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  sshDefaultUser: 'root',
  sshDefaultPort: 22,
  tempFavoriteHours: 24,
  panelWidth: 360,
  dockWidth: 48,
  useBuiltInTerminal: true,
  autoSnapshotEnabled: false,
  autoSnapshotIntervalMinutes: 60,
  windowBorderEnabled: true,
  syncServerUrl: '',
  syncServerPort: 9876,
  syncLocalServerEnabled: false,
};

export const IPC_CHANNELS = {
  GET_BOOKMARKS: 'bookmarks:get',
  SAVE_BOOKMARKS: 'bookmarks:save',
  EXPORT_BOOKMARKS: 'bookmarks:export',
  IMPORT_BOOKMARKS: 'bookmarks:import',
  GET_SNAPSHOTS: 'snapshots:get',
  SAVE_SNAPSHOT: 'snapshots:save',
  DELETE_SNAPSHOT: 'snapshots:delete',
  EXPORT_SNAPSHOTS: 'snapshots:export',
  GET_TEMP_FAVORITES: 'temp-favorites:get',
  SAVE_TEMP_FAVORITE: 'temp-favorites:save',
  DELETE_TEMP_FAVORITE: 'temp-favorites:delete',
  GET_SETTINGS: 'settings:get',
  SAVE_SETTINGS: 'settings:save',
  GET_RECENT_HOSTS: 'recent:get',
  SSH_CONNECT: 'ssh:connect',
  SSH_CHECK_ONLINE: 'ssh:check-online',
  SSH_BATCH_CONNECT: 'ssh:batch-connect',
  SSH_BATCH_EXEC: 'ssh:batch-exec',
  COPY_TO_CLIPBOARD: 'clipboard:copy',
  PANEL_TOGGLE: 'panel:toggle',
  PANEL_SET_EXPANDED: 'panel:set-expanded',
  GET_PANEL_STATE: 'panel:get-state',
  ON_PANEL_STATE_CHANGED: 'panel:state-changed',
  ON_OPEN_SEARCH: 'search:open',
  TERMINAL_OPEN: 'terminal:open',
  TERMINAL_NEW_WINDOW: 'terminal:new-window',
  TERMINAL_WRITE: 'terminal:write',
  TERMINAL_RESIZE: 'terminal:resize',
  TERMINAL_CLOSE: 'terminal:close',
  TERMINAL_LIST: 'terminal:list',
  ON_TERMINAL_DATA: 'terminal:data',
  ON_TERMINAL_EXIT: 'terminal:exit',
  ON_TERMINAL_SESSIONS: 'terminal:sessions-changed',
  SET_ENV_BORDER: 'window:set-env-border',
  REGISTER_ACTIVE_SESSIONS: 'sessions:register',
  ON_AUTO_SNAPSHOT: 'snapshot:auto-saved',
  SYNC_PUSH: 'sync:push',
  SYNC_PULL: 'sync:pull',
  SYNC_START_SERVER: 'sync:start-server',
  SYNC_STOP_SERVER: 'sync:stop-server',
  SYNC_STATUS: 'sync:status',
  SSH_KEYS_LIST: 'ssh:keys-list',
  SSH_KEY_BROWSE: 'ssh:key-browse',
  TERMINAL_GET_LAYOUT: 'terminal:get-layout',
  TERMINAL_GET_ALL_LAYOUTS: 'terminal:get-all-layouts',
  TERMINAL_APPLY_LAYOUT: 'terminal:apply-layout',
  TERMINAL_SET_ACTIVE: 'terminal:set-active',
  SSH_SET_PASSPHRASE: 'ssh:set-passphrase',
  SSH_CLEAR_PASSPHRASE: 'ssh:clear-passphrase',
  SSH_HAS_PASSPHRASE: 'ssh:has-passphrase',
  SSH_KEY_NEEDS_PASSPHRASE: 'ssh:key-needs-passphrase',
} as const;

export interface FlatHost extends Host {
  projectId: string;
  projectName: string;
  environmentId: string;
  environmentName: string;
  environmentType: EnvironmentType;
  roleId: string;
  roleName: string;
  roleType: RoleType;
}

export function flattenHosts(tree: BookmarkTree): FlatHost[] {
  const result: FlatHost[] = [];
  for (const project of tree.projects) {
    for (const env of project.environments) {
      for (const role of env.roles) {
        for (const host of role.hosts) {
          result.push({
            ...host,
            projectId: project.id,
            projectName: project.name,
            environmentId: env.id,
            environmentName: env.name,
            environmentType: env.type,
            roleId: role.id,
            roleName: role.name,
            roleType: role.type,
          });
        }
      }
    }
  }
  return result;
}

export function diffSnapshots(baseline: Snapshot, current: Snapshot): SnapshotDiffItem[] {
  const items: SnapshotDiffItem[] = [];
  const baseMap = new Map(baseline.sessions.map((s) => [s.hostId, s]));
  const currMap = new Map(current.sessions.map((s) => [s.hostId, s]));

  for (const [hostId, curr] of currMap) {
    const base = baseMap.get(hostId);
    if (!base) {
      items.push({
        type: 'added',
        hostId,
        hostName: curr.hostName,
        ip: curr.ip,
        newPath: curr.path,
        detail: '新增主机',
      });
    } else if (base.ip !== curr.ip) {
      items.push({
        type: 'changed',
        hostId,
        hostName: curr.hostName,
        ip: curr.ip,
        oldPath: base.path,
        newPath: curr.path,
        detail: `IP 变更: ${base.ip} → ${curr.ip}`,
      });
    } else if (base.path !== curr.path) {
      items.push({
        type: 'changed',
        hostId,
        hostName: curr.hostName,
        ip: curr.ip,
        oldPath: base.path,
        newPath: curr.path,
        detail: `路径变更: ${base.path} → ${curr.path}`,
      });
    } else {
      items.push({
        type: 'unchanged',
        hostId,
        hostName: curr.hostName,
        ip: curr.ip,
        oldPath: base.path,
        newPath: curr.path,
      });
    }
  }

  for (const [hostId, base] of baseMap) {
    if (!currMap.has(hostId)) {
      items.push({
        type: 'removed',
        hostId,
        hostName: base.hostName,
        ip: base.ip,
        oldPath: base.path,
        detail: '主机已下线',
      });
    }
  }

  return items;
}

export function mergeBookmarkTrees(local: BookmarkTree, remote: BookmarkTree): BookmarkTree {
  const projectMap = new Map(local.projects.map((p) => [p.name, structuredClone(p)]));

  for (const remoteProject of remote.projects) {
    const existing = projectMap.get(remoteProject.name);
    if (!existing) {
      projectMap.set(remoteProject.name, structuredClone(remoteProject));
      continue;
    }
    for (const remoteEnv of remoteProject.environments) {
      const envMatch = existing.environments.find((e) => e.name === remoteEnv.name);
      if (!envMatch) {
        existing.environments.push(structuredClone(remoteEnv));
        continue;
      }
      for (const remoteRole of remoteEnv.roles) {
        const roleMatch = envMatch.roles.find((r) => r.name === remoteRole.name);
        if (!roleMatch) {
          envMatch.roles.push(structuredClone(remoteRole));
          continue;
        }
        for (const remoteHost of remoteRole.hosts) {
          const hostMatch = roleMatch.hosts.find(
            (h) => h.ip === remoteHost.ip || h.name === remoteHost.name,
          );
          if (!hostMatch) {
            roleMatch.hosts.push(structuredClone(remoteHost));
          }
        }
      }
    }
  }

  return { projects: Array.from(projectMap.values()) };
}

export function createSampleData(): BookmarkTree {
  const now = new Date().toISOString();
  return {
    projects: [
      {
        id: 'proj-payment',
        name: '支付系统',
        environments: [
          {
            id: 'env-payment-prod',
            name: '生产',
            type: 'production',
            roles: [
              {
                id: 'role-payment-prod-db',
                name: '数据库',
                type: 'database',
                hosts: [
                  {
                    id: 'host-payment-prod-db-1',
                    name: 'payment-db-master',
                    ip: '10.0.1.101',
                    port: 22,
                    username: 'root',
                    lastPath: '/var/log/mysql',
                    online: undefined,
                    lastConnectedAt: now,
                  },
                  {
                    id: 'host-payment-prod-db-2',
                    name: 'payment-db-slave',
                    ip: '10.0.1.102',
                    port: 22,
                    username: 'root',
                    lastPath: '/var/log/mysql',
                  },
                ],
              },
              {
                id: 'role-payment-prod-app',
                name: '应用服务器',
                type: 'app',
                hosts: [
                  {
                    id: 'host-payment-prod-app-1',
                    name: 'payment-app-01',
                    ip: '10.0.1.201',
                    port: 22,
                    username: 'deploy',
                    lastPath: '/opt/payment/app',
                  },
                ],
              },
            ],
          },
          {
            id: 'env-payment-staging',
            name: '预发布',
            type: 'staging',
            roles: [
              {
                id: 'role-payment-staging-app',
                name: '应用服务器',
                type: 'app',
                hosts: [
                  {
                    id: 'host-payment-staging-app-1',
                    name: 'payment-staging-01',
                    ip: '10.0.2.201',
                    port: 22,
                    username: 'deploy',
                    lastPath: '/opt/payment/app',
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'proj-monitor',
        name: '监控系统',
        environments: [
          {
            id: 'env-monitor-prod',
            name: '生产',
            type: 'production',
            roles: [
              {
                id: 'role-monitor-prod-app',
                name: '应用服务器',
                type: 'app',
                hosts: [
                  {
                    id: 'host-monitor-prod-1',
                    name: 'grafana-01',
                    ip: '10.0.3.101',
                    port: 22,
                    username: 'admin',
                    lastPath: '/etc/grafana',
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
}
