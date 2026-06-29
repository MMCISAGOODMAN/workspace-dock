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
import { EnvBorderOverlay, useTheme, useActiveSessionSync, useAutoSnapshotListener, useClipboardHostListener, useScreenshotListener } from './hooks/useAppEffects';

export default function App() {
  const {
    loading,
    loadAll,
    searchOpen,
    setSearchOpen,
    settingsOpen,
    setSettingsOpen,
    batchModalOpen,
    setBatchModalOpen,
    setActiveTab,
    openPanel,
    togglePanel,
  } = useAppStore();

  useTheme();
  useActiveSessionSync();
  useAutoSnapshotListener();
  useClipboardHostListener();
  useScreenshotListener();

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    const unsubToggle = getAPI().onPanelToggleRequest(() => {
      void togglePanel();
    });
    const unsubSearch = getAPI().onOpenSearch(async () => {
      if (!useAppStore.getState().panelExpanded) {
        await openPanel();
      }
      setSearchOpen(true);
    });
    return () => {
      unsubToggle();
      unsubSearch();
    };
  }, [togglePanel, openPanel, setSearchOpen]);

  if (loading) {
    return (
      <div className="h-full w-full rounded-xl border border-dock-border bg-dock-bg/95 flex items-center justify-center">
        <div className="text-dock-muted text-sm animate-pulse">加载中...</div>
      </div>
    );
  }

  return (
    <div className="h-full w-full rounded-xl border border-dock-border bg-dock-bg/95 backdrop-blur-md shadow-xl overflow-hidden flex flex-row-reverse relative transition-shadow duration-300">
      <EnvBorderOverlay />
      <SidePanel
        onTabClick={(tab) => {
          setActiveTab(tab);
        }}
      />
      <DockBar
        onTabClick={(tab) => {
          setActiveTab(tab);
        }}
      />
      {searchOpen && <CommandPalette onClose={() => setSearchOpen(false)} />}
      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
      {batchModalOpen && <BatchCommandModal onClose={() => setBatchModalOpen(false)} />}
      <PassphrasePromptModal />
      <ToastContainer />
    </div>
  );
}
