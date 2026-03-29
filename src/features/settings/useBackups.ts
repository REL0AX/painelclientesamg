import { useLiveQuery } from 'dexie-react-hooks';
import { panelDb } from '@/shared/lib/db';

export function useBackups() {
  return (
    useLiveQuery(() => panelDb.backups.orderBy('createdAt').reverse().toArray(), []) ?? []
  );
}
