'use client';

import type { TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        'min-h-28 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-zinc-900',
        props.className,
      )}
    />
  );
}
