import { X } from 'lucide-react';
import type { Snapshot, SnapshotDiffItem } from '@shared/types';
import { diffSnapshots } from '@shared/types';

interface SnapshotDiffModalProps {
  baseline: Snapshot;
  current: Snapshot;
  onClose: () => void;
  onConfirmRestore?: () => void;
}

const TYPE_LABELS: Record<SnapshotDiffItem['type'], { label: string; color: string }> = {
  added: { label: '新增', color: 'text-env-production' },
  removed: { label: '下线', color: 'text-dock-danger' },
  changed: { label: '变更', color: 'text-dock-warning' },
  unchanged: { label: '未变', color: 'text-dock-muted' },
};

export function SnapshotDiffModal({
  baseline,
  current,
  onClose,
  onConfirmRestore,
}: SnapshotDiffModalProps) {
  const diff = diffSnapshots(baseline, current);
  const changes = diff.filter((d) => d.type !== 'unchanged');

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-[520px] max-h-[80vh] bg-dock-panel border border-dock-border rounded-xl shadow-2xl flex flex-col animate-fade-in">
        <div className="flex items-center justify-between px-4 py-3 border-b border-dock-border">
          <div>
            <h3 className="text-sm font-medium text-dock-text">快照对比</h3>
            <p className="text-[11px] text-dock-muted mt-0.5">
              「{baseline.name}」→「{current.name}」
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-dock-muted hover:text-dock-text rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-2">
          {changes.length === 0 ? (
            <p className="text-sm text-dock-muted text-center py-6">两次快照无差异</p>
          ) : (
            changes.map((item) => (
              <div
                key={`${item.hostId}-${item.type}`}
                className="p-2.5 bg-dock-bg rounded-lg border border-dock-border"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-medium ${TYPE_LABELS[item.type].color}`}>
                    {TYPE_LABELS[item.type].label}
                  </span>
                  <span className="text-sm text-dock-text">{item.hostName}</span>
                  <span className="text-[11px] text-dock-muted">{item.ip}</span>
                </div>
                {item.detail && (
                  <p className="text-[11px] text-dock-muted">{item.detail}</p>
                )}
                {item.oldPath && item.newPath && item.oldPath !== item.newPath && (
                  <p className="text-[11px] text-dock-muted font-mono mt-0.5">
                    {item.oldPath} → {item.newPath}
                  </p>
                )}
              </div>
            ))
          )}

          <div className="text-[11px] text-dock-muted pt-2 border-t border-dock-border">
            共 {diff.length} 台主机，{changes.length} 处变化，{diff.filter((d) => d.type === 'unchanged').length} 台未变
          </div>
        </div>

        <div className="flex gap-2 p-4 border-t border-dock-border">
          <button
            onClick={onClose}
            className="flex-1 py-2 text-sm text-dock-muted border border-dock-border rounded-lg"
          >
            关闭
          </button>
          {onConfirmRestore && changes.length > 0 && (
            <button
              onClick={() => {
                onConfirmRestore();
                onClose();
              }}
              className="flex-1 py-2 text-sm bg-dock-accent text-white rounded-lg"
            >
              仍要恢复
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
