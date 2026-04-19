import type { InputHTMLAttributes, PropsWithChildren, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cn } from '@/shared/lib/utils';

export function FieldLabel({ children }: PropsWithChildren) {
  return <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink-500)]">{children}</label>;
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        'w-full rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-2.5 text-sm text-[var(--ink-900)] shadow-sm outline-none transition placeholder:text-[var(--ink-400)] focus:border-[var(--accent-400)] focus:ring-2 focus:ring-orange-200',
        props.className
      )}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        'w-full rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-2.5 text-sm text-[var(--ink-900)] shadow-sm outline-none transition focus:border-[var(--accent-400)] focus:ring-2 focus:ring-orange-200',
        props.className
      )}
    />
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        'w-full rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-2.5 text-sm text-[var(--ink-900)] shadow-sm outline-none transition placeholder:text-[var(--ink-400)] focus:border-[var(--accent-400)] focus:ring-2 focus:ring-orange-200',
        props.className
      )}
    />
  );
}
