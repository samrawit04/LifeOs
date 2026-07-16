import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
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
  Wallet,
  PanelLeftClose,
} from "lucide-react";
import { apiClient } from "@/integrations/api/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { GlobalSearch } from "@/components/global-search";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/sticky", label: "Sticky Notes", icon: StickyNote },
  { to: "/notebooks", label: "Notebooks", icon: NotebookText },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/tasks", label: "Tasks", icon: CheckSquare },
  { to: "/expenses", label: "Expenses", icon: Wallet },
  { to: "/archive", label: "Archive", icon: Archive },
] as const;

const STORAGE_KEY = "lifeos.sidebar.open";

export function AppShell({ children }: { children: ReactNode }) {
  // Single open/closed flag used on all breakpoints. Default open on desktop.
  const [open, setOpen] = useState<boolean>(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Hydrate from localStorage after mount to avoid SSR mismatch.
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) setOpen(saved === "1");
    else setOpen(window.innerWidth >= 1024);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, open ? "1" : "0");
  }, [open]);

  // Close sidebar on route change on small screens
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) setOpen(false);
  }, [pathname]);

  const signOut = async () => {
    await apiClient.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="relative flex min-h-screen bg-cozy-grain">
      {/* Floating open button — only visible when sidebar is closed */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Show sidebar"
          className="fixed left-4 top-4 z-50 grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-background/70 text-foreground shadow-soft backdrop-blur-xl transition-all hover:bg-white/10 hover:text-primary"
        >
          <Menu className="h-4 w-4" />
        </button>
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-sidebar-border bg-sidebar/70 backdrop-blur-xl transition-transform duration-300",
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
          {/* Close button — lives inside the sidebar header, never overlaps page content */}
          <button
            onClick={() => setOpen(false)}
            aria-label="Hide sidebar"
            className="ml-auto grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
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

        <nav className="relative mt-4 flex-1 space-y-1 overflow-y-auto px-3">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = pathname === to || pathname.startsWith(to + "/");
            return (
              <Link
                key={to}
                to={to}
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

      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col transition-[margin,padding] duration-300",
          open ? "lg:ml-64" : "lg:ml-0",
        )}
      >
        <main
          className={cn(
            "min-w-0 flex-1 pt-16 lg:pt-0 transition-[padding] duration-300",
            !open && "pl-14",
          )}
        >
          {children}
        </main>
      </div>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
