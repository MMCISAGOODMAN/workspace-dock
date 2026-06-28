import { useState } from 'react';
import {
  Bookmark,
  Camera,
  Clock,
  ChevronLeft,
  ChevronRight,
  Search,
  Settings,
  Terminal,
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { cn } from '../utils/helpers';

interface DockBarProps {
  onTabClick: (tab: 'bookmarks' | 'snapshots' | 'temp') => void;
}

const tabs = [
  { id: 'bookmarks' as const, icon: Bookmark, label: '书签' },
  { id: 'snapshots' as const, icon: Camera, label: '快照' },
  { id: 'temp' as const, icon: Clock, label: '临时' },
];

export function DockBar({ onTabClick }: DockBarProps) {
  const {
    panelExpanded,
    togglePanel,
    activeTab,
    setSearchOpen,
    activeSessions,
    selectedHostIds,
    setSettingsOpen,
    setBatchModalOpen,
  } = useAppStore();
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);

  return (
    <div className="h-full w-12 flex flex-col items-center bg-dock-bg/95 backdrop-blur-sm border-l border-dock-border shrink-0">
      <div className="flex-1 flex flex-col items-center gap-1 py-3">
        {tabs.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => {
              onTabClick(id);
              if (!panelExpanded) togglePanel();
            }}
            onMouseEnter={() => setHoveredTab(id)}
            onMouseLeave={() => setHoveredTab(null)}
            className={cn(
              'relative w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-200',
              activeTab === id && panelExpanded
                ? 'bg-dock-accent/20 text-dock-accent'
                : 'text-dock-muted hover:text-dock-text hover:bg-dock-hover',
            )}
            title={label}
          >
            <Icon className="w-5 h-5" />
            {id === 'snapshots' && activeSessions.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-dock-accent text-white text-[10px] rounded-full flex items-center justify-center">
                {activeSessions.length}
              </span>
            )}
            {hoveredTab === id && (
              <span className="absolute right-full mr-2 px-2 py-1 text-xs bg-dock-panel border border-dock-border rounded whitespace-nowrap pointer-events-none">
                {label}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex flex-col items-center gap-1 pb-3">
        {selectedHostIds.size > 0 && (
          <button
            onClick={() => setBatchModalOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-dock-warning hover:bg-dock-warning/10 transition-colors relative"
            title="批量执行命令"
          >
            <Terminal className="w-5 h-5" />
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-dock-warning text-black text-[10px] rounded-full flex items-center justify-center">
              {selectedHostIds.size}
            </span>
          </button>
        )}
        <button
          onClick={() => setSettingsOpen(true)}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-dock-muted hover:text-dock-text hover:bg-dock-hover transition-colors"
          title="设置"
        >
          <Settings className="w-5 h-5" />
        </button>
        <button
          onClick={() => setSearchOpen(true)}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-dock-muted hover:text-dock-text hover:bg-dock-hover transition-colors"
          title="搜索 (⌘P)"
        >
          <Search className="w-5 h-5" />
        </button>
        <button
          onClick={() => togglePanel()}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-dock-muted hover:text-dock-text hover:bg-dock-hover transition-colors"
          title={panelExpanded ? '收起面板' : '展开面板'}
        >
          {panelExpanded ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
        </button>
      </div>
    </div>
  );
}
