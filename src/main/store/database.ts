import Store from 'electron-store';
import { v4 as uuidv4 } from 'uuid';
import {
  BookmarkTree,
  Snapshot,
  TempFavorite,
  FavoriteApp,
  AppSettings,
  RecentHost,
  DEFAULT_SETTINGS,
  createSampleData,
} from '../../shared/types';

interface StoreSchema {
  bookmarks: BookmarkTree;
  snapshots: Snapshot[];
  tempFavorites: TempFavorite[];
  favoriteApps: FavoriteApp[];
  settings: AppSettings;
  recentHosts: RecentHost[];
}

const store = new Store<StoreSchema>({
  name: 'workspace-dock-data',
  defaults: {
    bookmarks: createSampleData(),
    snapshots: [],
    tempFavorites: [],
    favoriteApps: [],
    settings: DEFAULT_SETTINGS,
    recentHosts: [],
  },
});

export function getBookmarks(): BookmarkTree {
  return store.get('bookmarks');
}

export function saveBookmarks(bookmarks: BookmarkTree): void {
  store.set('bookmarks', bookmarks);
}

export function getSnapshots(): Snapshot[] {
  return store.get('snapshots');
}

export function saveSnapshot(snapshot: Snapshot): void {
  const snapshots = getSnapshots();
  snapshots.unshift(snapshot);
  store.set('snapshots', snapshots.slice(0, 50));
}

export function deleteSnapshot(id: string): void {
  const snapshots = getSnapshots().filter((s) => s.id !== id);
  store.set('snapshots', snapshots);
}

export function mergeSnapshots(incoming: Snapshot[]): Snapshot[] {
  const existing = getSnapshots();
  const existingIds = new Set(existing.map((s) => s.id));
  const merged = [...existing];
  for (const snap of incoming) {
    if (!existingIds.has(snap.id)) {
      merged.push(snap);
      existingIds.add(snap.id);
    }
  }
  merged.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  return merged.slice(0, 50);
}

export function importSnapshots(incoming: Snapshot[]): Snapshot[] {
  const merged = mergeSnapshots(incoming);
  store.set('snapshots', merged);
  return merged;
}

export function getTempFavorites(): TempFavorite[] {
  const now = Date.now();
  const favorites = store.get('tempFavorites').filter((f) => new Date(f.expiresAt).getTime() > now);
  store.set('tempFavorites', favorites);
  return favorites;
}

export function saveTempFavorite(favorite: Omit<TempFavorite, 'id' | 'createdAt' | 'expiresAt'> & { expiresAt?: string }): TempFavorite {
  const settings = getSettings();
  const createdAt = new Date().toISOString();
  const expiresAt =
    favorite.expiresAt ??
    new Date(Date.now() + settings.tempFavoriteHours * 60 * 60 * 1000).toISOString();

  const item: TempFavorite = {
    id: uuidv4(),
    name: favorite.name,
    ip: favorite.ip,
    port: favorite.port,
    username: favorite.username,
    createdAt,
    expiresAt,
  };

  const favorites = getTempFavorites();
  favorites.unshift(item);
  store.set('tempFavorites', favorites);
  return item;
}

export function deleteTempFavorite(id: string): void {
  const favorites = getTempFavorites().filter((f) => f.id !== id);
  store.set('tempFavorites', favorites);
}

export function getFavoriteApps(): FavoriteApp[] {
  return store.get('favoriteApps').sort((a, b) => a.sortOrder - b.sortOrder);
}

export function saveFavoriteApp(
  app: Omit<FavoriteApp, 'id' | 'sortOrder' | 'createdAt'> & { id?: string },
): FavoriteApp {
  const apps = getFavoriteApps();
  const createdAt = new Date().toISOString();

  if (app.id) {
    const index = apps.findIndex((a) => a.id === app.id);
    if (index >= 0) {
      const updated: FavoriteApp = {
        ...apps[index],
        name: app.name,
        type: app.type,
        target: app.target,
        args: app.args,
      };
      apps[index] = updated;
      store.set('favoriteApps', apps);
      return updated;
    }
  }

  const item: FavoriteApp = {
    id: uuidv4(),
    name: app.name,
    type: app.type,
    target: app.target,
    args: app.args,
    sortOrder: apps.length,
    createdAt,
  };
  apps.push(item);
  store.set('favoriteApps', apps);
  return item;
}

export function deleteFavoriteApp(id: string): void {
  const apps = getFavoriteApps()
    .filter((a) => a.id !== id)
    .map((a, i) => ({ ...a, sortOrder: i }));
  store.set('favoriteApps', apps);
}

export function reorderFavoriteApps(ids: string[]): void {
  const apps = getFavoriteApps();
  const map = new Map(apps.map((a) => [a.id, a]));
  const reordered = ids
    .map((id, i) => {
      const app = map.get(id);
      return app ? { ...app, sortOrder: i } : null;
    })
    .filter((a): a is FavoriteApp => a !== null);
  store.set('favoriteApps', reordered);
}

export function getSettings(): AppSettings {
  return { ...DEFAULT_SETTINGS, ...store.get('settings') };
}

export function saveSettings(settings: Partial<AppSettings>): AppSettings {
  const merged = { ...getSettings(), ...settings };
  store.set('settings', merged);
  return merged;
}

export function getRecentHosts(): RecentHost[] {
  return store.get('recentHosts');
}

export function addRecentHost(host: Omit<RecentHost, 'connectedAt'>): void {
  const recent = getRecentHosts().filter((h) => h.hostId !== host.hostId);
  recent.unshift({ ...host, connectedAt: new Date().toISOString() });
  store.set('recentHosts', recent.slice(0, 20));
}

export function updateHostLastPath(hostId: string, path: string): void {
  const bookmarks = getBookmarks();
  let updated = false;

  for (const project of bookmarks.projects) {
    for (const env of project.environments) {
      for (const role of env.roles) {
        for (const host of role.hosts) {
          if (host.id === hostId) {
            host.lastPath = path;
            host.lastConnectedAt = new Date().toISOString();
            updated = true;
            break;
          }
        }
      }
    }
  }

  if (updated) {
    saveBookmarks(bookmarks);
  }
}

export { store };
