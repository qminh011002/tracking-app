import * as React from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  Package,
  Store,
} from "lucide-react";
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
  const [showSignInPassword, setShowSignInPassword] = React.useState(false);

  const [storeId, setStoreId] = React.useState("");
  const [signUpEmail, setSignUpEmail] = React.useState("");
  const [signUpPassword, setSignUpPassword] = React.useState("");
  const [showSignUpPassword, setShowSignUpPassword] = React.useState(false);
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
      setError(err instanceof Error ? err.message : "Đăng nhập thất bại");
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
      setError(err instanceof Error ? err.message : "Đăng ký thất bại");
      return;
    }

    if (data.session) {
      navigate("/inventory", { replace: true });
      return;
    }

    setMessage(
      "Đã tạo tài khoản. Vui lòng kiểm tra email để xác nhận trước khi đăng nhập.",
    );
  };

  const switchMode = (value: AuthMode) => {
    setMode(value);
    setError(null);
    setMessage(null);
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2 text-sm uppercase tracking-[0.16em] text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Đang tải xác thực...
        </div>
      </div>
    );
  }

  if (session) {
    return <Navigate to="/inventory" replace />;
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background grid place-items-center px-4 py-8">
      {/* Decorative background glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-40 size-96 rounded-full bg-primary/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-40 size-96 rounded-full bg-primary/10 blur-3xl"
      />

      <section className="relative grid w-full max-w-4xl overflow-hidden rounded-2xl border border-border/60 bg-card shadow-2xl shadow-black/20 lg:grid-cols-2">
        {/* Brand panel */}
        <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/70 p-10 text-primary-foreground lg:flex">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-20 -right-20 size-64 rounded-full bg-white/10 blur-2xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-24 -left-10 size-72 rounded-full bg-black/10 blur-2xl"
          />

          <div className="relative flex items-center gap-2.5">
            <div className="grid size-10 place-items-center rounded-xl bg-white/15 backdrop-blur">
              <Package className="size-5" />
            </div>
            <span className="text-lg font-semibold tracking-tight">
              Inventory
            </span>
          </div>

          <div className="relative space-y-3">
            <h2 className="text-3xl font-bold leading-tight tracking-tight">
              Quản lý kho hàng,
              <br />
              theo dõi lợi nhuận.
            </h2>
            <p className="max-w-xs text-sm text-primary-foreground/80">
              Đăng nhập để theo dõi giao dịch mua/bán, tồn kho và phân tích lợi
              nhuận của cửa hàng bạn.
            </p>
          </div>

          <div className="relative flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-primary-foreground/70">
            <Store className="size-3.5" />
            <span>Inventory App</span>
          </div>
        </div>

        {/* Form panel */}
        <div className="p-6 sm:p-8 lg:p-10">
          {/* Mobile brand */}
          <div className="mb-6 flex items-center gap-2.5 lg:hidden">
            <div className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Package className="size-5" />
            </div>
            <span className="text-lg font-semibold tracking-tight">
              Inventory
            </span>
          </div>

          <div className="mb-6 space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">
              {mode === "signin" ? "Chào mừng trở lại" : "Tạo tài khoản"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {mode === "signin"
                ? "Đăng nhập để tiếp tục vào cửa hàng của bạn."
                : "Điền thông tin bên dưới để bắt đầu."}
            </p>
          </div>

          <Tabs value={mode} onValueChange={(value) => switchMode(value as AuthMode)}>
            <TabsList className="w-full">
              <TabsTrigger value="signin" className="flex-1">
                Đăng nhập
              </TabsTrigger>
              <TabsTrigger value="signup" className="flex-1">
                Đăng ký
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="pt-5">
              <form className="space-y-4" onSubmit={handleSignIn}>
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="signin-email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      required
                      value={signInEmail}
                      onChange={(event) => setSignInEmail(event.target.value)}
                      className="h-11 pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Mật khẩu</Label>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="signin-password"
                      type={showSignInPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      required
                      value={signInPassword}
                      onChange={(event) => setSignInPassword(event.target.value)}
                      className="h-11 px-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignInPassword((prev) => !prev)}
                      className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      aria-label={showSignInPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    >
                      {showSignInPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  size="xl"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <LockKeyhole className="size-4" />
                  )}
                  {loading ? "Đang đăng nhập..." : "Đăng nhập"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="pt-5">
              <form className="space-y-4" onSubmit={handleSignUp}>
                <div className="space-y-2">
                  <Label htmlFor="signup-store-id">Mã cửa hàng</Label>
                  <div className="relative">
                    <Store className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="signup-store-id"
                      required
                      placeholder="ma-cua-hang-cua-ban"
                      value={storeId}
                      onChange={(event) => setStoreId(event.target.value)}
                      className="h-11 pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="signup-email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      required
                      value={signUpEmail}
                      onChange={(event) => setSignUpEmail(event.target.value)}
                      className="h-11 pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Mật khẩu</Label>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="signup-password"
                      type={showSignUpPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      required
                      value={signUpPassword}
                      onChange={(event) => setSignUpPassword(event.target.value)}
                      className="h-11 px-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignUpPassword((prev) => !prev)}
                      className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      aria-label={showSignUpPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    >
                      {showSignUpPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  size="xl"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Store className="size-4" />
                  )}
                  {loading ? "Đang tạo tài khoản..." : "Đăng ký"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {error && (
            <div
              role="alert"
              className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {message && (
            <div
              role="status"
              className="mt-4 flex items-start gap-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2.5 text-sm text-success"
            >
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              <span>{message}</span>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
