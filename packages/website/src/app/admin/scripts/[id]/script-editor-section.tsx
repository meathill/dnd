'use client';

import type { ReactNode } from 'react';

type SectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

const sectionTitleClassName = 'text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]';

export function Section({ title, description, children }: SectionProps) {
  return (
    <div className="rounded-lg border border-[rgba(27,20,12,0.08)] bg-[rgba(255,255,255,0.7)] p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className={sectionTitleClassName}>{title}</p>
          {description ? <p className="text-xs text-[var(--ink-muted)]">{description}</p> : null}
        </div>
      </div>
      <div className="mt-3 space-y-3">{children}</div>
    </div>
  );
}
