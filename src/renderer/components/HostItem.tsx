import { useState, useEffect } from 'react';
import { Circle, GripVertical } from 'lucide-react';
import type { FlatHost } from '@shared/types';
import { ENV_COLORS, ROLE_ICONS } from '@shared/types';
import type { DragBookmarkItem } from '@shared/bookmarkTreeOps';
import { useAppStore, useToastStore } from '../store/appStore';
import { getAPI } from '../types/electron';
import { cn, buildSSHCommand } from '../utils/helpers';
import { ContextMenu, ContextMenuItem } from './ContextMenu';
import { Terminal, Copy, Pencil, Trash2, Link, ExternalLink } from 'lucide-react';
import { EditHostModal } from './modals/EditHostModal';
import { dropId } from '../hooks/useBookmarkDragDrop';

interface HostItemProps {
  host: FlatHost;
  depth?: number;
  dragHandlers?: {
    dragOver: string | null;
    onDragStart: (item: DragBookmarkItem) => (e: React.DragEvent) => void;
    onDragOver: (id: string) => (e: React.DragEvent) => void;
    onDragLeave: () => void;
    onDrop: (target: DragBookmarkItem, position: 'before' | 'after' | 'inside') => (e: React.DragEvent) => void;
  };
}

export function HostItem({ host, depth = 0, dragHandlers }: HostItemProps) {
  const { connectHost, selectedHostIds, toggleHostSelection, deleteHost, settings } = useAppStore();
  const addToast = useToastStore((s) => s.addToast);
  const [online, setOnline] = useState<boolean | undefined>(host.online);
  const [checking, setChecking] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const isSelected = selectedHostIds.has(host.id);

  const dragItem: DragBookmarkItem = {
    type: 'host',
    id: host.id,
    projectId: host.projectId,
    environmentId: host.environmentId,
    roleId: host.roleId,
  };
  const dragId = dropId(dragItem);

  useEffect(() => {
    let cancelled = false;
    setChecking(true);
    getAPI()
      .sshCheckOnline({ ip: host.ip, port: host.port })
      .then((result) => {
        if (!cancelled) setOnline(result);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [host.ip, host.port]);

  const handleConnect = async (opts?: { newWindow?: boolean }) => {
    setConnecting(true);
    try {
      await connectHost(host, undefined, opts);
      addToast(opts?.newWindow ? `已在新窗口连接 ${host.name}` : `已连接 ${host.name}`, 'success');
    } catch (e) {
      addToast(e instanceof Error ? e.message : '连接失败', 'error');
    } finally {
      setConnecting(false);
    }
  };

  const contextItems: ContextMenuItem[] = [
    { label: '连接', icon: <Terminal className="w-4 h-4" />, onClick: () => handleConnect() },
    ...(settings.useBuiltInTerminal
      ? [
          {
            label: '在新终端窗口打开',
            icon: <ExternalLink className="w-4 h-4" />,
            onClick: () => handleConnect({ newWindow: true }),
          },
        ]
      : []),
    {
      label: '复制 IP',
      icon: <Copy className="w-4 h-4" />,
      onClick: () => {
        getAPI().copyToClipboard(host.ip);
        addToast('已复制 IP', 'success');
      },
    },
    {
      label: '复制 SSH 命令',
      icon: <Link className="w-4 h-4" />,
      onClick: () => {
        getAPI().copyToClipboard(buildSSHCommand(host.ip, host.port, host.username, host.lastPath));
        addToast('已复制 SSH 命令', 'success');
      },
    },
    { label: '', onClick: () => {}, divider: true },
    { label: '编辑', icon: <Pencil className="w-4 h-4" />, onClick: () => setShowEdit(true) },
    {
      label: '删除',
      icon: <Trash2 className="w-4 h-4" />,
      onClick: () => {
        deleteHost(host.id);
        addToast('已删除主机', 'success');
      },
      danger: true,
    },
  ];

  return (
    <>
      <div
        draggable={!!dragHandlers}
        onDragStart={dragHandlers?.onDragStart(dragItem)}
        onDragOver={dragHandlers?.onDragOver(dragId)}
        onDragLeave={dragHandlers?.onDragLeave}
        onDrop={dragHandlers?.onDrop(dragItem, 'after')}
        className={cn(
          'group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors mx-1',
          isSelected ? 'bg-dock-accent/15' : 'hover:bg-dock-hover',
          connecting && 'opacity-60',
          dragHandlers?.dragOver === dragId && 'bg-dock-accent/20 ring-1 ring-dock-accent/50',
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={handleConnect}
        onContextMenu={(e) => {
          e.preventDefault();
          setContextMenu({ x: e.clientX, y: e.clientY });
        }}
      >
        {dragHandlers && (
          <GripVertical className="w-3 h-3 text-dock-muted opacity-0 group-hover:opacity-60 shrink-0 cursor-grab" />
        )}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation();
            toggleHostSelection(host.id);
          }}
          onClick={(e) => e.stopPropagation()}
          className="w-3.5 h-3.5 rounded border-dock-border accent-dock-accent shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        />
        <span className="text-xs shrink-0">{ROLE_ICONS[host.roleType]}</span>
        <Circle
          className={cn(
            'w-2 h-2 shrink-0',
            checking ? 'text-dock-muted animate-pulse' : online ? 'fill-env-production text-env-production' : 'text-dock-muted',
          )}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-dock-text truncate">{host.name}</span>
            <span
              className="text-[10px] px-1 rounded shrink-0"
              style={{ color: ENV_COLORS[host.environmentType], backgroundColor: `${ENV_COLORS[host.environmentType]}20` }}
            >
              {host.environmentName}
            </span>
          </div>
          <div className="text-[11px] text-dock-muted truncate">
            {host.ip}
            {host.lastPath && <span className="ml-1.5 opacity-70">{host.lastPath}</span>}
          </div>
        </div>
      </div>

      {contextMenu && (
        <ContextMenu x={contextMenu.x} y={contextMenu.y} items={contextItems} onClose={() => setContextMenu(null)} />
      )}
      {showEdit && <EditHostModal host={host} onClose={() => setShowEdit(false)} />}
    </>
  );
}
