import { STORAGE_KEYS } from '@/shared/lib/constants';
import { createEmptySnapshot, normalizeSnapshot, snapshotHasData } from '@/shared/lib/normalize';
import { safeJsonParse } from '@/shared/lib/utils';
import type { AppSnapshot } from '@/shared/types/domain';

export const readLegacySnapshot = (): AppSnapshot | null => {
  if (typeof window === 'undefined') return null;

  const snapshot = normalizeSnapshot({
    ...createEmptySnapshot(),
    clients: safeJsonParse(window.localStorage.getItem(STORAGE_KEYS.clients), []),
    products: safeJsonParse(window.localStorage.getItem(STORAGE_KEYS.products), []),
    history: safeJsonParse(window.localStorage.getItem(STORAGE_KEYS.history), []),
    routes: safeJsonParse(window.localStorage.getItem(STORAGE_KEYS.routes), []),
    routeSelections: safeJsonParse(window.localStorage.getItem(STORAGE_KEYS.routeSelections), {}),
    routeDates: safeJsonParse(window.localStorage.getItem(STORAGE_KEYS.routeDates), {}),
    salesGoals: safeJsonParse(window.localStorage.getItem(STORAGE_KEYS.salesGoals), {}),
    settings: safeJsonParse(window.localStorage.getItem(STORAGE_KEYS.settings), {}),
    meta: {
      migratedFromLegacy: true,
      updatedAt: new Date().toISOString()
    }
  });

  return snapshotHasData(snapshot) ? snapshot : null;
};

export const readStoredTheme = () => {
  if (typeof window === 'undefined') return 'light';
  return window.localStorage.getItem(STORAGE_KEYS.theme) ?? 'light';
};

export const writeStoredTheme = (theme: string) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEYS.theme, theme);
};
