import { createId } from '@/shared/lib/utils';
import { createBackupRecord } from '@/shared/lib/db';
import type { AppSnapshot, BackupRecord } from '@/shared/types/domain';

export const persistBackup = async (snapshot: AppSnapshot, reason: string) => {
  const record: BackupRecord = {
    id: createId('backup'),
    createdAt: Date.now(),
    reason,
    snapshot
  };

  await createBackupRecord(record);
  return record;
};
