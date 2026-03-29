import Dexie, { type Table } from 'dexie';
import { APP_DB_NAME, APP_SNAPSHOT_KEY, MAX_BACKUPS } from '@/shared/lib/constants';
import { normalizeSnapshot } from '@/shared/lib/normalize';
import type { AppSnapshot, BackupRecord } from '@/shared/types/domain';

interface SnapshotRecord {
  key: string;
  snapshot: AppSnapshot;
  updatedAt: number;
}

class PanelDatabase extends Dexie {
  snapshots!: Table<SnapshotRecord, string>;
  backups!: Table<BackupRecord, string>;

  constructor() {
    super(APP_DB_NAME);
    this.version(1).stores({
      snapshots: 'key, updatedAt',
      backups: 'id, createdAt'
    });
  }
}

export const panelDb = new PanelDatabase();

export const loadSnapshotFromDb = async () => {
  const record = await panelDb.snapshots.get(APP_SNAPSHOT_KEY);
  return record ? normalizeSnapshot(record.snapshot) : null;
};

export const saveSnapshotToDb = async (snapshot: AppSnapshot) => {
  await panelDb.snapshots.put({
    key: APP_SNAPSHOT_KEY,
    snapshot: normalizeSnapshot(snapshot),
    updatedAt: Date.now()
  });
};

export const createBackupRecord = async (record: BackupRecord) => {
  await panelDb.backups.put(record);
  const allBackups = await panelDb.backups.orderBy('createdAt').reverse().toArray();
  const staleBackups = allBackups.slice(MAX_BACKUPS);
  if (staleBackups.length > 0) {
    await panelDb.backups.bulkDelete(staleBackups.map((item) => item.id));
  }
};

export const deleteBackupRecord = async (id: string) => {
  await panelDb.backups.delete(id);
};
