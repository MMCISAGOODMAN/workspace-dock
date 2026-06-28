import { useState } from 'react';
import { X, Clock } from 'lucide-react';
import { useAppStore, useToastStore } from '../../store/appStore';

interface AddTempFavoriteModalProps {
  onClose: () => void;
}

export function AddTempFavoriteModal({ onClose }: AddTempFavoriteModalProps) {
  const { addTempFavorite, settings } = useAppStore();
  const addToast = useToastStore((s) => s.addToast);

  const [name, setName] = useState('');
  const [ip, setIp] = useState('');
  const [port, setPort] = useState(String(settings.sshDefaultPort));
  const [username, setUsername] = useState(settings.sshDefaultUser);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ip.trim()) {
      addToast('请输入 IP 或主机名', 'error');
      return;
    }

    setSaving(true);
    try {
      await addTempFavorite(name.trim() || ip.trim(), ip.trim(), username.trim(), parseInt(port, 10));
      addToast('已添加临时收藏', 'success');
      onClose();
    } catch (e) {
      addToast(e instanceof Error ? e.message : '添加失败', 'error');
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
            <Clock className="w-4 h-4 text-dock-warning" />
            <h3 className="text-sm font-medium text-dock-text">添加临时收藏</h3>
          </div>
          <button onClick={onClose} className="p-1 text-dock-muted hover:text-dock-text rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="text-xs text-dock-muted mb-1 block">名称（可选）</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-dock-bg border border-dock-border rounded-lg text-dock-text outline-none focus:border-dock-accent"
              placeholder="临时主机"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs text-dock-muted mb-1 block">IP / 主机名</label>
            <input
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-dock-bg border border-dock-border rounded-lg text-dock-text outline-none focus:border-dock-accent"
              placeholder="10.0.0.1 或 hostname"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-dock-muted mb-1 block">端口</label>
              <input
                value={port}
                onChange={(e) => setPort(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-dock-bg border border-dock-border rounded-lg text-dock-text outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-dock-muted mb-1 block">用户名</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-dock-bg border border-dock-border rounded-lg text-dock-text outline-none"
              />
            </div>
          </div>

          <p className="text-[11px] text-dock-muted">
            将在 {settings.tempFavoriteHours} 小时后自动过期
          </p>

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
              {saving ? '添加中...' : '添加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
