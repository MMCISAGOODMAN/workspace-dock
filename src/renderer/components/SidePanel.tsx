import { useAppStore } from '../store/appStore';
import { cn } from '../utils/helpers';
import { BookmarkTree } from './BookmarkTree';
import { SnapshotDrawer } from './SnapshotDrawer';
import { TempFavorites } from './TempFavorites';

export function SidePanel() {
  const { panelExpanded, activeTab, settings } = useAppStore();

  return (
    <div
      className={cn(
        'h-full bg-dock-panel/95 backdrop-blur-sm border-l border-dock-border overflow-hidden transition-all duration-300 ease-in-out',
        panelExpanded ? 'opacity-100' : 'w-0 opacity-0',
      )}
      style={{ width: panelExpanded ? settings.panelWidth : 0 }}
    >
      <div
        className="h-full flex flex-col"
        style={{ width: settings.panelWidth }}
      >
        <div className="px-3 py-2.5 border-b border-dock-border">
          <h1 className="text-sm font-semibold text-dock-text">工作区码头</h1>
          <p className="text-[10px] text-dock-muted">Workspace Dock v0.1</p>
        </div>

        <div className="flex-1 overflow-hidden">
          {activeTab === 'bookmarks' && <BookmarkTree />}
          {activeTab === 'snapshots' && <SnapshotDrawer />}
          {activeTab === 'temp' && <TempFavorites />}
        </div>
      </div>
    </div>
  );
}
