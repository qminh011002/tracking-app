import * as React from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

const AUTH_JWT_KEY = "auth_jwt_token";

function syncJwtToken(session: Session | null) {
  if (session?.access_token) {
    localStorage.setItem(AUTH_JWT_KEY, session.access_token);
    return;
  }
  localStorage.removeItem(AUTH_JWT_KEY);
}

export function getStoredJwtToken() {
  return localStorage.getItem(AUTH_JWT_KEY);
}

export function useAuthSession() {
  const [session, setSession] = React.useState<Session | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;

    const init = async () => {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(currentSession);
      syncJwtToken(currentSession);
      setLoading(false);
    };

    void init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      syncJwtToken(currentSession);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return {
    session,
    loading,
    jwt: session?.access_token ?? null,
  };
}
