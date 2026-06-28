import { useState } from 'react';
import { X, Terminal, AlertTriangle } from 'lucide-react';
import type { FlatHost } from '@shared/types';
import { flattenHosts } from '@shared/types';
import { useAppStore, useToastStore } from '../../store/appStore';
import { getAPI } from '../../types/electron';

interface BatchCommandModalProps {
  onClose: () => void;
}

export function BatchCommandModal({ onClose }: BatchCommandModalProps) {
  const { bookmarks, selectedHostIds, clearSelection } = useAppStore();
  const addToast = useToastStore((s) => s.addToast);
  const [command, setCommand] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<
    Array<{ hostName: string; ip: string; success: boolean; output: string }>
  >([]);

  const flat = flattenHosts(bookmarks);
  const selected = flat.filter((h) => selectedHostIds.has(h.id));

  const handleRun = async () => {
    if (!command.trim() || selected.length === 0) return;
    if (!confirmed) {
      setConfirmed(true);
      return;
    }

    setRunning(true);
    try {
      const hosts = selected.map((h: FlatHost) => ({
        hostId: h.id,
        hostName: h.name,
        ip: h.ip,
        port: h.port,
        username: h.username,
      }));
      const res = await getAPI().sshBatchExec({ hosts, command: command.trim() });
      setResults(
        res.map((r) => ({
          hostName: r.hostName,
          ip: r.ip,
          success: r.success,
          output: r.success ? r.stdout || r.stderr : r.error ?? '失败',
        })),
      );
      addToast(`已在 ${selected.length} 台主机执行命令`, 'success');
    } catch (e) {
      addToast(e instanceof Error ? e.message : '批量执行失败', 'error');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-[480px] max-h-[80vh] bg-dock-panel border border-dock-border rounded-xl shadow-2xl flex flex-col animate-fade-in">
        <div className="flex items-center justify-between px-4 py-3 border-b border-dock-border shrink-0">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-dock-accent" />
            <h3 className="text-sm font-medium text-dock-text">批量执行命令</h3>
          </div>
          <button onClick={onClose} className="p-1 text-dock-muted hover:text-dock-text rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto flex-1">
          <div className="text-xs text-dock-muted">
            已选择 {selected.length} 台主机
          </div>
          <div className="flex flex-wrap gap-1">
            {selected.map((h) => (
              <span key={h.id} className="text-[10px] px-1.5 py-0.5 bg-dock-hover rounded text-dock-text">
                {h.name}
              </span>
            ))}
          </div>

          <input
            value={command}
            onChange={(e) => {
              setCommand(e.target.value);
              setConfirmed(false);
            }}
            placeholder="输入要执行的命令，如 uptime"
            className="w-full px-3 py-2 text-sm bg-dock-bg border border-dock-border rounded-lg text-dock-text outline-none focus:border-dock-accent font-mono"
            autoFocus
          />

          {confirmed && !results.length && (
            <div className="flex items-start gap-2 p-3 bg-dock-warning/10 border border-dock-warning/30 rounded-lg text-xs text-dock-warning">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                确认在 {selected.length} 台主机上执行 <code className="font-mono">{command}</code>？
                此操作不可撤销，请再次点击执行。
              </span>
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {results.map((r) => (
                <div key={r.ip} className="p-2 bg-dock-bg rounded border border-dock-border text-xs">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={r.success ? 'text-env-production' : 'text-dock-danger'}>
                      {r.success ? '✓' : '✗'}
                    </span>
                    <span className="text-dock-text font-medium">{r.hostName}</span>
                    <span className="text-dock-muted">{r.ip}</span>
                  </div>
                  <pre className="text-dock-muted font-mono whitespace-pre-wrap break-all">{r.output}</pre>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 p-4 border-t border-dock-border shrink-0">
          <button
            onClick={() => {
              clearSelection();
              onClose();
            }}
            className="flex-1 py-2 text-sm text-dock-muted border border-dock-border rounded-lg"
          >
            取消
          </button>
          <button
            onClick={handleRun}
            disabled={running || !command.trim() || selected.length === 0}
            className="flex-1 py-2 text-sm bg-dock-accent hover:bg-dock-accent-hover text-white rounded-lg disabled:opacity-50"
          >
            {running ? '执行中...' : confirmed ? '确认执行' : '执行'}
          </button>
        </div>
      </div>
    </div>
  );
}
