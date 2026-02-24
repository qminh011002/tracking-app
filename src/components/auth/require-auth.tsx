import * as React from "react";
import { Navigate } from "react-router-dom";
import { useAuthSession } from "@/src/hooks/use-auth-session";

type RequireAuthProps = {
  children: React.ReactNode;
};

export function RequireAuth({ children }: RequireAuthProps) {
  const { session, loading } = useAuthSession();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-sm uppercase tracking-[0.16em] text-muted-foreground">
          Checking session...
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}
