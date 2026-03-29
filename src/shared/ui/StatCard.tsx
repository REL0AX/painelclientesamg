import type { ReactNode } from 'react';
import { Card } from '@/shared/ui/Card';

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
}

export function StatCard({ label, value, hint, icon }: StatCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[var(--accent-500)] via-[var(--sand-500)] to-[var(--sky-500)]" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink-500)]">{label}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-[var(--ink-900)]">{value}</p>
          {hint ? <p className="mt-2 text-sm text-[var(--ink-600)]">{hint}</p> : null}
        </div>
        {icon ? <div className="rounded-2xl bg-[var(--panel-subtle)] p-3 text-[var(--accent-600)]">{icon}</div> : null}
      </div>
    </Card>
  );
}
