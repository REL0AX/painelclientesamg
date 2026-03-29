import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';
import { cn } from '@/shared/lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--accent-600)] text-white shadow-lg shadow-orange-500/20 hover:bg-[var(--accent-500)]',
  secondary:
    'border border-[var(--line)] bg-white/80 text-[var(--ink-900)] hover:border-[var(--accent-400)] hover:bg-white',
  ghost: 'text-[var(--ink-700)] hover:bg-[var(--panel-subtle)]',
  danger: 'bg-red-600 text-white hover:bg-red-500'
};

export function Button({
  variant = 'primary',
  fullWidth = false,
  className,
  children,
  ...props
}: PropsWithChildren<ButtonProps>) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50',
        variantClasses[variant],
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
