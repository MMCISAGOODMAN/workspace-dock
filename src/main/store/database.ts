import Store from 'electron-store';
import { v4 as uuidv4 } from 'uuid';
import {
  BookmarkTree,
  Snapshot,
  TempFavorite,
  AppSettings,
  RecentHost,
  DEFAULT_SETTINGS,
  createSampleData,
} from '../../shared/types';

interface StoreSchema {
  bookmarks: BookmarkTree;
  snapshots: Snapshot[];
  tempFavorites: TempFavorite[];
  settings: AppSettings;
  recentHosts: RecentHost[];
}

const store = new Store<StoreSchema>({
  name: 'workspace-dock-data',
  defaults: {
    bookmarks: createSampleData(),
    snapshots: [],
    tempFavorites: [],
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
