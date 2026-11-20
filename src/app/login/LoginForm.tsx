"use client";
import { ArrowRight, Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/shell/Logo";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FieldLabel, Segmented, TextInput } from "@/components/ui/Fields";
import { getBrowserSupabase } from "@/lib/supabase/client";

export function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  const sb = getBrowserSupabase();
  const [mode, setMode] = useState<"signin" | "signup" | "magic">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "err"; text: string } | null>(
    params.get("error") ? { tone: "err", text: "That sign-in link is invalid or has expired." } : null,
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sb) return;
    setBusy(true);
    setMessage(null);
    const redirect = `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`;
    try {
      if (mode === "magic") {
        const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect } });
        if (error) throw error;
        setMessage({ tone: "ok", text: "Check your email for a sign-in link." });
      } else if (mode === "signup") {
        const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: redirect } });
        if (error) throw error;
        if (data.session) window.location.href = safeNext;
        else setMessage({ tone: "ok", text: "Account created. Confirm your email to continue." });
      } else {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.href = safeNext;
      }
    } catch (err) {
      setMessage({ tone: "err", text: err instanceof Error ? err.message : "Sign-in failed." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-[400px] animate-rise">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <Card className="p-6">
          <h1 className="text-lg font-semibold tracking-tight">Interpreter performance training</h1>
          <p className="mt-1 text-[13.5px] leading-relaxed text-muted">Memory, consecutive and simultaneous practice with meaning-based feedback.</p>

          {!sb ? (
            <div className="mt-6 space-y-4">
              <p className="rounded-lg border border-warn/30 bg-warn-soft px-3 py-2.5 text-[13px] text-ink-2">
                Supabase is not configured, so the app runs in demo mode with data stored in this browser. No sign-in is needed.
              </p>
              <ButtonLink href="/dashboard" className="w-full">
                Continue in demo mode <ArrowRight size={15} />
              </ButtonLink>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-4">
              <Segmented
                value={mode}
                onChange={setMode}
                options={[
                  { value: "signin", label: "Sign in" },
                  { value: "signup", label: "Create account" },
                  { value: "magic", label: "Email link" },
                ]}
              />
              <div>
                <FieldLabel>Email</FieldLabel>
                <TextInput type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              {mode !== "magic" && (
                <div>
                  <FieldLabel>Password</FieldLabel>
                  <TextInput
                    type="password"
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              )}
              {message && <p className={message.tone === "ok" ? "text-[13px] text-good" : "text-[13px] text-bad"}>{message.text}</p>}
              <Button type="submit" size="lg" className="w-full" disabled={busy}>
                {busy && <Loader2 size={15} className="animate-spin" />}
                {mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send sign-in link"}
              </Button>
            </form>
          )}
        </Card>
        <p className="mt-6 text-center text-[11.5px] leading-relaxed text-faint">
          Automated feedback is for training purposes and is not a professional certification.
        </p>
      </div>
    </div>
  );
}
