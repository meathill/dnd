'use client';

import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { SessionInfo } from './session-types';

type SessionContextValue = {
  session: SessionInfo | null;
  reloadSession: () => Promise<SessionInfo | null>;
  requestAuth: (onSuccess?: () => void) => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ value, children }: { value: SessionContextValue; children: ReactNode }) {
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession 必须在 SessionProvider 内使用');
  }
  return context;
}
