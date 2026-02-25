import * as React from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { LockKeyhole, Store } from "lucide-react";
import { useAuthSession } from "@/src/hooks/use-auth-session";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSignInMutation, useSignUpMutation } from "@/src/queries/hooks";

type AuthMode = "signin" | "signup";

export default function AuthPage() {
  const navigate = useNavigate();
  const { session, loading: checkingSession } = useAuthSession();
  const [mode, setMode] = React.useState<AuthMode>("signin");

  const [signInEmail, setSignInEmail] = React.useState("");
  const [signInPassword, setSignInPassword] = React.useState("");

  const [storeId, setStoreId] = React.useState("");
  const [signUpEmail, setSignUpEmail] = React.useState("");
  const [signUpPassword, setSignUpPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const signInMutation = useSignInMutation();
  const signUpMutation = useSignUpMutation();
  const loading = signInMutation.isPending || signUpMutation.isPending;

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    try {
      await signInMutation.mutateAsync({
        email: signInEmail,
        password: signInPassword,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
      return;
    }

    navigate("/inventory", { replace: true });
  };

  const handleSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    let data:
      | {
          session: { access_token: string } | null;
        }
      | undefined;
    try {
      data = await signUpMutation.mutateAsync({
        email: signUpEmail,
        password: signUpPassword,
        storeId,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed");
      return;
    }

    if (data.session) {
      navigate("/inventory", { replace: true });
      return;
    }

    setMessage(
      "Account created. Check your email to confirm before signing in.",
    );
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-sm uppercase tracking-[0.16em] text-muted-foreground">
          Loading auth...
        </div>
      </div>
    );
  }

  if (session) {
    return <Navigate to="/inventory" replace />;
  }

  return (
    <main className="min-h-screen bg-background grid place-items-center px-4 py-8">
      <section className="w-full max-w-md rounded-xl border border-border/60 bg-card p-5 space-y-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
            <Store className="size-3.5" />
            <span>Inventory App Auth</span>
          </div>
          <h1 className="text-2xl font-semibold">Sign In / Sign Up</h1>
        </div>

        <Tabs value={mode} onValueChange={(value) => setMode(value as AuthMode)}>
          <TabsList className="w-full">
            <TabsTrigger value="signin" className="flex-1">
              Sign In
            </TabsTrigger>
            <TabsTrigger value="signup" className="flex-1">
              Sign Up
            </TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="pt-4">
            <form className="space-y-4" onSubmit={handleSignIn}>
              <div className="space-y-2">
                <Label htmlFor="signin-email">Email</Label>
                <Input
                  id="signin-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={signInEmail}
                  onChange={(event) => setSignInEmail(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signin-password">Password</Label>
                <Input
                  id="signin-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={signInPassword}
                  onChange={(event) => setSignInPassword(event.target.value)}
                />
              </div>
              <Button type="submit" size="xl" className="w-full" disabled={loading}>
                <LockKeyhole className="size-4" />
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup" className="pt-4">
            <form className="space-y-4" onSubmit={handleSignUp}>
              <div className="space-y-2">
                <Label htmlFor="signup-store-id">Store ID</Label>
                <Input
                  id="signup-store-id"
                  required
                  value={storeId}
                  onChange={(event) => setStoreId(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={signUpEmail}
                  onChange={(event) => setSignUpEmail(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={signUpPassword}
                  onChange={(event) => setSignUpPassword(event.target.value)}
                />
              </div>
              <Button type="submit" size="xl" className="w-full" disabled={loading}>
                <Store className="size-4" />
                {loading ? "Creating account..." : "Sign up"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="text-sm text-success" role="status">
            {message}
          </p>
        )}
      </section>
    </main>
  );
}
