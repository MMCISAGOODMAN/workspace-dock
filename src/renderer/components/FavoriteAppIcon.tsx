import { Globe, FolderOpen } from 'lucide-react';
import type { FavoriteApp } from '@shared/types';
import { cn } from '../utils/helpers';

interface FavoriteAppIconProps {
  app: Pick<FavoriteApp, 'type'>;
  iconSrc?: string | null;
  className?: string;
}

export function FavoriteAppIcon({ app, iconSrc, className }: FavoriteAppIconProps) {
  if (iconSrc) {
    return (
      <img
        src={iconSrc}
        alt=""
        className={cn('w-5 h-5 rounded shrink-0 object-contain bg-dock-bg/50', className)}
        draggable={false}
      />
    );
  }

  const Fallback = app.type === 'url' ? Globe : FolderOpen;
  return (
    <span
      className={cn(
        'w-5 h-5 rounded shrink-0 flex items-center justify-center bg-dock-bg/50',
        className,
      )}
    >
      <Fallback
        className={cn(
          'w-3.5 h-3.5',
          app.type === 'url' ? 'text-dock-accent' : 'text-dock-muted',
        )}
      />
    </span>
  );
}
