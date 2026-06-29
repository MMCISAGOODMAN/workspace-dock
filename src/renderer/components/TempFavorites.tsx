import { useState, useEffect } from 'react';
import { Clock, Plus, Trash2, ArrowRightCircle, Terminal } from 'lucide-react';
import { useAppStore, useToastStore } from '../store/appStore';
import { formatCountdown } from '../utils/helpers';
import { AddTempFavoriteModal } from './modals/AddTempFavoriteModal';
import { ConvertTempFavoriteModal } from './modals/ConvertTempFavoriteModal';
import type { TempFavorite } from '@shared/types';

export function TempFavorites() {
  const { tempFavorites, deleteTempFavorite, connectTempFavorite, loadAll } = useAppStore();
  const addToast = useToastStore((s) => s.addToast);
  const [showAddModal, setShowAddModal] = useState(false);
  const [convertTarget, setConvertTarget] = useState<TempFavorite | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      loadAll();
    }, 300000);
    return () => clearInterval(interval);
  }, [loadAll]);

  const handleConnect = async (favorite: (typeof tempFavorites)[0]) => {
    try {
      await connectTempFavorite(favorite);
      addToast(`已连接 ${favorite.name}`, 'success');
    } catch (e) {
      addToast(e instanceof Error ? e.message : '连接失败', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    await deleteTempFavorite(id);
    addToast('已删除临时收藏', 'success');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-dock-border">
        <span className="text-xs text-dock-muted font-medium uppercase tracking-wider">
          临时 SSH
        </span>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1 px-2 py-1 text-xs text-dock-accent hover:bg-dock-accent/10 rounded transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          添加
        </button>
      </div>

      <div className="px-3 py-2 text-[11px] text-dock-muted border-b border-dock-border">
        24 小时自动过期 · 快捷 SSH 连接
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {tempFavorites.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-dock-muted text-sm gap-2">
            <Clock className="w-8 h-8 opacity-50" />
            <span>暂无临时 SSH</span>
            <span className="text-xs opacity-70">点击添加手动录入主机</span>
          </div>
        ) : (
          tempFavorites.map((fav) => {
            const remaining = formatCountdown(fav.expiresAt);
            const isExpired = remaining === '已过期';

            return (
              <div
                key={fav.id}
                className="group flex items-center gap-2 p-2 rounded-lg hover:bg-dock-hover transition-colors"
              >
                <button
                  onClick={() => handleConnect(fav)}
                  className="flex-1 min-w-0 text-left"
                  disabled={isExpired}
                >
                  <div className="flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-dock-muted shrink-0" />
                    <span className="text-sm text-dock-text truncate">{fav.name}</span>
                  </div>
                  <div className="text-[11px] text-dock-muted ml-5 truncate">
                    {fav.ip}:{fav.port} · {fav.username}
                  </div>
                </button>

                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
                    isExpired
                      ? 'bg-dock-danger/20 text-dock-danger'
                      : 'bg-dock-warning/20 text-dock-warning'
                  }`}
                >
                  {remaining}
                </span>

                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setConvertTarget(fav)}
                    className="p-1 text-dock-muted hover:text-dock-accent rounded"
                    title="转为书签"
                  >
                    <ArrowRightCircle className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(fav.id)}
                    className="p-1 text-dock-muted hover:text-dock-danger rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showAddModal && <AddTempFavoriteModal onClose={() => setShowAddModal(false)} />}
      {convertTarget && (
        <ConvertTempFavoriteModal
          favorite={convertTarget}
          onClose={() => setConvertTarget(null)}
        />
      )}
    </div>
  );
}
