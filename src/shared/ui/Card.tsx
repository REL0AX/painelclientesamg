import type { HTMLAttributes, PropsWithChildren } from 'react';
import { cn } from '@/shared/lib/utils';

export function Card({ className, children, ...props }: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      className={cn(
        'rounded-[28px] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
