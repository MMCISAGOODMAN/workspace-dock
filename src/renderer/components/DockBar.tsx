import { useState } from 'react';
import { ChevronLeft, Rocket } from 'lucide-react';
import { useAppStore, useToastStore, type PanelTab } from '../store/appStore';
import { cn } from '../utils/helpers';
import { PANEL_TABS } from './panelTabs';

interface DockBarProps {
  onTabClick: (tab: PanelTab) => void;
}

export function DockBar({ onTabClick }: DockBarProps) {
  const {
    panelExpanded,
    openPanel,
    activeTab,
    activeSessions,
    favoriteApps,
    launchAllFavoriteApps,
    clipboardCapture,
  } = useAppStore();
  const addToast = useToastStore((s) => s.addToast);
  const [hoveredTab, setHoveredTab] = useState<PanelTab | null>(null);
  const [launchingAll, setLaunchingAll] = useState(false);

  const handleTabClick = (id: PanelTab) => {
    onTabClick(id);
    void openPanel();
  };

  const handleLaunchAll = async () => {
    if (favoriteApps.length === 0) {
      addToast('暂无收藏应用', 'info');
      return;
    }
    setLaunchingAll(true);
    try {
      const { launched, failed } = await launchAllFavoriteApps();
      if (failed === 0) {
        addToast(`已启动 ${launched} 个应用`, 'success');
      } else {
        addToast(`启动完成：成功 ${launched}，失败 ${failed}`, failed > 0 ? 'error' : 'success');
      }
    } catch (e) {
      addToast(e instanceof Error ? e.message : '批量启动失败', 'error');
    } finally {
      setLaunchingAll(false);
    }
  };

  return (
    <div
      className={cn(
        'shrink-0 flex flex-col items-center py-2 gap-1 bg-dock-bg/60 border-l border-dock-border overflow-y-auto overflow-x-hidden',
        'transition-[width,opacity] duration-200 ease-out',
        panelExpanded ? 'w-0 opacity-0 pointer-events-none border-l-0' : 'w-11 opacity-100',
      )}
    >
      <div className="flex flex-col items-center gap-0.5">
        {PANEL_TABS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => handleTabClick(id)}
            onMouseEnter={() => setHoveredTab(id)}
            onMouseLeave={() => setHoveredTab(null)}
            className={cn(
              'relative w-8 h-8 flex items-center justify-center rounded-md transition-colors duration-150 shrink-0',
              activeTab === id
                ? 'bg-dock-accent/20 text-dock-accent'
                : 'text-dock-muted hover:text-dock-text hover:bg-dock-hover',
            )}
            title={label}
          >
            <Icon className="w-4 h-4" />
            {id === 'snapshots' && activeSessions.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-3.5 h-3.5 px-0.5 bg-dock-accent text-white text-[9px] rounded-full flex items-center justify-center">
                {activeSessions.length}
              </span>
            )}
            {id === 'clipboard' && clipboardCapture && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-dock-warning rounded-full animate-pulse" />
            )}
            {hoveredTab === id && (
              <span className="absolute right-full mr-2 px-2 py-1 text-xs bg-dock-panel border border-dock-border rounded whitespace-nowrap pointer-events-none z-10">
                {label}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="w-5 h-px bg-dock-border my-0.5 shrink-0" />

      {favoriteApps.length > 0 && (
        <button
          onClick={() => void handleLaunchAll()}
          disabled={launchingAll}
          className="relative w-8 h-8 shrink-0 flex items-center justify-center rounded-md text-dock-accent hover:bg-dock-accent/10 transition-colors disabled:opacity-50"
          title="全部启动收藏应用"
        >
          <Rocket className="w-4 h-4" />
          <span className="absolute -top-0.5 -right-0.5 min-w-3.5 h-3.5 px-0.5 bg-dock-accent text-white text-[9px] rounded-full flex items-center justify-center">
            {favoriteApps.length}
          </span>
        </button>
      )}

      <button
        onClick={() => void openPanel()}
        className="w-8 h-8 shrink-0 flex items-center justify-center rounded-md text-dock-muted hover:text-dock-text hover:bg-dock-hover transition-colors"
        title="展开面板"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
    </div>
  );
}
