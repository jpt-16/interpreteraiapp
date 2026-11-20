"use client";
import { AudioLines, BookText, LayoutDashboard, LineChart, Menu, MessagesSquare, Settings, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useData } from "@/lib/data/store";
import { cn } from "@/components/ui/cn";
import { Logo } from "./Logo";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/practice", label: "Practice Center", icon: AudioLines },
  { href: "/simulations", label: "Live Simulations", icon: MessagesSquare },
  { href: "/analytics", label: "Performance Analytics", icon: LineChart },
  { href: "/terminology", label: "Vocabulary & Terminology", icon: BookText },
  { href: "/settings", label: "Settings", icon: Settings },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-0.5" aria-label="Main">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] transition-colors",
              active ? "bg-surface-3 text-ink" : "text-muted hover:bg-surface-2 hover:text-ink-2",
            )}
          >
            <Icon size={16} strokeWidth={1.8} className={active ? "text-accent" : undefined} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function StatusFooter() {
  const { mode, user, status, prefs } = useData();
  const ai = status?.evaluation.live;
  return (
    <div className="space-y-3 border-t border-line pt-4">
      <Link href="/settings#integrations" className="block rounded-lg px-3 py-2 hover:bg-surface-2">
        <div className="flex items-center gap-2 text-[12px] text-muted">
          <span className={cn("h-1.5 w-1.5 rounded-full", ai ? "bg-good" : "bg-warn")} />
          {status ? (ai ? "AI evaluation live" : "Demo evaluator") : "Checking services…"}
        </div>
        <div className="mt-1 flex items-center gap-2 text-[12px] text-muted">
          <span className={cn("h-1.5 w-1.5 rounded-full", mode === "supabase" ? "bg-good" : "bg-warn")} />
          {mode === "supabase" ? "Synced account" : "Local demo storage"}
        </div>
      </Link>
      <div className="flex items-center gap-3 px-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-3 text-[12px] font-medium text-ink-2">
          {(prefs.displayName || "I").slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="truncate text-[13px] text-ink">{prefs.displayName}</div>
          <div className="truncate text-[11px] text-faint">{user?.email ?? "Demo workspace"}</div>
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { mode, error } = useData();
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-r border-line bg-surface/60 px-3 py-5 lg:flex">
        <Link href="/dashboard" className="mb-7 px-3">
          <Logo />
        </Link>
        <NavLinks />
        <div className="mt-auto">
          <StatusFooter />
        </div>
      </aside>

      {/* Mobile top bar + drawer */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-canvas/90 px-4 backdrop-blur lg:hidden">
        <Link href="/dashboard">
          <Logo />
        </Link>
        <button aria-label="Open navigation" onClick={() => setOpen(true)} className="rounded-lg p-2 text-ink-2 hover:bg-surface-2">
          <Menu size={20} />
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/60 animate-fade-in" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[280px] flex-col border-r border-line bg-surface px-3 py-4 animate-rise">
            <div className="mb-6 flex items-center justify-between px-3">
              <Logo />
              <button aria-label="Close navigation" onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-muted hover:bg-surface-2">
                <X size={18} />
              </button>
            </div>
            <NavLinks onNavigate={() => setOpen(false)} />
            <div className="mt-auto">
              <StatusFooter />
            </div>
          </div>
        </div>
      )}

      <main className="min-w-0 flex-1 pt-14 lg:pt-0">
        {mode === "local" && (
          <div className="border-b border-line bg-surface/50 px-4 py-2 text-center text-[12px] text-muted sm:px-8">
            <span className="font-medium text-warn">Demo mode.</span> Your practice history is stored only in this browser.{" "}
            <Link href="/settings#integrations" className="text-accent-strong hover:underline">
              See which integrations need configuration
            </Link>
          </div>
        )}
        {error && <div className="border-b border-bad/30 bg-bad-soft px-4 py-2 text-center text-[12px] text-bad">{error}</div>}
        <div className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-8 sm:py-8">{children}</div>
      </main>
    </div>
  );
}
