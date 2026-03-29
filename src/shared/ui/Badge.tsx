import type { PropsWithChildren } from 'react';
import { cn } from '@/shared/lib/utils';

interface BadgeProps {
  tone?: 'neutral' | 'warning' | 'danger' | 'success' | 'info';
  className?: string;
}

const toneClasses: Record<NonNullable<BadgeProps['tone']>, string> = {
  neutral: 'bg-stone-100 text-stone-700',
  warning: 'bg-amber-100 text-amber-900',
  danger: 'bg-red-100 text-red-800',
  success: 'bg-emerald-100 text-emerald-900',
  info: 'bg-sky-100 text-sky-900'
};

export function Badge({ tone = 'neutral', className, children }: PropsWithChildren<BadgeProps>) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold', toneClasses[tone], className)}>
      {children}
    </span>
  );
}
