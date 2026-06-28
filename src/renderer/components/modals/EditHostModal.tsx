import { useState } from 'react';
import { X, Pencil } from 'lucide-react';
import type { FlatHost } from '@shared/types';
import { useAppStore, useToastStore } from '../../store/appStore';

interface EditHostModalProps {
  host: FlatHost;
  onClose: () => void;
}

export function EditHostModal({ host, onClose }: EditHostModalProps) {
  const { updateHost } = useAppStore();
  const addToast = useToastStore((s) => s.addToast);
  const [name, setName] = useState(host.name);
  const [ip, setIp] = useState(host.ip);
  const [port, setPort] = useState(String(host.port));
  const [username, setUsername] = useState(host.username);
  const [lastPath, setLastPath] = useState(host.lastPath ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateHost(host.id, {
      name: name.trim() || ip.trim(),
      ip: ip.trim(),
      port: parseInt(port, 10) || 22,
      username: username.trim() || 'root',
      lastPath: lastPath.trim() || undefined,
    });
    addToast('主机已更新', 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-[360px] bg-dock-panel border border-dock-border rounded-xl shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between px-4 py-3 border-b border-dock-border">
          <div className="flex items-center gap-2">
            <Pencil className="w-4 h-4 text-dock-accent" />
            <h3 className="text-sm font-medium text-dock-text">编辑主机</h3>
          </div>
          <button onClick={onClose} className="p-1 text-dock-muted hover:text-dock-text rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <Field label="名称" value={name} onChange={setName} />
          <Field label="IP" value={ip} onChange={setIp} />
          <div className="flex gap-2">
            <Field label="端口" value={port} onChange={setPort} />
            <Field label="用户名" value={username} onChange={setUsername} />
          </div>
          <Field label="默认路径" value={lastPath} onChange={setLastPath} placeholder="/var/log" />
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 text-sm border border-dock-border rounded-lg text-dock-muted">
              取消
            </button>
            <button type="submit" className="flex-1 py-2 text-sm bg-dock-accent text-white rounded-lg">
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs text-dock-muted mb-1 block">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm bg-dock-bg border border-dock-border rounded-lg text-dock-text outline-none focus:border-dock-accent"
      />
    </div>
  );
}
