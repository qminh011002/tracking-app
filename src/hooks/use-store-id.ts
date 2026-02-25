import * as React from "react";
import { supabase } from "@/lib/supabase";
import { useAuthSession } from "@/src/hooks/use-auth-session";
import { useStoreIdQuery } from "@/src/queries/hooks";

const STORE_ID_KEY = "store_id";

function getFromMetadata(session: ReturnType<typeof useAuthSession>["session"]) {
  if (!session) return "";
  const fromUserMeta =
    (session.user.user_metadata?.store_id as string | undefined) ??
    (session.user.user_metadata?.storeId as string | undefined);
  const fromAppMeta =
    (session.user.app_metadata?.store_id as string | undefined) ??
    (session.user.app_metadata?.storeId as string | undefined);
  return (fromUserMeta ?? fromAppMeta ?? "").toString().trim();
}

export function useStoreId() {
  const { session, loading: loadingSession } = useAuthSession();
  const metadataStoreId = React.useMemo(() => getFromMetadata(session), [session]);

  const { data: queriedStoreId = "", isLoading } = useStoreIdQuery({
    userId: session?.user.id ?? "",
    enabled: Boolean(session?.user.id && !loadingSession),
    fallbackStoreId: metadataStoreId || undefined,
  });

  React.useEffect(() => {
    if (!session) {
      localStorage.removeItem(STORE_ID_KEY);
      return;
    }
    if (!queriedStoreId) return;
    localStorage.setItem(STORE_ID_KEY, queriedStoreId);
    if (metadataStoreId !== queriedStoreId) {
      void supabase.auth.updateUser({
        data: { store_id: queriedStoreId },
      });
    }
  }, [session, queriedStoreId, metadataStoreId]);

  if (!session && !loadingSession) {
    return { storeId: "", loading: false };
  }

  const fallbackFromLocal = localStorage.getItem(STORE_ID_KEY) ?? "";
  return {
    storeId: queriedStoreId || metadataStoreId || fallbackFromLocal,
    loading: loadingSession || isLoading,
  };
}
