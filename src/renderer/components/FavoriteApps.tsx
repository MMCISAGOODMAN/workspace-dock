import { useState } from 'react';
import {
  LayoutGrid,
  Plus,
  Trash2,
  Rocket,
  Pencil,
  GripVertical,
} from 'lucide-react';
import type { FavoriteApp } from '@shared/types';
import { useAppStore, useToastStore } from '../store/appStore';
import { useFavoriteAppIcons } from '../hooks/useFavoriteAppIcons';
import { FavoriteAppIcon } from './FavoriteAppIcon';
import { AddFavoriteAppModal } from './modals/AddFavoriteAppModal';
import { cn } from '../utils/helpers';

export function FavoriteApps() {
  const {
    favoriteApps,
    deleteFavoriteApp,
    launchFavoriteApp,
    launchAllFavoriteApps,
    reorderFavoriteApps,
  } = useAppStore();
  const icons = useFavoriteAppIcons(favoriteApps);
  const addToast = useToastStore((s) => s.addToast);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editTarget, setEditTarget] = useState<FavoriteApp | null>(null);
  const [launchingAll, setLaunchingAll] = useState(false);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const handleLaunch = async (app: FavoriteApp) => {
    try {
      await launchFavoriteApp(app.id);
      addToast(`已启动 ${app.name}`, 'success');
    } catch (e) {
      addToast(e instanceof Error ? e.message : '启动失败', 'error');
    }
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

  const handleDelete = async (id: string) => {
    await deleteFavoriteApp(id);
    addToast('已删除', 'success');
  };

  const handleDrop = async (targetId: string) => {
    const sourceId = draggingId;
    setDraggingId(null);
    setDragOverId(null);
    if (!sourceId || sourceId === targetId) return;

    const ids = favoriteApps.map((a) => a.id);
    const from = ids.indexOf(sourceId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;

    ids.splice(from, 1);
    ids.splice(to, 0, sourceId);
    await reorderFavoriteApps(ids);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-dock-border">
        <span className="text-xs text-dock-muted font-medium uppercase tracking-wider">
          收藏应用
        </span>
        <div className="flex items-center gap-1">
          {favoriteApps.length > 0 && (
            <button
              onClick={handleLaunchAll}
              disabled={launchingAll}
              className="flex items-center gap-1 px-2 py-1 text-xs text-dock-accent hover:bg-dock-accent/10 rounded transition-colors disabled:opacity-50"
            >
              <Rocket className="w-3.5 h-3.5" />
              {launchingAll ? '启动中...' : '全部启动'}
            </button>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1 px-2 py-1 text-xs text-dock-accent hover:bg-dock-accent/10 rounded transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            添加
          </button>
        </div>
      </div>

      <div className="px-3 py-2 text-[11px] text-dock-muted border-b border-dock-border">
        本地应用或网页 URL · 拖拽调整启动顺序
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {favoriteApps.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-dock-muted text-sm gap-2">
            <LayoutGrid className="w-8 h-8 opacity-50" />
            <span>暂无收藏应用</span>
            <span className="text-xs opacity-70">添加 Chrome、Grafana 等常用工具</span>
          </div>
        ) : (
          favoriteApps.map((app) => (
            <div
              key={app.id}
              draggable
              onDragStart={() => setDraggingId(app.id)}
              onDragEnd={() => {
                setDraggingId(null);
                setDragOverId(null);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverId(app.id);
              }}
              onDragLeave={() => setDragOverId(null)}
              onDrop={() => void handleDrop(app.id)}
              className={cn(
                'group flex items-center gap-1 p-2 rounded-lg hover:bg-dock-hover transition-colors',
                dragOverId === app.id && draggingId !== app.id && 'ring-1 ring-dock-accent/50',
                draggingId === app.id && 'opacity-50',
              )}
            >
              <GripVertical className="w-3.5 h-3.5 text-dock-muted shrink-0 cursor-grab active:cursor-grabbing opacity-40 group-hover:opacity-100" />
              <button
                onClick={() => handleLaunch(app)}
                className="flex-1 min-w-0 text-left"
              >
                <div className="flex items-center gap-2">
                  <FavoriteAppIcon app={app} iconSrc={icons[app.id]} />
                  <span className="text-sm text-dock-text truncate">{app.name}</span>
                </div>
                <div className="text-[11px] text-dock-muted ml-7 truncate">{app.target}</div>
              </button>

              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setEditTarget(app)}
                  className="p-1 text-dock-muted hover:text-dock-accent rounded"
                  title="编辑"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(app.id)}
                  className="p-1 text-dock-muted hover:text-dock-danger rounded"
                  title="删除"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showAddModal && <AddFavoriteAppModal onClose={() => setShowAddModal(false)} />}
      {editTarget && (
        <AddFavoriteAppModal initial={editTarget} onClose={() => setEditTarget(null)} />
      )}
    </div>
  );
}
