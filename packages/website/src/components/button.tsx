'use client';

import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';
import { cn } from '@/lib/utils';

type ButtonProps = PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
};

const variantClassNameMap: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-zinc-900 text-white hover:bg-zinc-800',
  secondary: 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200',
  ghost: 'bg-transparent text-zinc-900 hover:bg-zinc-100',
  danger: 'bg-red-600 text-white hover:bg-red-500',
};

export function Button({ children, className, variant = 'primary', ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50',
        variantClassNameMap[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
