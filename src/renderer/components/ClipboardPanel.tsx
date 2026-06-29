import { useState, useEffect } from 'react';
import { ClipboardPaste, Copy, X, ChevronDown, ChevronUp, Terminal, Plus } from 'lucide-react';
import { formatClipboardHostLabel } from '@shared/types';
import { useAppStore, useToastStore } from '../store/appStore';
import { getAPI } from '../types/electron';
import { AddTempFavoriteModal } from './modals/AddTempFavoriteModal';

export function ClipboardPanel() {
  const {
    clipboardCapture,
    copyClipboardCapture,
    dismissClipboardHost,
    addTempFavoriteFromClipboard,
  } = useAppStore();
  const addToast = useToastStore((s) => s.addToast);
  const [expanded, setExpanded] = useState(false);
  const [editText, setEditText] = useState('');
  const [showSshModal, setShowSshModal] = useState(false);
  const [addingSsh, setAddingSsh] = useState(false);

  useEffect(() => {
    if (clipboardCapture) {
      setEditText(clipboardCapture.text);
      setExpanded(false);
    }
  }, [clipboardCapture]);

  const handleCopy = async (text?: string) => {
    try {
      if (text !== undefined) {
        await getAPI().copyToClipboard(text);
      } else {
        await copyClipboardCapture();
      }
      addToast('已复制到剪贴板', 'success');
    } catch (e) {
      addToast(e instanceof Error ? e.message : '复制失败', 'error');
    }
  };

  const handleDismiss = async () => {
    await dismissClipboardHost();
    setExpanded(false);
  };

  const handleAddAsTempSsh = async (connect: boolean) => {
    if (!clipboardCapture?.host) return;
    setAddingSsh(true);
    try {
      await addTempFavoriteFromClipboard({ connect });
      addToast(
        connect
          ? `已连接 ${formatClipboardHostLabel(clipboardCapture.host)}`
          : '已添加临时 SSH 收藏',
        'success',
      );
    } catch (e) {
      addToast(e instanceof Error ? e.message : '操作失败', 'error');
    } finally {
      setAddingSsh(false);
    }
  };

  if (!clipboardCapture) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-3 py-2 border-b border-dock-border">
          <span className="text-xs text-dock-muted font-medium uppercase tracking-wider">
            剪贴板
          </span>
        </div>
        <div className="flex flex-col items-center justify-center flex-1 text-dock-muted text-sm gap-2 px-4">
          <ClipboardPaste className="w-8 h-8 opacity-50" />
          <span>暂无复制内容</span>
          <span className="text-xs opacity-70 text-center">
            在任意处复制文本后，会自动显示在这里
          </span>
        </div>
      </div>
    );
  }

  const host = clipboardCapture.host;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-dock-border">
        <span className="text-xs text-dock-muted font-medium uppercase tracking-wider">
          剪贴板
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => void handleCopy(expanded ? editText : undefined)}
            className="flex items-center gap-1 px-2 py-1 text-xs text-dock-accent hover:bg-dock-accent/10 rounded transition-colors"
            title="复制"
          >
            <Copy className="w-3.5 h-3.5" />
            复制
          </button>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 px-2 py-1 text-xs text-dock-muted hover:text-dock-text hover:bg-dock-hover rounded transition-colors"
          >
            {expanded ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                收起
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                展开
              </>
            )}
          </button>
          <button
            onClick={() => void handleDismiss()}
            className="p-1 text-dock-muted hover:text-dock-text rounded"
            title="清除"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="px-3 py-2 text-[11px] text-dock-muted border-b border-dock-border">
        与 SSH / 书签无关 · 点击内容区域可选中复制
      </div>

      <div className="flex-1 overflow-y-auto p-3 min-h-0">
        {expanded ? (
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="w-full h-full min-h-[120px] px-3 py-2 text-sm bg-dock-bg border border-dock-border rounded-lg text-dock-text outline-none focus:border-dock-accent resize-none font-mono leading-relaxed"
            spellCheck={false}
          />
        ) : (
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="w-full text-left px-3 py-2 text-sm bg-dock-bg border border-dock-border rounded-lg text-dock-text hover:border-dock-accent/50 transition-colors"
            title="点击复制全部内容"
          >
            <pre className="whitespace-pre-wrap break-all font-mono text-xs leading-relaxed select-text">
              {clipboardCapture.text}
            </pre>
          </button>
        )}
      </div>

      {host && (
        <div className="shrink-0 px-3 py-2 border-t border-dock-border bg-dock-bg/50">
          <div className="text-[10px] text-dock-muted mb-1.5">
            可选：识别到主机 {formatClipboardHostLabel(host)}
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => void handleAddAsTempSsh(false)}
              disabled={addingSsh}
              className="flex items-center gap-1 flex-1 justify-center py-1.5 text-xs border border-dock-border rounded-md text-dock-muted hover:text-dock-text hover:bg-dock-hover disabled:opacity-50"
            >
              <Plus className="w-3 h-3" />
              临时 SSH
            </button>
            <button
              onClick={() => void handleAddAsTempSsh(true)}
              disabled={addingSsh}
              className="flex items-center gap-1 flex-1 justify-center py-1.5 text-xs bg-dock-accent/15 text-dock-accent rounded-md hover:bg-dock-accent/25 disabled:opacity-50"
            >
              <Terminal className="w-3 h-3" />
              连接
            </button>
            <button
              onClick={() => setShowSshModal(true)}
              className="px-2 py-1.5 text-xs text-dock-muted hover:text-dock-text border border-dock-border rounded-md"
              title="编辑 SSH 信息后添加"
            >
              编辑
            </button>
          </div>
        </div>
      )}

      {showSshModal && (
        <AddTempFavoriteModal
          initial={clipboardCapture}
          onClose={() => setShowSshModal(false)}
        />
      )}
    </div>
  );
}
