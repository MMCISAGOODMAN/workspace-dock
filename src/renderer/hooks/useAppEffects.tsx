import { useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { getAPI } from '../types/electron';
import { ENV_BORDER_COLORS, type EnvironmentType } from '@shared/types';

export function EnvBorderOverlay() {
  const { activeEnvBorder, settings } = useAppStore();

  useEffect(() => {
    const unsub = getAPI().onEnvBorderChanged((envType) => {
      useAppStore.getState().setActiveEnvBorder(envType as EnvironmentType);
    });
    return unsub;
  }, []);

  if (!settings.windowBorderEnabled || !activeEnvBorder) return null;

  const color = ENV_BORDER_COLORS[activeEnvBorder];

  return (
    <div
      className="fixed inset-0 pointer-events-none z-50"
      style={{
        boxShadow: `inset 0 0 0 3px ${color}`,
      }}
    />
  );
}

export function applyThemeClass(theme: 'dark' | 'light' | 'system') {
  const apply = (mode: 'dark' | 'light') => {
    document.documentElement.classList.toggle('dark', mode === 'dark');
    document.documentElement.classList.toggle('light', mode === 'light');
  };

  if (theme === 'system') {
    apply(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  } else {
    apply(theme);
  }
}

export function useTheme() {
  const theme = useAppStore((s) => s.settings.theme);

  useEffect(() => {
    if (theme === 'system') {
      applyThemeClass('system');
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => applyThemeClass('system');
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
    applyThemeClass(theme);
  }, [theme]);
}

export function useActiveSessionSync() {
  const activeSessions = useAppStore((s) => s.activeSessions);

  useEffect(() => {
    getAPI().registerActiveSessions(activeSessions);
  }, [activeSessions]);
}

export function useAutoSnapshotListener() {
  const loadAll = useAppStore((s) => s.loadAll);

  useEffect(() => {
    const unsub = getAPI().onAutoSnapshot((snapshot) => {
      loadAll();
      import('../store/appStore').then(({ useToastStore }) => {
        useToastStore.getState().addToast(
          `自动快照已保存: ${(snapshot as { name: string }).name}`,
          'success',
        );
      });
    });
    return unsub;
  }, [loadAll]);
}
