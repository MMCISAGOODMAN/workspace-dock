import { useEffect, useState } from 'react';
import type { FavoriteApp } from '@shared/types';
import { getAPI } from '../types/electron';

export function useFavoriteAppIcons(apps: FavoriteApp[]) {
  const [icons, setIcons] = useState<Record<string, string | null>>({});
  const appsKey = apps.map((a) => `${a.id}:${a.type}:${a.target}`).join('|');

  useEffect(() => {
    if (apps.length === 0) {
      setIcons({});
      return;
    }

    let cancelled = false;
    getAPI()
      .getFavoriteAppIcons(
        apps.map((app) => ({ id: app.id, type: app.type, target: app.target })),
      )
      .then((result) => {
        if (!cancelled) setIcons(result);
      })
      .catch(() => {
        if (!cancelled) setIcons({});
      });

    return () => {
      cancelled = true;
    };
  }, [appsKey]);

  return icons;
}
