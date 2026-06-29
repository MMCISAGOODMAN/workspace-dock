import { useEffect, useState } from 'react';
import { X, LayoutGrid, Globe, FolderOpen } from 'lucide-react';
import type { FavoriteApp, FavoriteAppType } from '@shared/types';
import { useAppStore, useToastStore } from '../../store/appStore';
import { getAPI } from '../../types/electron';
import { FavoriteAppIcon } from '../FavoriteAppIcon';

interface AddFavoriteAppModalProps {
  initial?: FavoriteApp;
  onClose: () => void;
}

export function AddFavoriteAppModal({ initial, onClose }: AddFavoriteAppModalProps) {
  const { addFavoriteApp, updateFavoriteApp } = useAppStore();
  const addToast = useToastStore((s) => s.addToast);

  const [name, setName] = useState(initial?.name ?? '');
  const [type, setType] = useState<FavoriteAppType>(initial?.type ?? 'app');
  const [target, setTarget] = useState(initial?.target ?? '');
  const [args, setArgs] = useState(initial?.args ?? '');
  const [saving, setSaving] = useState(false);
  const [previewIcon, setPreviewIcon] = useState<string | null>(null);

  useEffect(() => {
    if (!target.trim()) {
      setPreviewIcon(null);
      return;
    }
    let cancelled = false;
    getAPI()
      .getFavoriteAppIcons([{ id: 'preview', type, target: target.trim() }])
      .then((result) => {
        if (!cancelled) setPreviewIcon(result.preview ?? null);
      })
      .catch(() => {
        if (!cancelled) setPreviewIcon(null);
      });
    return () => {
      cancelled = true;
    };
  }, [type, target]);

  const handleBrowse = async () => {
    const result = await getAPI().browseFavoriteApp();
    if (result.success && result.path) {
      setTarget(result.path);
      if (!name.trim()) {
        const base = result.path.split(/[/\\]/).pop() ?? result.path;
        setName(base.replace(/\.(app|exe)$/i, ''));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      addToast('请输入名称', 'error');
      return;
    }
    if (!target.trim()) {
      addToast(type === 'url' ? '请输入 URL' : '请选择应用路径', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        type,
        target: target.trim(),
        args: type === 'app' && args.trim() ? args.trim() : undefined,
      };
      if (initial) {
        await updateFavoriteApp(initial.id, payload);
        addToast('已更新', 'success');
      } else {
        await addFavoriteApp(payload);
        addToast('已添加收藏应用', 'success');
      }
      onClose();
    } catch (err) {
      addToast(err instanceof Error ? err.message : '保存失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-[360px] bg-dock-panel border border-dock-border rounded-xl shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-dock-border">
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-dock-accent" />
            <h3 className="text-sm font-medium text-dock-text">
              {initial ? '编辑应用' : '添加收藏应用'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-dock-muted hover:text-dock-text rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div className="flex gap-1 p-0.5 bg-dock-bg rounded-lg border border-dock-border">
            <button
              type="button"
              onClick={() => setType('app')}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-xs rounded-md transition-colors ${
                type === 'app'
                  ? 'bg-dock-accent/20 text-dock-accent'
                  : 'text-dock-muted hover:text-dock-text'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              本地应用
            </button>
            <button
              type="button"
              onClick={() => setType('url')}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-xs rounded-md transition-colors ${
                type === 'url'
                  ? 'bg-dock-accent/20 text-dock-accent'
                  : 'text-dock-muted hover:text-dock-text'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              网页链接
            </button>
          </div>

          <div className="flex items-center gap-3 p-2.5 rounded-lg bg-dock-bg border border-dock-border">
            <FavoriteAppIcon app={{ type }} iconSrc={previewIcon} className="w-8 h-8" />
            <div className="min-w-0">
              <div className="text-sm text-dock-text truncate">{name.trim() || '未命名应用'}</div>
              <div className="text-[11px] text-dock-muted truncate">
                {target.trim() || '填写路径或 URL 后预览图标'}
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs text-dock-muted mb-1 block">名称</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-dock-bg border border-dock-border rounded-lg text-dock-text outline-none focus:border-dock-accent"
              placeholder="Chrome / Grafana"
              autoFocus
            />
          </div>

          {type === 'url' ? (
            <div>
              <label className="text-xs text-dock-muted mb-1 block">URL</label>
              <input
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-dock-bg border border-dock-border rounded-lg text-dock-text outline-none focus:border-dock-accent"
                placeholder="https://grafana.example.com"
              />
            </div>
          ) : (
            <>
              <div>
                <label className="text-xs text-dock-muted mb-1 block">应用路径</label>
                <div className="flex gap-2">
                  <input
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    className="flex-1 min-w-0 px-3 py-2 text-sm bg-dock-bg border border-dock-border rounded-lg text-dock-text outline-none focus:border-dock-accent"
                    placeholder="/Applications/..."
                  />
                  <button
                    type="button"
                    onClick={handleBrowse}
                    className="px-3 py-2 text-xs text-dock-accent border border-dock-border rounded-lg hover:bg-dock-hover shrink-0"
                  >
                    浏览
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs text-dock-muted mb-1 block">启动参数（可选）</label>
                <input
                  value={args}
                  onChange={(e) => setArgs(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-dock-bg border border-dock-border rounded-lg text-dock-text outline-none"
                  placeholder="--new-window"
                />
              </div>
            </>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-sm text-dock-muted hover:text-dock-text border border-dock-border rounded-lg"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 text-sm bg-dock-accent hover:bg-dock-accent-hover text-white rounded-lg disabled:opacity-50"
            >
              {saving ? '保存中...' : initial ? '保存' : '添加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
