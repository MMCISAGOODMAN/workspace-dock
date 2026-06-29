import { useState } from 'react';
import { Camera, RotateCcw, Trash2, Plus, Server, GitCompare, Download, Upload } from 'lucide-react';
import type { Snapshot } from '@shared/types';
import { useAppStore, useToastStore } from '../store/appStore';
import { getAPI } from '../types/electron';
import { formatDateTime, cn } from '../utils/helpers';
import { SaveSnapshotModal } from './modals/SaveSnapshotModal';
import { SnapshotDiffModal } from './modals/SnapshotDiffModal';

export function SnapshotDrawer() {
  const { snapshots, restoreSnapshot, deleteSnapshot, activeSessions, clearActiveSessions, importSnapshots } =
    useAppStore();
  const addToast = useToastStore((s) => s.addToast);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [comparePair, setComparePair] = useState<{ baseline: Snapshot; current: Snapshot } | null>(
    null,
  );
  const [pendingRestore, setPendingRestore] = useState<Snapshot | null>(null);

  const handleRestore = async (snapshot: Snapshot) => {
    if (snapshots.length >= 2) {
      const baseline = snapshots.find((s) => s.id !== snapshot.id) ?? snapshots[1];
      setComparePair({ baseline, current: snapshot });
      setPendingRestore(snapshot);
      return;
    }
    await doRestore(snapshot);
  };

  const doRestore = async (snapshot: Snapshot) => {
    setRestoring(snapshot.id);
    try {
      await restoreSnapshot(snapshot);
      addToast(`已恢复快照「${snapshot.name}」`, 'success');
    } catch (e) {
      addToast(e instanceof Error ? e.message : '恢复失败', 'error');
    } finally {
      setRestoring(null);
      setPendingRestore(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    await deleteSnapshot(id);
    addToast(`已删除快照「${name}」`, 'success');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-dock-border">
        <span className="text-xs text-dock-muted font-medium uppercase tracking-wider">
          快照抽屉
        </span>
        <div className="flex gap-1">
          <button
            onClick={async () => {
              const ok = await importSnapshots();
              if (ok) addToast('快照已导入', 'success');
              else addToast('导入失败或已取消', 'error');
            }}
            className="p-1 text-dock-muted hover:text-dock-accent rounded"
            title="导入快照"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={async () => {
              const res = await getAPI().exportSnapshots();
              if (res.success) addToast(`快照已导出`, 'success');
            }}
            className="p-1 text-dock-muted hover:text-dock-accent rounded"
            title="导出快照"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowSaveModal(true)}
            className="flex items-center gap-1 px-2 py-1 text-xs text-dock-accent hover:bg-dock-accent/10 rounded transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            保存
          </button>
        </div>
      </div>

      {activeSessions.length > 0 && (
        <div className="px-3 py-2 border-b border-dock-border bg-dock-accent/5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-dock-muted">当前活跃会话</span>
            <button
              onClick={clearActiveSessions}
              className="text-[10px] text-dock-muted hover:text-dock-danger"
            >
              清除
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {activeSessions.map((s) => (
              <span
                key={s.hostId}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] bg-dock-hover rounded text-dock-text"
              >
                <Server className="w-3 h-3" />
                {s.hostName ?? s.ip}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {snapshots.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-dock-muted text-sm gap-2">
            <Camera className="w-8 h-8 opacity-50" />
            <span>暂无快照</span>
          </div>
        ) : (
          snapshots.map((snapshot, idx) => (
            <div
              key={snapshot.id}
              className="p-3 bg-dock-hover/50 border border-dock-border rounded-lg hover:border-dock-accent/30 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="text-sm font-medium text-dock-text">{snapshot.name}</h4>
                  <p className="text-[11px] text-dock-muted mt-0.5">
                    {formatDateTime(snapshot.createdAt)} · {snapshot.sessions.length} 台主机
                    {(snapshot.layout?.terminal || snapshot.layout?.terminals?.length) &&
                      ` · 含${snapshot.layout?.terminals?.length ? ` ${snapshot.layout.terminals.length} 个` : ''}窗口布局`}
                  </p>
                </div>
                {idx > 0 && (
                  <button
                    onClick={() =>
                      setComparePair({ baseline: snapshots[idx - 1], current: snapshot })
                    }
                    className="p-1 text-dock-muted hover:text-dock-accent rounded"
                    title="与上一快照对比"
                  >
                    <GitCompare className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-1 mb-3">
                {snapshot.sessions.slice(0, 4).map((s) => (
                  <span
                    key={s.hostId}
                    className="text-[10px] px-1.5 py-0.5 bg-dock-bg rounded text-dock-muted"
                  >
                    {s.hostName}
                  </span>
                ))}
                {snapshot.sessions.length > 4 && (
                  <span className="text-[10px] px-1.5 py-0.5 text-dock-muted">
                    +{snapshot.sessions.length - 4}
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleRestore(snapshot)}
                  disabled={restoring === snapshot.id}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs bg-dock-accent hover:bg-dock-accent-hover text-white rounded transition-colors disabled:opacity-50"
                >
                  <RotateCcw className={cn('w-3.5 h-3.5', restoring === snapshot.id && 'animate-spin')} />
                  {restoring === snapshot.id ? '恢复中...' : '恢复'}
                </button>
                <button
                  onClick={() => handleDelete(snapshot.id, snapshot.name)}
                  className="p-1.5 text-dock-muted hover:text-dock-danger hover:bg-dock-danger/10 rounded transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showSaveModal && <SaveSnapshotModal onClose={() => setShowSaveModal(false)} />}

      {comparePair && (
        <SnapshotDiffModal
          baseline={comparePair.baseline}
          current={comparePair.current}
          onClose={() => {
            setComparePair(null);
            setPendingRestore(null);
          }}
          onConfirmRestore={
            pendingRestore ? () => doRestore(pendingRestore) : undefined
          }
        />
      )}
    </div>
  );
}
