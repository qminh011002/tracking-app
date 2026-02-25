import * as React from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys, useAuthSessionQuery } from "@/src/queries/hooks";

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
  const queryClient = useQueryClient();
  const { data: session, isLoading } = useAuthSessionQuery();

  React.useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      queryClient.setQueryData(queryKeys.auth.session, currentSession);
      syncJwtToken(currentSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);

  React.useEffect(() => {
    syncJwtToken((session as Session | null) ?? null);
  }, [session]);

  return {
    session: (session as Session | null) ?? null,
    loading: isLoading,
    jwt: (session as Session | null)?.access_token ?? null,
  };
}
