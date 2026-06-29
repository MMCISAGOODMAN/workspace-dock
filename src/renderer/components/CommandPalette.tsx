import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Search,
  Server,
  Clock,
  Rocket,
  Camera,
  LayoutGrid,
  Zap,
  Bookmark,
  FolderOpen,
  Crop,
} from 'lucide-react';
import type { SearchResult } from '@shared/types';
import { flattenHosts } from '@shared/types';
import { useAppStore, useToastStore } from '../store/appStore';
import { highlightText } from '../utils/helpers';

interface CommandPaletteProps {
  onClose: () => void;
}

type PaletteEntry =
  | { kind: 'recent'; hostId: string; label: string; subtitle: string }
  | { kind: 'result'; result: SearchResult; section?: 'actions' | 'search' };

function resultIcon(result: SearchResult) {
  switch (result.type) {
    case 'app':
      return LayoutGrid;
    case 'snapshot':
      return Camera;
    case 'action':
      if (result.action === 'launch-all-apps') return Rocket;
      if (result.action === 'save-snapshot') return Camera;
      if (result.action === 'screenshot') return Crop;
      return Zap;
    case 'project':
      return FolderOpen;
    default:
      return Server;
  }
}

export function CommandPalette({ onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    search,
    getQuickActions,
    connectHost,
    recentHosts,
    bookmarks,
    launchFavoriteApp,
    launchAllFavoriteApps,
    restoreSnapshot,
    saveSnapshot,
    captureScreenshot,
    setActiveTab,
    openPanel,
  } = useAppStore();
  const addToast = useToastStore((s) => s.addToast);

  const flat = flattenHosts(bookmarks);

  const { entries, sections } = useMemo(() => {
    const trimmed = query.trim();
    const list: PaletteEntry[] = [];
    const sectionMarks: { label: string; icon: typeof Clock; start: number }[] = [];

    if (!trimmed) {
      if (recentHosts.length > 0) {
        sectionMarks.push({ label: '最近连接', icon: Clock, start: list.length });
        for (const r of recentHosts.slice(0, 5)) {
          list.push({
            kind: 'recent',
            hostId: r.hostId,
            label: r.hostName,
            subtitle: [r.projectName, r.environmentName, r.ip].filter(Boolean).join(' / '),
          });
        }
      }
      sectionMarks.push({ label: '快捷操作', icon: Zap, start: list.length });
      for (const result of getQuickActions()) {
        list.push({ kind: 'result', result, section: 'actions' });
      }
      return { entries: list, sections: sectionMarks };
    }

    if (trimmed.startsWith('>')) {
      sectionMarks.push({ label: '快捷操作', icon: Zap, start: 0 });
      for (const result of getQuickActions(trimmed.slice(1))) {
        list.push({ kind: 'result', result, section: 'actions' });
      }
      return { entries: list, sections: sectionMarks };
    }

    sectionMarks.push({ label: '搜索结果', icon: Search, start: 0 });
    for (const result of search(query)) {
      list.push({ kind: 'result', result, section: 'search' });
    }
    return { entries: list, sections: sectionMarks };
  }, [query, recentHosts, search, getQuickActions]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = useCallback(
    async (index: number) => {
      const entry = entries[index];
      if (!entry) return;

      if (entry.kind === 'recent') {
        const flatHost = flat.find((h) => h.id === entry.hostId);
        if (flatHost) {
          try {
            await connectHost(flatHost);
            addToast(`已连接 ${flatHost.name}`, 'success');
            onClose();
          } catch (e) {
            addToast(e instanceof Error ? e.message : '连接失败', 'error');
          }
        }
        return;
      }

      const { result } = entry;
      try {
        switch (result.type) {
          case 'host': {
            const flatHost = flat.find((h) => h.id === result.host?.id);
            if (flatHost) {
              await connectHost(flatHost);
              addToast(`已连接 ${flatHost.name}`, 'success');
              onClose();
            }
            break;
          }
          case 'app':
            await launchFavoriteApp(result.id);
            addToast(`已启动 ${result.label}`, 'success');
            onClose();
            break;
          case 'snapshot':
            if (result.snapshot) {
              await restoreSnapshot(result.snapshot);
              addToast(`已恢复快照「${result.label}」`, 'success');
              onClose();
            }
            break;
          case 'action':
            if (result.action === 'launch-all-apps') {
              const { launched, failed } = await launchAllFavoriteApps();
              addToast(
                failed === 0 ? `已启动 ${launched} 个应用` : `启动完成：成功 ${launched}，失败 ${failed}`,
                failed > 0 ? 'error' : 'success',
              );
              onClose();
            } else if (result.action === 'save-snapshot') {
              const name = `快照 ${new Date().toLocaleString('zh-CN', { hour12: false })}`;
              await saveSnapshot(name);
              addToast(`已保存快照「${name}」`, 'success');
              onClose();
            } else if (result.action === 'screenshot') {
              await captureScreenshot();
              onClose();
            } else if (result.action === 'open-tab' && result.tab) {
              setActiveTab(result.tab);
              await openPanel();
              onClose();
            }
            break;
          case 'project':
            setActiveTab('bookmarks');
            await openPanel();
            onClose();
            break;
          default:
            break;
        }
      } catch (e) {
        addToast(e instanceof Error ? e.message : '操作失败', 'error');
      }
    },
    [
      entries,
      flat,
      connectHost,
      addToast,
      onClose,
      launchFavoriteApp,
      restoreSnapshot,
      launchAllFavoriteApps,
      saveSnapshot,
      captureScreenshot,
      setActiveTab,
      openPanel,
    ],
  );

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, entries.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleSelect(selectedIndex);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose, entries.length, selectedIndex, handleSelect]);

  const sectionHeaderAt = new Set(sections.map((s) => s.start));

  return (
    <div className="fixed inset-0 z-[9997] flex items-start justify-center pt-[15vh]">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-[480px] bg-dock-panel border border-dock-border rounded-xl shadow-2xl overflow-hidden animate-fade-in">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-dock-border">
          <Search className="w-5 h-5 text-dock-muted shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索主机、应用、快照或输入 > 查看快捷操作"
            className="flex-1 bg-transparent text-dock-text text-sm outline-none placeholder:text-dock-muted"
          />
          <kbd className="text-[10px] px-1.5 py-0.5 bg-dock-bg border border-dock-border rounded text-dock-muted">
            ESC
          </kbd>
        </div>

        <div className="max-h-[360px] overflow-y-auto">
          {entries.length === 0 && (
            <div className="px-4 py-8 text-center text-dock-muted text-sm">未找到匹配结果</div>
          )}

          {entries.map((entry, idx) => {
            const section = sections.find((s) => s.start === idx);
            const SectionIcon = section?.icon ?? Search;

            return (
              <div key={entry.kind === 'recent' ? `recent-${entry.hostId}` : `result-${entry.result.id}-${idx}`}>
                {sectionHeaderAt.has(idx) && section && (
                  <div className="px-4 py-2 text-[11px] text-dock-muted uppercase tracking-wider flex items-center gap-1.5">
                    <SectionIcon className="w-3 h-3" />
                    {section.label}
                  </div>
                )}
                <button
                  onClick={() => handleSelect(idx)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    selectedIndex === idx ? 'bg-dock-accent/15' : 'hover:bg-dock-hover'
                  }`}
                >
                  {entry.kind === 'recent' ? (
                    <>
                      <Server className="w-4 h-4 text-dock-muted shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-dock-text">{entry.label}</div>
                        <div className="text-[11px] text-dock-muted truncate">{entry.subtitle}</div>
                      </div>
                    </>
                  ) : (
                    <>
                      {(() => {
                        const Icon = resultIcon(entry.result);
                        return <Icon className="w-4 h-4 text-dock-muted shrink-0" />;
                      })()}
                      <div className="flex-1 min-w-0">
                        <div
                          className="text-sm text-dock-text"
                          dangerouslySetInnerHTML={{
                            __html:
                              entry.section === 'search'
                                ? highlightText(entry.result.label, query)
                                : entry.result.label,
                          }}
                        />
                        <div
                          className="text-[11px] text-dock-muted truncate"
                          dangerouslySetInnerHTML={{
                            __html:
                              entry.section === 'search'
                                ? highlightText(entry.result.subtitle, query)
                                : entry.result.subtitle,
                          }}
                        />
                      </div>
                      {entry.result.type === 'host' && (
                        <Bookmark className="w-3 h-3 text-dock-muted shrink-0" />
                      )}
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <div className="px-4 py-2 border-t border-dock-border text-[10px] text-dock-muted flex gap-4">
          <span>↑↓ 导航</span>
          <span>↵ 执行</span>
          <span>&gt; 快捷操作</span>
          <span>ESC 关闭</span>
        </div>
      </div>
    </div>
  );
}
