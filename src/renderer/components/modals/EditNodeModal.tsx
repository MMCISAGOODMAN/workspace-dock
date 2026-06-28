import { useState } from 'react';
import { X, Pencil } from 'lucide-react';
import type { Environment, EnvironmentType, Project, Role, RoleType } from '@shared/types';
import { ENV_LABELS, ROLE_LABELS } from '@shared/types';
import { useAppStore, useToastStore } from '../../store/appStore';

export type EditNodeTarget =
  | { type: 'project'; project: Project }
  | { type: 'environment'; projectId: string; environment: Environment }
  | { type: 'role'; projectId: string; envId: string; role: Role };

interface EditNodeModalProps {
  target: EditNodeTarget;
  onClose: () => void;
}

export function EditNodeModal({ target, onClose }: EditNodeModalProps) {
  const { updateProject, updateEnvironment, updateRole } = useAppStore();
  const addToast = useToastStore((s) => s.addToast);

  const [name, setName] = useState(
    target.type === 'project'
      ? target.project.name
      : target.type === 'environment'
        ? target.environment.name
        : target.role.name,
  );
  const [envType, setEnvType] = useState<EnvironmentType>(
    target.type === 'environment' ? target.environment.type : 'development',
  );
  const [roleType, setRoleType] = useState<RoleType>(
    target.type === 'role' ? target.role.type : 'app',
  );

  const titles = {
    project: '编辑项目',
    environment: '编辑环境',
    role: '编辑角色',
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    switch (target.type) {
      case 'project':
        updateProject(target.project.id, { name: name.trim() });
        break;
      case 'environment':
        updateEnvironment(target.projectId, target.environment.id, {
          name: name.trim(),
          type: envType,
        });
        break;
      case 'role':
        updateRole(target.projectId, target.envId, target.role.id, {
          name: name.trim(),
          type: roleType,
        });
        break;
    }

    addToast('已更新', 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-[360px] bg-dock-panel border border-dock-border rounded-xl shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between px-4 py-3 border-b border-dock-border">
          <div className="flex items-center gap-2">
            <Pencil className="w-4 h-4 text-dock-accent" />
            <h3 className="text-sm font-medium text-dock-text">{titles[target.type]}</h3>
          </div>
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
              autoFocus
            />
          </div>

          {target.type === 'environment' && (
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

          {target.type === 'role' && (
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

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-sm text-dock-muted border border-dock-border rounded-lg"
            >
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
