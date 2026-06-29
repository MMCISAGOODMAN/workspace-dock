import { useAppStore, type PanelTab } from '../store/appStore';
import { cn } from '../utils/helpers';
import { PanelTabBar } from './PanelTabBar';
import { BookmarkTree } from './BookmarkTree';
import { SnapshotDrawer } from './SnapshotDrawer';
import { TempFavorites } from './TempFavorites';
import { FavoriteApps } from './FavoriteApps';
import { ClipboardPanel } from './ClipboardPanel';

interface SidePanelProps {
  onTabClick: (tab: PanelTab) => void;
}

export function SidePanel({ onTabClick }: SidePanelProps) {
  const { panelExpanded, panelVisible, panelAnimating, activeTab } = useAppStore();

  if (!panelExpanded && !panelAnimating) return null;

  return (
    <div className="h-full flex-1 min-w-0 overflow-hidden relative">
      <div
        className={cn(
          'panel-slide absolute inset-0 flex flex-col bg-dock-panel/95',
          panelVisible ? 'panel-slide-open' : 'panel-slide-closed',
        )}
      >
        <PanelTabBar onTabClick={onTabClick} />

        <div className="flex-1 overflow-hidden min-h-0">
          {activeTab === 'bookmarks' && <BookmarkTree />}
          {activeTab === 'snapshots' && <SnapshotDrawer />}
          {activeTab === 'temp' && <TempFavorites />}
          {activeTab === 'clipboard' && <ClipboardPanel />}
          {activeTab === 'apps' && <FavoriteApps />}
        </div>
      </div>
    </div>
  );
}
