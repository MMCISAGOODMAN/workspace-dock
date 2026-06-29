import { useState } from 'react';
import { X, ArrowRightCircle, Plus } from 'lucide-react';
import type { TempFavorite } from '@shared/types';
import { useAppStore, useToastStore } from '../../store/appStore';
import { AddNodeModal } from './AddNodeModal';

interface ConvertTempFavoriteModalProps {
  favorite: TempFavorite;
  onClose: () => void;
}

export function ConvertTempFavoriteModal({ favorite, onClose }: ConvertTempFavoriteModalProps) {
  const { bookmarks, convertTempToBookmark } = useAppStore();
  const addToast = useToastStore((s) => s.addToast);

  const [projectId, setProjectId] = useState(bookmarks.projects[0]?.id ?? '');
  const [envId, setEnvId] = useState('');
  const [roleId, setRoleId] = useState('');
  const [addNode, setAddNode] = useState<{
    type: 'project' | 'environment' | 'role';
    parentIds?: string[];
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const project = bookmarks.projects.find((p) => p.id === projectId);
  const environments = project?.environments ?? [];
  const environment = environments.find((e) => e.id === envId);
  const roles = environment?.roles ?? [];

  const effectiveEnvId = envId || environments[0]?.id || '';
  const effectiveRoleId = roleId || roles[0]?.id || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !effectiveEnvId || !effectiveRoleId) {
      addToast('请选择项目、环境和角色', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await convertTempToBookmark(favorite.id, projectId, effectiveEnvId, effectiveRoleId);
      addToast(`「${favorite.name}」已转为正式书签`, 'success');
      onClose();
    } catch (err) {
      addToast(err instanceof Error ? err.message : '转换失败', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-[400px] bg-dock-panel border border-dock-border rounded-xl shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between px-4 py-3 border-b border-dock-border">
          <div className="flex items-center gap-2">
            <ArrowRightCircle className="w-4 h-4 text-dock-accent" />
            <h3 className="text-sm font-medium text-dock-text">转为正式书签</h3>
          </div>
          <button onClick={onClose} className="p-1 text-dock-muted hover:text-dock-text rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div className="px-3 py-2 rounded-lg bg-dock-bg border border-dock-border text-sm">
            <div className="text-dock-text font-medium">{favorite.name}</div>
            <div className="text-[11px] text-dock-muted mt-0.5">
              {favorite.ip}:{favorite.port} · {favorite.username}
            </div>
          </div>

          <SelectField
            label="项目"
            value={projectId}
            onChange={(id) => {
              setProjectId(id);
              setEnvId('');
              setRoleId('');
            }}
            options={bookmarks.projects.map((p) => ({ id: p.id, label: p.name }))}
            onAdd={() => setAddNode({ type: 'project' })}
            emptyHint="暂无项目，请先添加"
          />

          {projectId && (
            <SelectField
              label="环境"
              value={effectiveEnvId}
              onChange={(id) => {
                setEnvId(id);
                setRoleId('');
              }}
              options={environments.map((e) => ({ id: e.id, label: e.name }))}
              onAdd={() => setAddNode({ type: 'environment', parentIds: [projectId] })}
              emptyHint="暂无环境，请先添加"
            />
          )}

          {effectiveEnvId && (
            <SelectField
              label="角色"
              value={effectiveRoleId}
              onChange={setRoleId}
              options={roles.map((r) => ({ id: r.id, label: r.name }))}
              onAdd={() =>
                setAddNode({ type: 'role', parentIds: [projectId, effectiveEnvId] })
              }
              emptyHint="暂无角色，请先添加"
            />
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-sm border border-dock-border rounded-lg text-dock-muted"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting || !projectId || !effectiveEnvId || !effectiveRoleId}
              className="flex-1 py-2 text-sm bg-dock-accent text-white rounded-lg disabled:opacity-50"
            >
              {submitting ? '转换中...' : '确认转换'}
            </button>
          </div>
        </form>
      </div>

      {addNode && (
        <AddNodeModal
          type={addNode.type}
          parentIds={addNode.parentIds}
          onClose={() => setAddNode(null)}
        />
      )}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  onAdd,
  emptyHint,
}: {
  label: string;
  value: string;
  onChange: (id: string) => void;
  options: { id: string; label: string }[];
  onAdd: () => void;
  emptyHint: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs text-dock-muted">{label}</label>
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-0.5 text-[11px] text-dock-accent hover:underline"
        >
          <Plus className="w-3 h-3" />
          新建
        </button>
      </div>
      {options.length === 0 ? (
        <div className="text-xs text-dock-muted py-2">{emptyHint}</div>
      ) : (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 text-sm bg-dock-bg border border-dock-border rounded-lg text-dock-text outline-none focus:border-dock-accent"
        >
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
