import { useState } from 'react';
import { X } from 'lucide-react';
import type { EnvironmentType, RoleType } from '@shared/types';
import { ENV_LABELS, ROLE_LABELS } from '@shared/types';
import { useAppStore, useToastStore } from '../../store/appStore';

interface AddNodeModalProps {
  type: 'project' | 'environment' | 'role' | 'host';
  parentIds?: string[];
  onClose: () => void;
}

export function AddNodeModal({ type, parentIds = [], onClose }: AddNodeModalProps) {
  const { addProject, addEnvironment, addRole, addHost, settings } = useAppStore();
  const addToast = useToastStore((s) => s.addToast);

  const [name, setName] = useState('');
  const [envType, setEnvType] = useState<EnvironmentType>('development');
  const [roleType, setRoleType] = useState<RoleType>('app');
  const [ip, setIp] = useState('');
  const [port, setPort] = useState(String(settings.sshDefaultPort));
  const [username, setUsername] = useState(settings.sshDefaultUser);
  const [tagsInput, setTagsInput] = useState('');

  const parseTags = (input: string): string[] | undefined => {
    const tags = input.split(/[,，\s]+/).map((t) => t.trim()).filter(Boolean);
    return tags.length > 0 ? tags : undefined;
  };

  const titles = {
    project: '添加项目',
    environment: '添加环境',
    role: '添加角色',
    host: '添加主机',
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    switch (type) {
      case 'project':
        addProject(name.trim());
        break;
      case 'environment':
        addEnvironment(parentIds[0], name.trim(), envType);
        break;
      case 'role':
        addRole(parentIds[0], parentIds[1], name.trim(), roleType);
        break;
      case 'host':
        if (!ip.trim()) {
          addToast('请输入 IP 地址', 'error');
          return;
        }
        addHost(parentIds[0], parentIds[1], parentIds[2], {
          name: name.trim() || ip.trim(),
          ip: ip.trim(),
          port: parseInt(port, 10) || 22,
          username: username.trim() || 'root',
          tags: parseTags(tagsInput),
        });
        break;
    }

    addToast(`已添加${titles[type].replace('添加', '')}`, 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-[360px] bg-dock-panel border border-dock-border rounded-xl shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between px-4 py-3 border-b border-dock-border">
          <h3 className="text-sm font-medium text-dock-text">{titles[type]}</h3>
          <button onClick={onClose} className="p-1 text-dock-muted hover:text-dock-text rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="text-xs text-dock-muted mb-1 block">名称</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-dock-bg border border-dock-border rounded-lg text-dock-text outline-none focus:border-dock-accent"
              placeholder={type === 'host' ? '主机名（可选）' : '输入名称'}
              autoFocus
            />
          </div>

          {type === 'environment' && (
            <div>
              <label className="text-xs text-dock-muted mb-1 block">环境类型</label>
              <select
                value={envType}
                onChange={(e) => setEnvType(e.target.value as EnvironmentType)}
                className="w-full px-3 py-2 text-sm bg-dock-bg border border-dock-border rounded-lg text-dock-text outline-none"
              >
                {(Object.keys(ENV_LABELS) as EnvironmentType[]).map((t) => (
                  <option key={t} value={t}>
                    {ENV_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
          )}

          {type === 'role' && (
            <div>
              <label className="text-xs text-dock-muted mb-1 block">角色类型</label>
              <select
                value={roleType}
                onChange={(e) => setRoleType(e.target.value as RoleType)}
                className="w-full px-3 py-2 text-sm bg-dock-bg border border-dock-border rounded-lg text-dock-text outline-none"
              >
                {(Object.keys(ROLE_LABELS) as RoleType[]).map((t) => (
                  <option key={t} value={t}>
                    {ROLE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
          )}

          {type === 'host' && (
            <>
              <div>
                <label className="text-xs text-dock-muted mb-1 block">IP 地址</label>
                <input
                  value={ip}
                  onChange={(e) => setIp(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-dock-bg border border-dock-border rounded-lg text-dock-text outline-none focus:border-dock-accent"
                  placeholder="10.0.0.1"
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
              <div>
                <label className="text-xs text-dock-muted mb-1 block">标签（可选）</label>
                <input
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-dock-bg border border-dock-border rounded-lg text-dock-text outline-none focus:border-dock-accent"
                  placeholder="pay-db prod-gateway"
                />
              </div>
            </>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-sm text-dock-muted hover:text-dock-text border border-dock-border rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 py-2 text-sm bg-dock-accent hover:bg-dock-accent-hover text-white rounded-lg transition-colors"
            >
              添加
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
