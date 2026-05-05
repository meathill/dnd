import type { PropsWithChildren } from 'react';
import { cn } from '@/lib/utils';

type CardProps = PropsWithChildren<{
  className?: string;
}>;

export function Card({ children, className }: CardProps) {
  return (
    <section className={cn('rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm', className)}>{children}</section>
  );
}
