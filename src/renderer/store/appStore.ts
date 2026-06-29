import type {
  Host,
  Project,
  Environment,
  Role,
  BookmarkTree,
  Snapshot,
  TempFavorite,
  FavoriteApp,
  AppSettings,
  RecentHost,
  FlatHost,
  SearchResult,
  SSHConnectOptions,
  EnvironmentType,
  ClipboardCapture,
} from '@shared/types';
import { DEFAULT_SETTINGS, flattenHosts, formatClipboardHostLabel } from '@shared/types';
import type { DragBookmarkItem, DropPosition } from '@shared/bookmarkTreeOps';
import { moveBookmarkNode } from '@shared/bookmarkTreeOps';
import { create } from 'zustand';
import { getAPI } from '../types/electron';
import { v4 as uuidv4 } from 'uuid';

export const PANEL_ANIMATION_MS = 320;

export type PanelTab = 'bookmarks' | 'snapshots' | 'temp' | 'apps' | 'clipboard';

interface AppState {
  panelExpanded: boolean;
  panelVisible: boolean;
  panelAnimating: boolean;
  activeTab: PanelTab;
  bookmarks: BookmarkTree;
  snapshots: Snapshot[];
  tempFavorites: TempFavorite[];
  favoriteApps: FavoriteApp[];
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
  clipboardCapture: ClipboardCapture | null;

  setPanelExpanded: (expanded: boolean) => void;
  openPanel: () => Promise<void>;
  closePanel: () => Promise<void>;
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

  addTempFavorite: (
    name: string,
    ip: string,
    username?: string,
    port?: number,
  ) => Promise<TempFavorite>;
  deleteTempFavorite: (id: string) => Promise<void>;
  convertTempToBookmark: (tempId: string, projectId: string, envId: string, roleId: string) => Promise<void>;
  setClipboardCapture: (capture: ClipboardCapture | null) => void;
  dismissClipboardHost: () => Promise<void>;
  copyClipboardCapture: () => Promise<void>;
  addTempFavoriteFromClipboard: (options?: { connect?: boolean }) => Promise<void>;

  addFavoriteApp: (
    app: Omit<FavoriteApp, 'id' | 'sortOrder' | 'createdAt'>,
  ) => Promise<void>;
  updateFavoriteApp: (
    id: string,
    updates: Omit<FavoriteApp, 'id' | 'sortOrder' | 'createdAt'>,
  ) => Promise<void>;
  deleteFavoriteApp: (id: string) => Promise<void>;
  launchFavoriteApp: (id: string) => Promise<void>;
  launchAllFavoriteApps: () => Promise<{ launched: number; failed: number }>;
  reorderFavoriteApps: (ids: string[]) => Promise<void>;
  importSnapshots: () => Promise<boolean>;
  captureScreenshot: () => Promise<{ success: boolean; error?: string; cancelled?: boolean }>;

  connectHost: (flatHost: FlatHost, path?: string) => Promise<void>;
  connectTempFavorite: (favorite: TempFavorite) => Promise<void>;
  toggleHostSelection: (hostId: string) => void;
  clearSelection: () => void;

  addActiveSession: (session: SSHConnectOptions) => void;
  removeActiveSession: (hostId: string) => void;
  clearPassphrasePrompt: () => void;
  clearActiveSessions: () => void;

  search: (query: string) => SearchResult[];
  getQuickActions: (filter?: string) => SearchResult[];
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
  panelVisible: false,
  panelAnimating: false,
  activeTab: 'bookmarks',
  bookmarks: { projects: [] },
  snapshots: [],
  tempFavorites: [],
  favoriteApps: [],
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
  clipboardCapture: null,

  setPanelExpanded: (expanded) =>
    set({ panelExpanded: expanded, panelVisible: expanded }),

  openPanel: async () => {
    if (get().panelExpanded || get().panelAnimating) return;
    set({ panelAnimating: true, panelExpanded: true, panelVisible: false });
    await getAPI().setPanelExpanded(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        set({ panelVisible: true });
        setTimeout(() => set({ panelAnimating: false }), PANEL_ANIMATION_MS);
      });
    });
  },

  closePanel: async () => {
    if (!get().panelExpanded || get().panelAnimating) return;
    set({ panelAnimating: true, panelVisible: false });
    await new Promise((resolve) => setTimeout(resolve, PANEL_ANIMATION_MS));
    await getAPI().setPanelExpanded(false);
    set({ panelExpanded: false, panelAnimating: false });
  },

  togglePanel: async () => {
    if (get().panelExpanded) await get().closePanel();
    else await get().openPanel();
  },
  setActiveTab: (tab) => set({ activeTab: tab }),
  setSearchOpen: (open) => set({ searchOpen: open }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  setBatchModalOpen: (open) => set({ batchModalOpen: open }),
  setActiveEnvBorder: (env) => set({ activeEnvBorder: env }),

  loadAll: async () => {
    set({ loading: true });
    const api = getAPI();
    const [bookmarks, snapshots, tempFavorites, favoriteApps, settings, recentHosts, panelExpanded] =
      await Promise.all([
        api.getBookmarks(),
        api.getSnapshots(),
        api.getTempFavorites(),
        api.getFavoriteApps(),
        api.getSettings(),
        api.getRecentHosts(),
        api.getPanelState(),
      ]);
    set({
      bookmarks,
      snapshots,
      tempFavorites,
      favoriteApps,
      settings,
      recentHosts,
      panelExpanded,
      panelVisible: panelExpanded,
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
    const item = await getAPI().saveTempFavorite({
      name,
      ip,
      username: username ?? settings.sshDefaultUser,
      port: port ?? settings.sshDefaultPort,
    });
    const tempFavorites = await getAPI().getTempFavorites();
    set({ tempFavorites });
    return item;
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

  setClipboardCapture: (capture) => set({ clipboardCapture: capture }),

  dismissClipboardHost: async () => {
    await getAPI().dismissClipboardHost();
    set({ clipboardCapture: null });
  },

  copyClipboardCapture: async () => {
    const clip = get().clipboardCapture;
    if (!clip) return;
    await getAPI().copyToClipboard(clip.text);
  },

  addTempFavoriteFromClipboard: async (options = {}) => {
    const { connect = false } = options;
    const clip = get().clipboardCapture;
    if (!clip) return;
    const settings = get().settings;

    let favorite;
    if (clip.host) {
      const name = formatClipboardHostLabel(clip.host);
      favorite = await get().addTempFavorite(
        name,
        clip.host.host,
        clip.host.username ?? settings.sshDefaultUser,
        clip.host.port ?? settings.sshDefaultPort,
      );
    } else {
      const line = clip.text.split(/\r?\n/).map((l) => l.trim()).find(Boolean) ?? clip.text;
      favorite = await get().addTempFavorite(
        line.slice(0, 64),
        line.slice(0, 120),
        settings.sshDefaultUser,
        settings.sshDefaultPort,
      );
    }

    if (connect) {
      await get().connectTempFavorite(favorite);
    }
    await get().dismissClipboardHost();
  },

  addFavoriteApp: async (app) => {
    await getAPI().saveFavoriteApp(app);
    const favoriteApps = await getAPI().getFavoriteApps();
    set({ favoriteApps });
  },

  updateFavoriteApp: async (id, updates) => {
    await getAPI().saveFavoriteApp({ ...updates, id });
    const favoriteApps = await getAPI().getFavoriteApps();
    set({ favoriteApps });
  },

  deleteFavoriteApp: async (id) => {
    await getAPI().deleteFavoriteApp(id);
    const favoriteApps = await getAPI().getFavoriteApps();
    set({ favoriteApps });
  },

  launchFavoriteApp: async (id) => {
    const result = await getAPI().launchFavoriteApp(id);
    if (!result.success) {
      throw new Error(result.error ?? '启动失败');
    }
  },

  launchAllFavoriteApps: async () => {
    const result = await getAPI().launchAllFavoriteApps();
    return { launched: result.launched, failed: result.failed };
  },

  reorderFavoriteApps: async (ids) => {
    await getAPI().reorderFavoriteApps(ids);
    const favoriteApps = await getAPI().getFavoriteApps();
    set({ favoriteApps });
  },

  importSnapshots: async () => {
    const result = await getAPI().importSnapshots();
    if (result.success && result.snapshots) {
      set({ snapshots: result.snapshots });
      return true;
    }
    return false;
  },

  captureScreenshot: async () => getAPI().captureScreenshot(),

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

  getQuickActions: (filter = '') => {
    const actions: SearchResult[] = [
      {
        type: 'action',
        id: 'action-launch-all',
        action: 'launch-all-apps',
        label: '全部启动应用',
        subtitle: '启动所有收藏应用',
      },
      {
        type: 'action',
        id: 'action-save-snapshot',
        action: 'save-snapshot',
        label: '保存当前快照',
        subtitle: '保存活跃 SSH 会话',
      },
      {
        type: 'action',
        id: 'action-screenshot',
        action: 'screenshot',
        label: '区域截图',
        subtitle: '框选屏幕区域并复制到剪贴板',
      },
      {
        type: 'action',
        id: 'action-tab-bookmarks',
        action: 'open-tab',
        tab: 'bookmarks',
        label: '打开书签面板',
        subtitle: '切换到书签标签',
      },
      {
        type: 'action',
        id: 'action-tab-snapshots',
        action: 'open-tab',
        tab: 'snapshots',
        label: '打开快照面板',
        subtitle: '切换到快照标签',
      },
      {
        type: 'action',
        id: 'action-tab-temp',
        action: 'open-tab',
        tab: 'temp',
        label: '打开临时 SSH',
        subtitle: '切换到临时 SSH 标签',
      },
      {
        type: 'action',
        id: 'action-tab-clipboard',
        action: 'open-tab',
        tab: 'clipboard',
        label: '打开剪贴板',
        subtitle: '查看复制的内容',
      },
      {
        type: 'action',
        id: 'action-tab-apps',
        action: 'open-tab',
        tab: 'apps',
        label: '打开收藏应用',
        subtitle: '切换到应用标签',
      },
    ];
    const q = filter.toLowerCase().trim();
    if (!q) return actions;
    return actions.filter(
      (a) =>
        a.label.toLowerCase().includes(q) ||
        a.subtitle.toLowerCase().includes(q),
    );
  },

  search: (query) => {
    const raw = query.trim();
    if (!raw) return [];

    if (raw.startsWith('>')) {
      return get().getQuickActions(raw.slice(1));
    }

    const q = raw.toLowerCase();
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

    for (const app of get().favoriteApps) {
      const searchable = [app.name, app.target, app.type].join(' ').toLowerCase();
      if (terms.every((term) => searchable.includes(term))) {
        results.push({
          type: 'app',
          id: app.id,
          label: app.name,
          subtitle: app.type === 'url' ? app.target : `本地 · ${app.target}`,
        });
      }
    }

    for (const snapshot of get().snapshots) {
      const searchable = [
        snapshot.name,
        ...snapshot.sessions.map((s) => `${s.hostName} ${s.ip}`),
      ]
        .join(' ')
        .toLowerCase();
      if (terms.every((term) => searchable.includes(term))) {
        results.push({
          type: 'snapshot',
          id: snapshot.id,
          label: snapshot.name,
          subtitle: `${snapshot.sessions.length} 台主机`,
          snapshot,
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
