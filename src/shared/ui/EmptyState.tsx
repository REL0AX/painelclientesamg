import type { ReactNode } from 'react';
import { Card } from '@/shared/ui/Card';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <Card className="border-dashed text-center">
      <p className="text-lg font-semibold text-[var(--ink-900)]">{title}</p>
      <p className="mx-auto mt-2 max-w-xl text-sm text-[var(--ink-600)]">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </Card>
  );
}
