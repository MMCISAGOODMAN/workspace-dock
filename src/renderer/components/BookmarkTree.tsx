import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  FolderOpen,
  Layers,
  Download,
  Upload,
  GripVertical,
  Pencil,
  Trash2,
} from 'lucide-react';
import type { Project, Environment, Role } from '@shared/types';
import { ENV_COLORS, ENV_LABELS, ROLE_ICONS } from '@shared/types';
import type { DragBookmarkItem } from '@shared/bookmarkTreeOps';
import { useAppStore, useToastStore } from '../store/appStore';
import { getAPI } from '../types/electron';
import { cn } from '../utils/helpers';
import { useBookmarkDragDrop, dropId } from '../hooks/useBookmarkDragDrop';
import { HostItem } from './HostItem';
import { AddNodeModal } from './modals/AddNodeModal';
import { EditNodeModal, type EditNodeTarget } from './modals/EditNodeModal';
import { ContextMenu, type ContextMenuItem } from './ContextMenu';

export function BookmarkTree() {
  const { bookmarks, loadAll, moveBookmarkNode, deleteNode } = useAppStore();
  const addToast = useToastStore((s) => s.addToast);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [addModal, setAddModal] = useState<{
    type: 'project' | 'environment' | 'role' | 'host';
    parentIds?: string[];
  } | null>(null);
  const [editTarget, setEditTarget] = useState<EditNodeTarget | null>(null);

  const handleDeleteNode = (
    type: 'project' | 'environment' | 'role',
    id: string,
    name: string,
    parentIds: string[] = [],
    childHint?: string,
  ) => {
    const hint = childHint ? `及其下所有${childHint}` : '';
    if (!window.confirm(`确定删除「${name}」${hint}吗？此操作不可撤销。`)) return;
    deleteNode(type, id, parentIds);
    addToast('已删除', 'success');
  };

  const { dragOver, onDragStart, onDragOver, onDragLeave, onDrop } = useBookmarkDragDrop(
    (source, target, position) => {
      moveBookmarkNode(source, target, position);
      addToast('书签已移动', 'success');
    },
    bookmarks,
  );

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    const ids = new Set<string>();
    bookmarks.projects.forEach((p) => {
      ids.add(p.id);
      p.environments.forEach((e) => {
        ids.add(e.id);
        e.roles.forEach((r) => ids.add(r.id));
      });
    });
    setExpanded(ids);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-dock-border">
        <span className="text-xs text-dock-muted font-medium uppercase tracking-wider">
          智能书签
        </span>
        <div className="flex gap-1">
          <button
            onClick={async () => {
              const res = await getAPI().exportBookmarks();
              if (res.success) addToast(`已导出到 ${res.path}`, 'success');
            }}
            className="p-1 text-dock-muted hover:text-dock-text rounded hover:bg-dock-hover"
            title="导出书签"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={async () => {
              const res = await getAPI().importBookmarks('merge');
              if (res.success) {
                await loadAll();
                addToast('书签已导入（合并模式）', 'success');
              }
            }}
            className="p-1 text-dock-muted hover:text-dock-text rounded hover:bg-dock-hover"
            title="导入书签"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
          <button onClick={expandAll} className="p-1 text-dock-muted hover:text-dock-text rounded hover:bg-dock-hover" title="展开全部">
            <Layers className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setAddModal({ type: 'project' })}
            className="p-1 text-dock-muted hover:text-dock-accent rounded hover:bg-dock-hover"
            title="添加项目"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="px-3 py-1 text-[10px] text-dock-muted border-b border-dock-border">
        拖拽节点可调整顺序；拖出面板可导出 SSH 命令或 JSON
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {bookmarks.projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-dock-muted text-sm gap-2">
            <FolderOpen className="w-8 h-8 opacity-50" />
            <span>暂无书签，点击 + 添加项目</span>
          </div>
        ) : (
          bookmarks.projects.map((project) => (
            <ProjectNode
              key={project.id}
              project={project}
              expanded={expanded}
              toggle={toggle}
              onAdd={(type, parentIds) => setAddModal({ type, parentIds })}
              onEdit={setEditTarget}
              onDelete={handleDeleteNode}
              dragOver={dragOver}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
            />
          ))
        )}
      </div>

      {addModal && (
        <AddNodeModal type={addModal.type} parentIds={addModal.parentIds} onClose={() => setAddModal(null)} />
      )}
      {editTarget && <EditNodeModal target={editTarget} onClose={() => setEditTarget(null)} />}
    </div>
  );
}

type NodeHandlers = {
  onEdit: (target: EditNodeTarget) => void;
  onDelete: (
    type: 'project' | 'environment' | 'role',
    id: string,
    name: string,
    parentIds?: string[],
    childHint?: string,
  ) => void;
};

type DragHandlers = ReturnType<typeof useBookmarkDragDrop>;

function ProjectNode({
  project,
  expanded,
  toggle,
  onAdd,
  onEdit,
  onDelete,
  ...drag
}: {
  project: Project;
  expanded: Set<string>;
  toggle: (id: string) => void;
  onAdd: (type: 'environment' | 'role' | 'host', parentIds: string[]) => void;
} & NodeHandlers &
  DragHandlers) {
  const isOpen = expanded.has(project.id);
  const item: DragBookmarkItem = { type: 'project', id: project.id };
  const id = dropId(item);

  return (
    <div>
      <TreeRow
        item={item}
        icon={<FolderOpen className="w-4 h-4 text-dock-accent" />}
        label={project.name}
        count={project.environments.length}
        isOpen={isOpen}
        onToggle={() => toggle(project.id)}
        onAdd={() => onAdd('environment', [project.id])}
        depth={0}
        isDragOver={drag.dragOver === id}
        contextMenuItems={[
          {
            label: '编辑',
            icon: <Pencil className="w-4 h-4" />,
            onClick: () => onEdit({ type: 'project', project }),
          },
          { label: '', onClick: () => {}, divider: true },
          {
            label: '删除',
            icon: <Trash2 className="w-4 h-4" />,
            onClick: () => onDelete('project', project.id, project.name, [], '环境、角色和主机'),
            danger: true,
          },
        ]}
        {...drag}
      />
      {isOpen &&
        project.environments.map((env) => (
          <EnvironmentNode
            key={env.id}
            env={env}
            projectId={project.id}
            expanded={expanded}
            toggle={toggle}
            onAdd={onAdd}
            onEdit={onEdit}
            onDelete={onDelete}
            {...drag}
          />
        ))}
    </div>
  );
}

function EnvironmentNode({
  env,
  projectId,
  expanded,
  toggle,
  onAdd,
  onEdit,
  onDelete,
  ...drag
}: {
  env: Environment;
  projectId: string;
  expanded: Set<string>;
  toggle: (id: string) => void;
  onAdd: (type: 'role' | 'host', parentIds: string[]) => void;
} & NodeHandlers &
  DragHandlers) {
  const isOpen = expanded.has(env.id);
  const item: DragBookmarkItem = { type: 'environment', id: env.id, projectId };

  return (
    <div>
      <TreeRow
        item={item}
        icon={<span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ENV_COLORS[env.type] }} />}
        label={env.name}
        subtitle={ENV_LABELS[env.type]}
        count={env.roles.length}
        isOpen={isOpen}
        onToggle={() => toggle(env.id)}
        onAdd={() => onAdd('role', [projectId, env.id])}
        depth={1}
        isDragOver={drag.dragOver === dropId(item)}
        contextMenuItems={[
          {
            label: '编辑',
            icon: <Pencil className="w-4 h-4" />,
            onClick: () => onEdit({ type: 'environment', projectId, environment: env }),
          },
          { label: '', onClick: () => {}, divider: true },
          {
            label: '删除',
            icon: <Trash2 className="w-4 h-4" />,
            onClick: () => onDelete('environment', env.id, env.name, [projectId], '角色和主机'),
            danger: true,
          },
        ]}
        {...drag}
      />
      {isOpen &&
        env.roles.map((role) => (
          <RoleNode
            key={role.id}
            role={role}
            projectId={projectId}
            envId={env.id}
            expanded={expanded}
            toggle={toggle}
            onAdd={onAdd}
            onEdit={onEdit}
            onDelete={onDelete}
            {...drag}
          />
        ))}
    </div>
  );
}

function RoleNode({
  role,
  projectId,
  envId,
  expanded,
  toggle,
  onAdd,
  onEdit,
  onDelete,
  ...drag
}: {
  role: Role;
  projectId: string;
  envId: string;
  expanded: Set<string>;
  toggle: (id: string) => void;
  onAdd: (type: 'host', parentIds: string[]) => void;
} & NodeHandlers &
  DragHandlers) {
  const isOpen = expanded.has(role.id);
  const { bookmarks } = useAppStore();
  const project = bookmarks.projects.find((p) => p.id === projectId)!;
  const env = project.environments.find((e) => e.id === envId)!;
  const item: DragBookmarkItem = { type: 'role', id: role.id, projectId, environmentId: envId };

  return (
    <div>
      <TreeRow
        item={item}
        icon={<span className="text-sm">{ROLE_ICONS[role.type]}</span>}
        label={role.name}
        count={role.hosts.length}
        isOpen={isOpen}
        onToggle={() => toggle(role.id)}
        onAdd={() => onAdd('host', [projectId, envId, role.id])}
        depth={2}
        isDragOver={drag.dragOver === dropId(item)}
        acceptDropInside
        contextMenuItems={[
          {
            label: '编辑',
            icon: <Pencil className="w-4 h-4" />,
            onClick: () => onEdit({ type: 'role', projectId, envId, role }),
          },
          { label: '', onClick: () => {}, divider: true },
          {
            label: '删除',
            icon: <Trash2 className="w-4 h-4" />,
            onClick: () => onDelete('role', role.id, role.name, [projectId, envId], '主机'),
            danger: true,
          },
        ]}
        {...drag}
      />
      {isOpen &&
        role.hosts.map((host) => {
          const flatHost = {
            ...host,
            projectId,
            projectName: project.name,
            environmentId: envId,
            environmentName: env.name,
            environmentType: env.type,
            roleId: role.id,
            roleName: role.name,
            roleType: role.type,
          };
          return <HostItem key={host.id} host={flatHost} depth={3} dragHandlers={drag} />;
        })}
    </div>
  );
}

function TreeRow({
  item,
  icon,
  label,
  subtitle,
  count,
  isOpen,
  onToggle,
  onAdd,
  depth,
  isDragOver,
  acceptDropInside,
  contextMenuItems,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  item: DragBookmarkItem;
  icon: React.ReactNode;
  label: string;
  subtitle?: string;
  count: number;
  isOpen: boolean;
  onToggle: () => void;
  onAdd: () => void;
  depth: number;
  isDragOver?: boolean;
  acceptDropInside?: boolean;
  contextMenuItems: ContextMenuItem[];
  onDragStart: (item: DragBookmarkItem) => (e: React.DragEvent) => void;
  onDragOver: (id: string) => (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (target: DragBookmarkItem, position: 'before' | 'after' | 'inside') => (e: React.DragEvent) => void;
}) {
  const id = dropId(item);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  return (
    <>
      <div
        draggable
        onDragStart={onDragStart(item)}
        onDragOver={onDragOver(id)}
        onDragLeave={onDragLeave}
        onDrop={onDrop(item, acceptDropInside ? 'inside' : 'after')}
        className={cn(
          'group flex items-center gap-1 px-2 py-1 rounded-md mx-1 transition-colors',
          isDragOver ? 'bg-dock-accent/20 ring-1 ring-dock-accent/50' : 'hover:bg-dock-hover',
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onContextMenu={(e) => {
          e.preventDefault();
          setContextMenu({ x: e.clientX, y: e.clientY });
        }}
      >
      <GripVertical className="w-3 h-3 text-dock-muted opacity-0 group-hover:opacity-60 shrink-0 cursor-grab" />
      <button onClick={onToggle} className="p-0.5 text-dock-muted hover:text-dock-text">
        {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
      </button>
      <span className="shrink-0">{icon}</span>
      <button onClick={onToggle} className="flex-1 min-w-0 text-left">
        <span className="text-sm text-dock-text">{label}</span>
        {subtitle && <span className="text-[10px] text-dock-muted ml-1.5">{subtitle}</span>}
        <span className="text-[10px] text-dock-muted ml-1">({count})</span>
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onAdd();
        }}
        className="p-0.5 text-dock-muted hover:text-dock-accent opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
}
