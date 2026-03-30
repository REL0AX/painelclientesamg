import { createEmptySyncLedger } from '@/shared/lib/normalize';
import type {
  AppSnapshot,
  SyncLedger,
  SyncOperation
} from '@/shared/types/domain';

type DirtyBucket =
  | 'dirtyClients'
  | 'dirtyProducts'
  | 'dirtyRoutes'
  | 'dirtyTasks'
  | 'dirtySavedViews';

export const markDirty = (
  snapshot: AppSnapshot,
  bucket: DirtyBucket,
  id: string,
  operation: SyncOperation
) => {
  snapshot.meta.syncLedger[bucket][id] = operation;
  snapshot.meta.updatedAt = new Date().toISOString();
};

export const markSettingsDirty = (snapshot: AppSnapshot) => {
  snapshot.meta.syncLedger.dirtySettings = true;
  snapshot.meta.updatedAt = new Date().toISOString();
};

export const clearSyncLedger = (): SyncLedger => ({
  ...createEmptySyncLedger(),
  lastSuccessfulSyncAt: new Date().toISOString()
});

const buildEntityDiff = <T extends { id: string }>(
  previous: T[],
  next: T[]
): Record<string, SyncOperation> => {
  const previousMap = new Map(previous.map((entry) => [entry.id, JSON.stringify(entry)]));
  const nextMap = new Map(next.map((entry) => [entry.id, JSON.stringify(entry)]));
  const changes: Record<string, SyncOperation> = {};

  previous.forEach((entry) => {
    if (!nextMap.has(entry.id)) {
      changes[entry.id] = 'delete';
    }
  });

  next.forEach((entry) => {
    if (!previousMap.has(entry.id) || previousMap.get(entry.id) !== nextMap.get(entry.id)) {
      changes[entry.id] = 'upsert';
    }
  });

  return changes;
};

export const buildSyncLedgerFromSnapshots = (
  previous: AppSnapshot,
  next: AppSnapshot
): SyncLedger => {
  const routeConfigChanged =
    JSON.stringify(previous.routes) !== JSON.stringify(next.routes) ||
    JSON.stringify(previous.routeSelections) !== JSON.stringify(next.routeSelections) ||
    JSON.stringify(previous.routeDates) !== JSON.stringify(next.routeDates);
  const dirtyRoutes = routeConfigChanged
    ? {
        ...(next.routes.length > 0
          ? Object.fromEntries(next.routes.map((route) => [route.id, 'upsert'] as const))
          : {}),
        '__route-config__': 'upsert'
      }
    : {};

  return {
    lastSuccessfulSyncAt: previous.meta.syncLedger.lastSuccessfulSyncAt,
    dirtyClients: buildEntityDiff(previous.clients, next.clients),
    dirtyProducts: buildEntityDiff(previous.products, next.products),
    dirtyRoutes,
    dirtyTasks: buildEntityDiff(previous.tasks, next.tasks),
    dirtySavedViews: buildEntityDiff(previous.savedViews, next.savedViews),
    dirtySettings:
      JSON.stringify(previous.settings) !== JSON.stringify(next.settings) ||
      JSON.stringify(previous.history) !== JSON.stringify(next.history),
    lastError: null
  };
};

export const hasPendingSyncChanges = (ledger: SyncLedger) =>
  ledger.dirtySettings ||
  Object.keys(ledger.dirtyClients).length > 0 ||
  Object.keys(ledger.dirtyProducts).length > 0 ||
  Object.keys(ledger.dirtyRoutes).length > 0 ||
  Object.keys(ledger.dirtyTasks).length > 0 ||
  Object.keys(ledger.dirtySavedViews).length > 0;

export const countPendingSyncChanges = (ledger: SyncLedger) =>
  (ledger.dirtySettings ? 1 : 0) +
  Object.keys(ledger.dirtyClients).length +
  Object.keys(ledger.dirtyProducts).length +
  Object.keys(ledger.dirtyRoutes).length +
  Object.keys(ledger.dirtyTasks).length +
  Object.keys(ledger.dirtySavedViews).length;
