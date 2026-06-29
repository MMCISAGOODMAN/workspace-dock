import { Bookmark, Camera, Clock, LayoutGrid, ClipboardPaste, type LucideIcon } from 'lucide-react';
import type { PanelTab } from '../store/appStore';

export const PANEL_TABS: { id: PanelTab; icon: LucideIcon; label: string }[] = [
  { id: 'bookmarks', icon: Bookmark, label: '书签' },
  { id: 'snapshots', icon: Camera, label: '快照' },
  { id: 'temp', icon: Clock, label: '临时' },
  { id: 'clipboard', icon: ClipboardPaste, label: '剪贴板' },
  { id: 'apps', icon: LayoutGrid, label: '应用' },
];
