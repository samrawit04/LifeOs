import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useState } from "react";
import {
  LayoutDashboard,
  StickyNote,
  NotebookText,
  CalendarDays,
  CheckSquare,
  Archive,
  Search,
  LogOut,
  Menu,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { GlobalSearch } from "@/components/global-search";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/sticky", label: "Sticky Notes", icon: StickyNote },
  { to: "/notebooks", label: "Notebooks", icon: NotebookText },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/tasks", label: "Tasks", icon: CheckSquare },
  { to: "/archive", label: "Archive", icon: Archive },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="relative flex min-h-screen bg-cozy-grain">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-sidebar-border transition-transform lg:relative lg:translate-x-0",
          "bg-sidebar/70 backdrop-blur-xl",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* subtle top glow */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-primary/15 to-transparent" />

        <div className="relative flex h-16 items-center gap-3 px-5">
          <div className="relative grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-primary via-primary to-accent font-display text-lg text-primary-foreground shadow-[0_10px_30px_-8px_oklch(0.62_0.22_275/0.7)]">
            <Sparkles className="h-5 w-5" strokeWidth={2.25} />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-display text-lg font-semibold text-gradient-indigo">LifeOS</span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">your home</span>
          </div>
        </div>

        <div className="relative px-3">
          <button
            onClick={() => setSearchOpen(true)}
            className="group flex w-full items-center gap-2 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 text-left text-sm text-muted-foreground shadow-sm transition hover:border-primary/30 hover:bg-white/[0.06] hover:text-foreground"
          >
            <Search className="h-4 w-4 transition-colors group-hover:text-primary" />
            <span className="flex-1">Search everything…</span>
            <kbd className="hidden rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">⌘K</kbd>
          </button>
        </div>

        <nav className="relative mt-4 flex-1 space-y-1 px-3">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = pathname === to || pathname.startsWith(to + "/");
            return (
              <Link
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "bg-gradient-to-r from-primary/25 via-primary/10 to-transparent text-foreground shadow-[inset_0_1px_0_oklch(1_0_0/0.08)]"
                    : "text-sidebar-foreground/80 hover:bg-white/[0.04] hover:text-foreground",
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-gradient-to-b from-primary to-accent shadow-[0_0_12px_oklch(0.62_0.22_275/0.8)]" />
                )}
                <Icon
                  className={cn(
                    "h-4 w-4 transition-colors",
                    active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                  )}
                  strokeWidth={active ? 2.25 : 1.75}
                />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="relative border-t border-sidebar-border p-3">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-background/60 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border/60 bg-background/70 px-4 backdrop-blur-xl lg:hidden">
          <button
            onClick={() => setOpen((v) => !v)}
            className="rounded-lg p-2 text-foreground hover:bg-white/5"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-display text-lg text-gradient-indigo">LifeOS</span>
        </header>

        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
