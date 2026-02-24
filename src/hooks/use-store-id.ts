import * as React from "react";
import { supabase } from "@/lib/supabase";
import { useAuthSession } from "@/src/hooks/use-auth-session";

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
  const [storeId, setStoreId] = React.useState("");
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (loadingSession) return;
    if (!session) {
      setStoreId("");
      setLoading(false);
      return;
    }

    let active = true;
    const fromMetadata = getFromMetadata(session);
    if (fromMetadata) {
      localStorage.setItem(STORE_ID_KEY, fromMetadata);
      setStoreId(fromMetadata);
      setLoading(false);
      return;
    }

    const fromLocal = localStorage.getItem(STORE_ID_KEY) ?? "";
    if (fromLocal) {
      setStoreId(fromLocal);
    }

    void (async () => {
      try {
        let resolved = "";

        const byId = await supabase
          .from("profiles")
          .select("store_id")
          .eq("id", session.user.id)
          .maybeSingle();

        if (!byId.error && byId.data?.store_id) {
          resolved = String(byId.data.store_id);
        }

        if (!resolved) {
          const byUserId = await supabase
            .from("profiles")
            .select("store_id")
            .eq("user_id", session.user.id)
            .maybeSingle();

          if (!byUserId.error && byUserId.data?.store_id) {
            resolved = String(byUserId.data.store_id);
          }
        }

        if (!active) return;

        if (resolved) {
          setStoreId(resolved);
          localStorage.setItem(STORE_ID_KEY, resolved);
          void supabase.auth.updateUser({
            data: { store_id: resolved },
          });
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [session, loadingSession]);

  return { storeId, loading };
}
