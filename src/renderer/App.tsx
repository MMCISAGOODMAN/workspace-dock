import { useEffect } from 'react';
import { useAppStore } from './store/appStore';
import { getAPI } from './types/electron';
import { DockBar } from './components/DockBar';
import { SidePanel } from './components/SidePanel';
import { CommandPalette } from './components/CommandPalette';
import { ToastContainer } from './components/Toast';
import { SettingsPanel } from './components/modals/SettingsPanel';
import { BatchCommandModal } from './components/modals/BatchCommandModal';
import { PassphrasePromptModal } from './components/modals/PassphrasePromptModal';
import { EnvBorderOverlay, useTheme, useActiveSessionSync, useAutoSnapshotListener } from './hooks/useAppEffects';

export default function App() {
  const {
    loading,
    loadAll,
    panelExpanded,
    setPanelExpanded,
    searchOpen,
    setSearchOpen,
    settingsOpen,
    setSettingsOpen,
    batchModalOpen,
    setBatchModalOpen,
    setActiveTab,
  } = useAppStore();

  useTheme();
  useActiveSessionSync();
  useAutoSnapshotListener();

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    const unsubPanel = getAPI().onPanelStateChanged((expanded) => {
      setPanelExpanded(expanded);
    });
    const unsubSearch = getAPI().onOpenSearch(() => {
      setSearchOpen(true);
    });
    return () => {
      unsubPanel();
      unsubSearch();
    };
  }, [setPanelExpanded, setSearchOpen]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-dock-bg/90">
        <div className="text-dock-muted text-sm animate-pulse">加载中...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-row-reverse relative">
      <EnvBorderOverlay />
      <DockBar
        onTabClick={(tab) => {
          setActiveTab(tab);
        }}
      />
      <SidePanel />
      {searchOpen && <CommandPalette onClose={() => setSearchOpen(false)} />}
      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
      {batchModalOpen && <BatchCommandModal onClose={() => setBatchModalOpen(false)} />}
      <PassphrasePromptModal />
      <ToastContainer />
    </div>
  );
}
