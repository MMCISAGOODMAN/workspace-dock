import {
  Search,
  Settings,
  Terminal,
  ChevronRight,
} from 'lucide-react';
import { useAppStore, type PanelTab } from '../store/appStore';
import { cn } from '../utils/helpers';
import { PANEL_TABS } from './panelTabs';
import { ScreenshotButton } from './ScreenshotButton';

interface PanelTabBarProps {
  onTabClick: (tab: PanelTab) => void;
}

export function PanelTabBar({ onTabClick }: PanelTabBarProps) {
  const {
    activeTab,
    closePanel,
    setSearchOpen,
    setSettingsOpen,
    activeSessions,
    selectedHostIds,
    setBatchModalOpen,
    clipboardCapture,
  } = useAppStore();

  const handleTabClick = (id: PanelTab) => {
    if (activeTab === id) {
      void closePanel();
      return;
    }
    onTabClick(id);
  };

  return (
    <div className="shrink-0 border-b border-dock-border">
      <div className="flex items-center gap-1 px-2 py-1.5">
        <div className="flex flex-1 min-w-0 gap-0.5 p-0.5 rounded-lg bg-dock-bg border border-dock-border">
          {PANEL_TABS.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => handleTabClick(id)}
              className={cn(
                'relative flex-1 min-w-0 h-7 flex items-center justify-center rounded-md transition-colors',
                activeTab === id
                  ? 'bg-dock-accent/20 text-dock-accent'
                  : 'text-dock-muted hover:text-dock-text hover:bg-dock-hover',
              )}
              title={label}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              {id === 'snapshots' && activeSessions.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-3 h-3 px-0.5 bg-dock-accent text-white text-[8px] rounded-full flex items-center justify-center">
                  {activeSessions.length}
                </span>
              )}
              {id === 'clipboard' && clipboardCapture && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-dock-warning rounded-full" />
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center shrink-0 gap-0.5">
          {selectedHostIds.size > 0 && (
            <button
              onClick={() => setBatchModalOpen(true)}
              className="relative w-7 h-7 flex items-center justify-center rounded-md text-dock-warning hover:bg-dock-warning/10 transition-colors"
              title="批量执行命令"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span className="absolute -top-0.5 -right-0.5 min-w-3 h-3 px-0.5 bg-dock-warning text-black text-[8px] rounded-full flex items-center justify-center">
                {selectedHostIds.size}
              </span>
            </button>
          )}
          <ScreenshotButton />
          <button
            onClick={() => setSearchOpen(true)}
            className="w-7 h-7 flex items-center justify-center rounded-md text-dock-muted hover:text-dock-text hover:bg-dock-hover transition-colors"
            title="搜索 (⌘P)"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className="w-7 h-7 flex items-center justify-center rounded-md text-dock-muted hover:text-dock-text hover:bg-dock-hover transition-colors"
            title="设置"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => void closePanel()}
            className="w-7 h-7 flex items-center justify-center rounded-md text-dock-muted hover:text-dock-text hover:bg-dock-hover transition-colors"
            title="收起面板"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="px-3 pb-1 text-[11px] text-dock-muted truncate">
        {PANEL_TABS.find((t) => t.id === activeTab)?.label}
      </div>
    </div>
  );
}
