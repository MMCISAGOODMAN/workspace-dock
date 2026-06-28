import type {
  Host,
  Project,
  Environment,
  Role,
  BookmarkTree,
  Snapshot,
  TempFavorite,
  AppSettings,
  RecentHost,
  FlatHost,
  SearchResult,
  SSHConnectOptions,
  EnvironmentType,
} from '@shared/types';
import { DEFAULT_SETTINGS, flattenHosts } from '@shared/types';
import type { DragBookmarkItem, DropPosition } from '@shared/bookmarkTreeOps';
import { moveBookmarkNode } from '@shared/bookmarkTreeOps';
import { create } from 'zustand';
import { getAPI } from '../types/electron';
import { v4 as uuidv4 } from 'uuid';

export type PanelTab = 'bookmarks' | 'snapshots' | 'temp';

interface AppState {
  panelExpanded: boolean;
  activeTab: PanelTab;
  bookmarks: BookmarkTree;
  snapshots: Snapshot[];
  tempFavorites: TempFavorite[];
  settings: AppSettings;
  recentHosts: RecentHost[];
  searchOpen: boolean;
  settingsOpen: boolean;
  batchModalOpen: boolean;
  loading: boolean;
  selectedHostIds: Set<string>;
  activeSessions: SSHConnectOptions[];
  activeEnvBorder: EnvironmentType | null;
  passphrasePrompt: { retry: () => Promise<void> } | null;

  setPanelExpanded: (expanded: boolean) => void;
  togglePanel: () => Promise<void>;
  setActiveTab: (tab: PanelTab) => void;
  setSearchOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setBatchModalOpen: (open: boolean) => void;
  setActiveEnvBorder: (env: EnvironmentType | null) => void;
  loadAll: () => Promise<void>;

  saveBookmarks: (bookmarks: BookmarkTree) => Promise<void>;
  addProject: (name: string) => void;
  addEnvironment: (projectId: string, name: string, type: Environment['type']) => void;
  addRole: (projectId: string, envId: string, name: string, type: Role['type']) => void;
  addHost: (
    projectId: string,
    envId: string,
    roleId: string,
    host: Omit<Host, 'id'>,
  ) => void;
  updateHost: (hostId: string, updates: Partial<Host>) => void;
  updateProject: (id: string, updates: Partial<Pick<Project, 'name'>>) => void;
  updateEnvironment: (
    projectId: string,
    envId: string,
    updates: Partial<Pick<Environment, 'name' | 'type'>>,
  ) => void;
  updateRole: (
    projectId: string,
    envId: string,
    roleId: string,
    updates: Partial<Pick<Role, 'name' | 'type'>>,
  ) => void;
  deleteHost: (hostId: string) => void;
  deleteNode: (type: 'project' | 'environment' | 'role', id: string, parentIds?: string[]) => void;
  moveBookmarkNode: (
    source: DragBookmarkItem,
    target: DragBookmarkItem,
    position: DropPosition,
  ) => void;

  saveSnapshot: (name: string) => Promise<void>;
  restoreSnapshot: (snapshot: Snapshot) => Promise<void>;
  deleteSnapshot: (id: string) => Promise<void>;

  addTempFavorite: (name: string, ip: string, username?: string, port?: number) => Promise<void>;
  deleteTempFavorite: (id: string) => Promise<void>;
  convertTempToBookmark: (tempId: string, projectId: string, envId: string, roleId: string) => Promise<void>;

  connectHost: (flatHost: FlatHost, path?: string) => Promise<void>;
  connectTempFavorite: (favorite: TempFavorite) => Promise<void>;
  toggleHostSelection: (hostId: string) => void;
  clearSelection: () => void;

  addActiveSession: (session: SSHConnectOptions) => void;
  removeActiveSession: (hostId: string) => void;
  clearPassphrasePrompt: () => void;
  clearActiveSessions: () => void;

  search: (query: string) => SearchResult[];
}

function findHostLocation(
  tree: BookmarkTree,
  hostId: string,
): { project: Project; env: Environment; role: Role; host: Host } | null {
  for (const project of tree.projects) {
    for (const env of project.environments) {
      for (const role of env.roles) {
        const host = role.hosts.find((h) => h.id === hostId);
        if (host) return { project, env, role, host };
      }
    }
  }
  return null;
}

export const useAppStore = create<AppState>((set, get) => ({
  panelExpanded: false,
  activeTab: 'bookmarks',
  bookmarks: { projects: [] },
  snapshots: [],
  tempFavorites: [],
  settings: { ...DEFAULT_SETTINGS },
  recentHosts: [],
  searchOpen: false,
  settingsOpen: false,
  batchModalOpen: false,
  loading: true,
  selectedHostIds: new Set(),
  activeSessions: [],
  activeEnvBorder: null,
  passphrasePrompt: null,

  setPanelExpanded: (expanded) => set({ panelExpanded: expanded }),
  togglePanel: async () => {
    const expanded = await getAPI().togglePanel();
    set({ panelExpanded: expanded });
  },
  setActiveTab: (tab) => set({ activeTab: tab }),
  setSearchOpen: (open) => set({ searchOpen: open }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  setBatchModalOpen: (open) => set({ batchModalOpen: open }),
  setActiveEnvBorder: (env) => set({ activeEnvBorder: env }),

  loadAll: async () => {
    set({ loading: true });
    const api = getAPI();
    const [bookmarks, snapshots, tempFavorites, settings, recentHosts, panelExpanded] =
      await Promise.all([
        api.getBookmarks(),
        api.getSnapshots(),
        api.getTempFavorites(),
        api.getSettings(),
        api.getRecentHosts(),
        api.getPanelState(),
      ]);
    set({
      bookmarks,
      snapshots,
      tempFavorites,
      settings,
      recentHosts,
      panelExpanded,
      loading: false,
    });
  },

  saveBookmarks: async (bookmarks) => {
    await getAPI().saveBookmarks(bookmarks);
    set({ bookmarks });
  },

  addProject: (name) => {
    const bookmarks = { ...get().bookmarks };
    bookmarks.projects = [
      ...bookmarks.projects,
      { id: uuidv4(), name, environments: [] },
    ];
    get().saveBookmarks(bookmarks);
  },

  addEnvironment: (projectId, name, type) => {
    const bookmarks = structuredClone(get().bookmarks);
    const project = bookmarks.projects.find((p) => p.id === projectId);
    if (!project) return;
    project.environments.push({ id: uuidv4(), name, type, roles: [] });
    get().saveBookmarks(bookmarks);
  },

  addRole: (projectId, envId, name, type) => {
    const bookmarks = structuredClone(get().bookmarks);
    const project = bookmarks.projects.find((p) => p.id === projectId);
    const env = project?.environments.find((e) => e.id === envId);
    if (!env) return;
    env.roles.push({ id: uuidv4(), name, type, hosts: [] });
    get().saveBookmarks(bookmarks);
  },

  addHost: (projectId, envId, roleId, hostData) => {
    const bookmarks = structuredClone(get().bookmarks);
    const project = bookmarks.projects.find((p) => p.id === projectId);
    const env = project?.environments.find((e) => e.id === envId);
    const role = env?.roles.find((r) => r.id === roleId);
    if (!role) return;
    role.hosts.push({ ...hostData, id: uuidv4() });
    get().saveBookmarks(bookmarks);
  },

  updateHost: (hostId, updates) => {
    const loc = findHostLocation(get().bookmarks, hostId);
    if (!loc) return;
    const bookmarks = structuredClone(get().bookmarks);
    const loc2 = findHostLocation(bookmarks, hostId);
    if (!loc2) return;
    Object.assign(loc2.host, updates);
    get().saveBookmarks(bookmarks);
  },

  updateProject: (id, updates) => {
    const bookmarks = structuredClone(get().bookmarks);
    const project = bookmarks.projects.find((p) => p.id === id);
    if (!project) return;
    Object.assign(project, updates);
    get().saveBookmarks(bookmarks);
  },

  updateEnvironment: (projectId, envId, updates) => {
    const bookmarks = structuredClone(get().bookmarks);
    const env = bookmarks.projects.find((p) => p.id === projectId)?.environments.find((e) => e.id === envId);
    if (!env) return;
    Object.assign(env, updates);
    get().saveBookmarks(bookmarks);
  },

  updateRole: (projectId, envId, roleId, updates) => {
    const bookmarks = structuredClone(get().bookmarks);
    const role = bookmarks.projects
      .find((p) => p.id === projectId)
      ?.environments.find((e) => e.id === envId)
      ?.roles.find((r) => r.id === roleId);
    if (!role) return;
    Object.assign(role, updates);
    get().saveBookmarks(bookmarks);
  },

  deleteHost: (hostId) => {
    const bookmarks = structuredClone(get().bookmarks);
    for (const project of bookmarks.projects) {
      for (const env of project.environments) {
        for (const role of env.roles) {
          role.hosts = role.hosts.filter((h) => h.id !== hostId);
        }
      }
    }
    get().saveBookmarks(bookmarks);
  },

  deleteNode: (type, id, parentIds = []) => {
    const bookmarks = structuredClone(get().bookmarks);
    if (type === 'project') {
      bookmarks.projects = bookmarks.projects.filter((p) => p.id !== id);
    } else if (type === 'environment' && parentIds[0]) {
      const project = bookmarks.projects.find((p) => p.id === parentIds[0]);
      if (project) {
        project.environments = project.environments.filter((e) => e.id !== id);
      }
    } else if (type === 'role' && parentIds[0] && parentIds[1]) {
      const project = bookmarks.projects.find((p) => p.id === parentIds[0]);
      const env = project?.environments.find((e) => e.id === parentIds[1]);
      if (env) {
        env.roles = env.roles.filter((r) => r.id !== id);
      }
    }
    get().saveBookmarks(bookmarks);
  },

  moveBookmarkNode: (source, target, position) => {
    const result = moveBookmarkNode(get().bookmarks, source, target, position);
    if (result) get().saveBookmarks(result);
  },

  saveSnapshot: async (name) => {
    const { activeSessions } = get();
    if (activeSessions.length === 0) {
      throw new Error('没有活跃的终端会话可保存');
    }
    const terminalLayouts = await getAPI().terminalGetAllLayouts();
    const layout =
      terminalLayouts.length > 0
        ? terminalLayouts.length === 1
          ? { terminal: terminalLayouts[0] }
          : { terminals: terminalLayouts }
        : undefined;
    const snapshot: Snapshot = {
      id: uuidv4(),
      name,
      createdAt: new Date().toISOString(),
      sessions: activeSessions.map((s) => ({
        hostId: s.hostId ?? uuidv4(),
        hostName: s.hostName ?? s.ip,
        ip: s.ip,
        port: s.port,
        username: s.username,
        path: s.path ?? '/',
        projectName: s.projectName,
        environmentName: s.environmentName,
        environmentType: s.environmentType,
      })),
      layout,
    };
    await getAPI().saveSnapshot(snapshot);
    const snapshots = await getAPI().getSnapshots();
    set({ snapshots });
  },

  restoreSnapshot: async (snapshot) => {
    const sessions: SSHConnectOptions[] = snapshot.sessions.map((s) => ({
      hostId: s.hostId,
      hostName: s.hostName,
      ip: s.ip,
      port: s.port,
      username: s.username,
      path: s.path,
      projectName: s.projectName,
      environmentName: s.environmentName,
      environmentType: s.environmentType,
    }));
    const result = await getAPI().sshBatchConnect(
      snapshot.layout?.terminals?.length
        ? { sessions, layout: snapshot.layout }
        : snapshot.layout?.terminal
          ? { sessions, layout: snapshot.layout.terminal }
          : sessions,
    );
    if (result.success) {
      set({ activeSessions: sessions });
    } else {
      throw new Error(result.error ?? '恢复快照失败');
    }
  },

  deleteSnapshot: async (id) => {
    await getAPI().deleteSnapshot(id);
    const snapshots = await getAPI().getSnapshots();
    set({ snapshots });
  },

  addTempFavorite: async (name, ip, username, port) => {
    const settings = get().settings;
    await getAPI().saveTempFavorite({
      name,
      ip,
      username: username ?? settings.sshDefaultUser,
      port: port ?? settings.sshDefaultPort,
    });
    const tempFavorites = await getAPI().getTempFavorites();
    set({ tempFavorites });
  },

  deleteTempFavorite: async (id) => {
    await getAPI().deleteTempFavorite(id);
    const tempFavorites = await getAPI().getTempFavorites();
    set({ tempFavorites });
  },

  convertTempToBookmark: async (tempId, projectId, envId, roleId) => {
    const temp = get().tempFavorites.find((t) => t.id === tempId);
    if (!temp) return;
    get().addHost(projectId, envId, roleId, {
      name: temp.name,
      ip: temp.ip,
      port: temp.port,
      username: temp.username,
    });
    await get().deleteTempFavorite(tempId);
  },

  connectHost: async (flatHost, path, opts?: { newWindow?: boolean }) => {
    const connectPath = path ?? flatHost.lastPath;
    const options: SSHConnectOptions = {
      hostId: flatHost.id,
      hostName: flatHost.name,
      ip: flatHost.ip,
      port: flatHost.port,
      username: flatHost.username,
      path: connectPath,
      projectName: flatHost.projectName,
      environmentName: flatHost.environmentName,
      environmentType: flatHost.environmentType,
      newWindow: opts?.newWindow,
    };

    const doConnect = async () => {
      const result = await getAPI().sshConnect(options);
      if (result.needsPassphrase) {
        set({
          passphrasePrompt: {
            retry: async () => {
              await get().connectHost(flatHost, path, opts);
            },
          },
        });
        return;
      }
      if (result.success) {
        get().addActiveSession(options);
        if (get().settings.windowBorderEnabled) {
          set({ activeEnvBorder: flatHost.environmentType });
        }
        const recentHosts = await getAPI().getRecentHosts();
        set({ recentHosts });
      } else {
        throw new Error(result.error ?? '连接失败');
      }
    };

    await doConnect();
  },

  connectTempFavorite: async (favorite) => {
    const options: SSHConnectOptions = {
      hostId: favorite.id,
      hostName: favorite.name,
      ip: favorite.ip,
      port: favorite.port,
      username: favorite.username,
    };
    const result = await getAPI().sshConnect(options);
    if (result.success) {
      get().addActiveSession(options);
    } else {
      throw new Error(result.error ?? '连接失败');
    }
  },

  toggleHostSelection: (hostId) => {
    const selected = new Set(get().selectedHostIds);
    if (selected.has(hostId)) {
      selected.delete(hostId);
    } else {
      selected.add(hostId);
    }
    set({ selectedHostIds: selected });
  },

  clearSelection: () => set({ selectedHostIds: new Set() }),

  addActiveSession: (session) => {
    const sessions = get().activeSessions.filter((s) => s.hostId !== session.hostId);
    sessions.push(session);
    set({ activeSessions: sessions });
  },

  removeActiveSession: (hostId) => {
    set({
      activeSessions: get().activeSessions.filter((s) => s.hostId !== hostId),
    });
  },

  clearPassphrasePrompt: () => set({ passphrasePrompt: null }),

  clearActiveSessions: () => set({ activeSessions: [] }),

  search: (query) => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    const terms = q.split(/\s+/);
    const flat = flattenHosts(get().bookmarks);
    const results: SearchResult[] = [];

    for (const host of flat) {
      const searchable = [
        host.name,
        host.ip,
        host.projectName,
        host.environmentName,
        host.roleName,
        ...(host.tags ?? []),
      ]
        .join(' ')
        .toLowerCase();

      const matched = terms.every((term) => searchable.includes(term));
      if (matched) {
        results.push({
          type: 'host',
          id: host.id,
          label: host.name,
          subtitle: `${host.projectName} / ${host.environmentName} / ${host.ip}`,
          host,
          projectId: host.projectId,
          environmentId: host.environmentId,
          roleId: host.roleId,
        });
      }
    }

    for (const project of get().bookmarks.projects) {
      if (terms.every((t) => project.name.toLowerCase().includes(t))) {
        results.push({
          type: 'project',
          id: project.id,
          label: project.name,
          subtitle: `${project.environments.length} 个环境`,
        });
      }
    }

    return results.slice(0, 20);
  },
}));

interface ToastState {
  toasts: { id: string; message: string; type: 'success' | 'error' | 'info' }[];
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (message, type = 'info') => {
    const id = uuidv4();
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 3000);
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
