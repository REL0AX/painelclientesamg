import type { ReactNode } from 'react';
import { Activity, Database, HardDriveDownload, ShieldCheck, TriangleAlert } from 'lucide-react';
import { useAppContext } from '@/app/state/AppContext';
import { useBackups } from '@/features/settings/useBackups';
import { countPendingSyncChanges, hasPendingSyncChanges } from '@/shared/lib/sync-ledger';
import { Card } from '@/shared/ui/Card';
import { formatDateTime } from '@/shared/lib/utils';

const DiagnosticMetric = ({
  label,
  value,
  hint,
  icon
}: {
  label: string;
  value: string;
  hint: string;
  icon: ReactNode;
}) => (
  <div className="rounded-[24px] border border-[var(--line)] bg-white p-4">
    <div className="flex items-center gap-2 text-[var(--accent-600)]">{icon}</div>
    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink-500)]">{label}</p>
    <p className="mt-2 text-2xl font-bold text-[var(--ink-900)]">{value}</p>
    <p className="mt-2 text-sm text-[var(--ink-600)]">{hint}</p>
  </div>
);

export function DiagnosticsPage() {
  const { snapshot, cloud } = useAppContext();
  const backups = useBackups();
  const ledger = snapshot.meta.syncLedger;
  const pendingChanges = countPendingSyncChanges(ledger);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DiagnosticMetric
          label="Schema"
          value={`v${snapshot.schemaVersion}`}
          hint="Versao estrutural do snapshot local."
          icon={<Database className="h-5 w-5" />}
        />
        <DiagnosticMetric
          label="Pendencias"
          value={String(pendingChanges)}
          hint="Itens locais ainda nao confirmados na nuvem."
          icon={<Activity className="h-5 w-5" />}
        />
        <DiagnosticMetric
          label="Backups"
          value={String(backups.length)}
          hint="Backups locais disponiveis em IndexedDB."
          icon={<HardDriveDownload className="h-5 w-5" />}
        />
        <DiagnosticMetric
          label="Permissao"
          value={cloud.permission}
          hint="Status atual do acesso ao Firebase."
          icon={<ShieldCheck className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--ink-500)]">Estado local</p>
            <h2 className="mt-2 text-2xl font-bold text-[var(--ink-900)]">Resumo do snapshot</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-[22px] bg-[var(--panel-subtle)] p-4 text-sm text-[var(--ink-700)]">
              <p className="font-semibold text-[var(--ink-900)]">{snapshot.clients.length} clientes</p>
              <p className="mt-1">{snapshot.products.length} produtos • {snapshot.routes.length} rotas</p>
            </div>
            <div className="rounded-[22px] bg-[var(--panel-subtle)] p-4 text-sm text-[var(--ink-700)]">
              <p className="font-semibold text-[var(--ink-900)]">{snapshot.tasks.length} tarefas</p>
              <p className="mt-1">{snapshot.savedViews.length} views salvas • {snapshot.history.length} eventos</p>
            </div>
          </div>
          <div className="rounded-[24px] border border-[var(--line)] bg-white p-4">
            <p className="text-sm font-semibold text-[var(--ink-900)]">Ultima atualizacao local</p>
            <p className="mt-2 text-sm text-[var(--ink-600)]">{formatDateTime(snapshot.meta.updatedAt)}</p>
            <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[var(--ink-500)]">
              Migrado do legado: {snapshot.meta.migratedFromLegacy ? 'sim' : 'nao'}
            </p>
          </div>
        </Card>

        <Card className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--ink-500)]">Sync e nuvem</p>
            <h2 className="mt-2 text-2xl font-bold text-[var(--ink-900)]">Saude operacional</h2>
          </div>
          <div className={`rounded-[24px] border p-4 text-sm ${
            cloud.error || ledger.lastError
              ? 'border-red-200 bg-red-50 text-red-900'
              : hasPendingSyncChanges(ledger)
                ? 'border-amber-200 bg-amber-50 text-amber-900'
                : 'border-emerald-200 bg-emerald-50 text-emerald-900'
          }`}>
            <p className="font-semibold">
              {cloud.error || ledger.lastError
                ? 'Existe erro para revisar'
                : hasPendingSyncChanges(ledger)
                  ? 'Existem pendencias locais aguardando sync'
                  : 'Tudo limpo e sincronizado'}
            </p>
            <p className="mt-2">
              {cloud.error || ledger.lastError || cloud.status}
            </p>
          </div>

          <div className="space-y-3">
            {[
              ['Clientes pendentes', Object.keys(ledger.dirtyClients).length],
              ['Produtos pendentes', Object.keys(ledger.dirtyProducts).length],
              ['Rotas pendentes', Object.keys(ledger.dirtyRoutes).length],
              ['Tarefas pendentes', Object.keys(ledger.dirtyTasks).length],
              ['Views pendentes', Object.keys(ledger.dirtySavedViews).length],
              ['Settings pendentes', ledger.dirtySettings ? 1 : 0]
            ].map(([label, value]) => (
              <div key={String(label)} className="flex items-center justify-between rounded-[22px] border border-[var(--line)] bg-white px-4 py-3">
                <span className="text-sm text-[var(--ink-700)]">{label}</span>
                <span className="text-sm font-semibold text-[var(--ink-900)]">{value}</span>
              </div>
            ))}
          </div>

          {(cloud.error || ledger.lastError) ? (
            <div className="rounded-[24px] border border-red-200 bg-red-50 p-4 text-sm text-red-900">
              <div className="flex items-center gap-2 font-semibold">
                <TriangleAlert className="h-4 w-4" />
                Ultimo erro conhecido
              </div>
              <p className="mt-2">{cloud.error || ledger.lastError}</p>
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
