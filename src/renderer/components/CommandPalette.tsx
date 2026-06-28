import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Server, Clock } from 'lucide-react';
import { flattenHosts } from '@shared/types';
import { useAppStore, useToastStore } from '../store/appStore';
import { highlightText } from '../utils/helpers';

interface CommandPaletteProps {
  onClose: () => void;
}

export function CommandPalette({ onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { search, connectHost, recentHosts, bookmarks } = useAppStore();
  const addToast = useToastStore((s) => s.addToast);

  const results = search(query);
  const flat = flattenHosts(bookmarks);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = useCallback(
    async (index: number) => {
      if (query.trim() && results[index]?.host) {
        const flatHost = flat.find((h) => h.id === results[index].host!.id);
        if (flatHost) {
          try {
            await connectHost(flatHost);
            addToast(`已连接 ${flatHost.name}`, 'success');
            onClose();
          } catch (e) {
            addToast(e instanceof Error ? e.message : '连接失败', 'error');
          }
        }
      } else if (!query.trim() && recentHosts[index]) {
        const recent = recentHosts[index];
        const flatHost = flat.find((h) => h.id === recent.hostId);
        if (flatHost) {
          try {
            await connectHost(flatHost);
            addToast(`已连接 ${flatHost.name}`, 'success');
            onClose();
          } catch (e) {
            addToast(e instanceof Error ? e.message : '连接失败', 'error');
          }
        }
      }
    },
    [query, results, flat, connectHost, addToast, onClose, recentHosts],
  );

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const max = query.trim() ? results.length : recentHosts.length;
        setSelectedIndex((i) => Math.min(i + 1, max - 1));
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
  }, [onClose, query, results.length, recentHosts.length, selectedIndex, handleSelect]);

  const showRecent = !query.trim() && recentHosts.length > 0;

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
            placeholder="搜索主机、项目、环境..."
            className="flex-1 bg-transparent text-dock-text text-sm outline-none placeholder:text-dock-muted"
          />
          <kbd className="text-[10px] px-1.5 py-0.5 bg-dock-bg border border-dock-border rounded text-dock-muted">
            ESC
          </kbd>
        </div>

        <div className="max-h-[360px] overflow-y-auto">
          {showRecent && (
            <div>
              <div className="px-4 py-2 text-[11px] text-dock-muted uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                最近连接
              </div>
              {recentHosts.slice(0, 5).map((recent, i) => (
                <button
                  key={recent.hostId}
                  onClick={() => handleSelect(i)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    selectedIndex === i ? 'bg-dock-accent/15' : 'hover:bg-dock-hover'
                  }`}
                >
                  <Server className="w-4 h-4 text-dock-muted shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-dock-text">{recent.hostName}</div>
                    <div className="text-[11px] text-dock-muted truncate">
                      {recent.projectName && `${recent.projectName} / `}
                      {recent.environmentName && `${recent.environmentName} / `}
                      {recent.ip}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {query.trim() && results.length === 0 && (
            <div className="px-4 py-8 text-center text-dock-muted text-sm">未找到匹配结果</div>
          )}

          {query.trim() && results.length > 0 && (
            <div>
              {results.map((result, i) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleSelect(i)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    selectedIndex === i ? 'bg-dock-accent/15' : 'hover:bg-dock-hover'
                  }`}
                >
                  <Server className="w-4 h-4 text-dock-muted shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-sm text-dock-text"
                      dangerouslySetInnerHTML={{
                        __html: highlightText(result.label, query),
                      }}
                    />
                    <div
                      className="text-[11px] text-dock-muted truncate"
                      dangerouslySetInnerHTML={{
                        __html: highlightText(result.subtitle, query),
                      }}
                    />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 py-2 border-t border-dock-border text-[10px] text-dock-muted flex gap-4">
          <span>↑↓ 导航</span>
          <span>↵ 连接</span>
          <span>ESC 关闭</span>
        </div>
      </div>
    </div>
  );
}
