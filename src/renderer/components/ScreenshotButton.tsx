import { useState } from 'react';
import { Crop } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { cn } from '../utils/helpers';

interface ScreenshotButtonProps {
  compact?: boolean;
  className?: string;
}

export function ScreenshotButton({ compact, className }: ScreenshotButtonProps) {
  const { captureScreenshot } = useAppStore();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await captureScreenshot();
    } finally {
      setLoading(false);
    }
  };

  if (compact) {
    return (
      <button
        onClick={() => void handleClick()}
        disabled={loading}
        className={cn(
          'w-8 h-8 flex items-center justify-center rounded-md text-dock-muted hover:text-dock-text hover:bg-dock-hover transition-colors disabled:opacity-50',
          className,
        )}
        title="区域截图 (⌘⇧S)"
      >
        <Crop className="w-4 h-4" />
      </button>
    );
  }

  return (
    <button
      onClick={() => void handleClick()}
      disabled={loading}
      className={cn(
        'w-7 h-7 flex items-center justify-center rounded-md text-dock-muted hover:text-dock-text hover:bg-dock-hover transition-colors disabled:opacity-50',
        className,
      )}
      title="区域截图 (⌘⇧S)"
    >
      <Crop className="w-3.5 h-3.5" />
    </button>
  );
}
