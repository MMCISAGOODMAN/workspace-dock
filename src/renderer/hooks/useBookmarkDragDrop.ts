import { useState, useCallback } from 'react';
import type { BookmarkTree } from '@shared/types';
import type { DragBookmarkItem, DropPosition } from '@shared/bookmarkTreeOps';
import { parseDragItem, serializeDragItem } from '@shared/bookmarkTreeOps';
import { buildExternalDragPayload } from '@shared/bookmarkDragExport';

function applyExternalDragData(dataTransfer: DataTransfer, payload: ReturnType<typeof buildExternalDragPayload>): void {
  dataTransfer.effectAllowed = 'copyMove';
  for (const [type, value] of Object.entries(payload)) {
    dataTransfer.setData(type, value);
  }
}

export function useBookmarkDragDrop(
  onMove: (
    source: DragBookmarkItem,
    target: DragBookmarkItem,
    position: DropPosition,
  ) => void,
  bookmarks?: BookmarkTree,
) {
  const [dragOver, setDragOver] = useState<string | null>(null);

  const onDragStart = useCallback(
    (item: DragBookmarkItem) => (e: React.DragEvent) => {
      e.dataTransfer.setData('application/x-bookmark', serializeDragItem(item));
      e.dataTransfer.effectAllowed = 'copyMove';
      if (bookmarks) {
        applyExternalDragData(e.dataTransfer, buildExternalDragPayload(item, bookmarks));
      }
    },
    [bookmarks],
  );

  const onDragOver = useCallback(
    (dropId: string) => (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDragOver(dropId);
    },
  );

  const onDragLeave = useCallback(() => {
    setDragOver(null);
  }, []);

  const onDrop = useCallback(
    (target: DragBookmarkItem, position: DropPosition) => (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(null);
      const raw = e.dataTransfer.getData('application/x-bookmark');
      const source = parseDragItem(raw);
      if (!source) return;
      onMove(source, target, position);
    },
    [onMove],
  );

  return { dragOver, onDragStart, onDragOver, onDragLeave, onDrop };
}

export function dropId(item: DragBookmarkItem): string {
  return `${item.type}:${item.id}`;
}
