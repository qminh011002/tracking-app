import * as React from "react";
import { supabase } from "@/lib/supabase";
import { useAuthSession } from "@/src/hooks/use-auth-session";
import { useStoreIdQuery } from "@/src/queries/hooks";

const STORE_ID_KEY_PREFIX = "store_id";

function getStoreIdKey(userId?: string) {
  if (!userId) return STORE_ID_KEY_PREFIX;
  return `${STORE_ID_KEY_PREFIX}:${userId}`;
}

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
    const userId = session?.user.id;
    const storeKey = getStoreIdKey(userId);

    if (!session) {
      const keysToRemove: string[] = [];
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (!key) continue;
        if (key === STORE_ID_KEY_PREFIX || key.startsWith(`${STORE_ID_KEY_PREFIX}:`)) {
          keysToRemove.push(key);
        }
      }
      for (const key of keysToRemove) {
        localStorage.removeItem(key);
      }
      return;
    }
    if (!queriedStoreId) return;
    localStorage.setItem(storeKey, queriedStoreId);
    if (metadataStoreId !== queriedStoreId) {
      void supabase.auth.updateUser({
        data: { store_id: queriedStoreId },
      });
    }
  }, [session, queriedStoreId, metadataStoreId]);

  if (!session && !loadingSession) {
    return { storeId: "", loading: false };
  }

  const fallbackFromLocal = localStorage.getItem(getStoreIdKey(session?.user.id)) ?? "";
  return {
    storeId: queriedStoreId || metadataStoreId || fallbackFromLocal,
    loading: loadingSession || isLoading,
  };
}
