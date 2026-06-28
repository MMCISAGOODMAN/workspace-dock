import { useState } from 'react';
import { X, Camera } from 'lucide-react';
import { useAppStore, useToastStore } from '../../store/appStore';

interface SaveSnapshotModalProps {
  onClose: () => void;
}

export function SaveSnapshotModal({ onClose }: SaveSnapshotModalProps) {
  const { saveSnapshot, activeSessions } = useAppStore();
  const addToast = useToastStore((s) => s.addToast);
  const [name, setName] = useState(
    `快照 ${new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}`,
  );
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (activeSessions.length === 0) {
      addToast('没有活跃会话可保存，请先连接主机', 'error');
      return;
    }

    setSaving(true);
    try {
      await saveSnapshot(name.trim());
      addToast('快照已保存', 'success');
      onClose();
    } catch (e) {
      addToast(e instanceof Error ? e.message : '保存失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-[360px] bg-dock-panel border border-dock-border rounded-xl shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between px-4 py-3 border-b border-dock-border">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-dock-accent" />
            <h3 className="text-sm font-medium text-dock-text">保存快照</h3>
          </div>
          <button onClick={onClose} className="p-1 text-dock-muted hover:text-dock-text rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="text-xs text-dock-muted mb-1 block">快照名称</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-dock-bg border border-dock-border rounded-lg text-dock-text outline-none focus:border-dock-accent"
              autoFocus
            />
          </div>

          <div className="text-xs text-dock-muted">
            将保存 {activeSessions.length} 台主机的连接状态
          </div>

          <div className="flex flex-wrap gap-1">
            {activeSessions.map((s) => (
              <span
                key={s.hostId}
                className="text-[10px] px-1.5 py-0.5 bg-dock-hover rounded text-dock-text"
              >
                {s.hostName ?? s.ip}
                {s.path && s.path !== '/' && ` · ${s.path}`}
              </span>
            ))}
          </div>

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
              disabled={saving || activeSessions.length === 0}
              className="flex-1 py-2 text-sm bg-dock-accent hover:bg-dock-accent-hover text-white rounded-lg disabled:opacity-50"
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
