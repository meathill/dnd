import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Button({ className, type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-xl bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      type={type}
      {...props}
    />
  );
}
