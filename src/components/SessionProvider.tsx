"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  plan: "trail" | "summit" | null;
  suggestedPlan: "trail" | "summit" | null;
  subscriptionStatus: "none" | "trialing" | "active" | "paused" | "canceled";
  trialEndsAt: string | null;
  onboardingCompletedAt: string | null;
  pausedUntil: string | null;
  canceledAt: string | null;
}

interface SessionContextValue {
  user: SessionUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue>({
  user: null,
  loading: true,
  refresh: async () => {},
});

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/session", { cache: "no-store" });
    const data = await res.json();
    setUser(data.user);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Fetch the session once on mount; setState in the resolved promise is
    // intentional (loads current auth state from the server).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  return (
    <SessionContext.Provider value={{ user, loading, refresh }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
