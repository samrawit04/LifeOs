import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useIsFetching } from "@tanstack/react-query";
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
  Wallet,
  PanelLeftClose,
  Sun,
  Moon,
  Music,
} from "lucide-react";
import { apiClient } from "@/integrations/api/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { GlobalSearch } from "@/components/global-search";
import { AiChat } from "@/components/ai-chat";
import { MiniPlayer } from "@/components/mini-player";
import { GlobalAudioPlayer } from "@/components/global-audio-player";
import { NotificationBell } from "@/components/notification-bell";
import { NotificationPoller } from "@/components/notification-poller";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/sticky", label: "Sticky Notes", icon: StickyNote },
  { to: "/notebooks", label: "Notebooks", icon: NotebookText },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/tasks", label: "Tasks", icon: CheckSquare },
  { to: "/expenses", label: "Expenses", icon: Wallet },
  { to: "/music", label: "Music", icon: Music },
  { to: "/archive", label: "Archive", icon: Archive },
] as const;

const STORAGE_KEY = "lifepulse.sidebar.open";
const THEME_STORAGE_KEY = "lifepulse.theme";

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<boolean>(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const pageTitle = (() => {
    const found = NAV.find((n) => pathname === n.to || pathname.startsWith(n.to + "/"));
    return found?.label ?? "LifePulse";
  })();

  useEffect(() => {
    const savedTheme = (localStorage.getItem(THEME_STORAGE_KEY) as "dark" | "light") || "dark";
    setTheme(savedTheme);
    if (savedTheme === "light") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem(THEME_STORAGE_KEY, next);
    if (next === "light") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
  };

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) setOpen(saved === "1");
    else setOpen(window.innerWidth >= 1024);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, open ? "1" : "0");
  }, [open]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) setOpen(false);
  }, [pathname]);

  const signOut = async () => {
    await apiClient.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const isFetching = useIsFetching();

  return (
    <div className="relative flex min-h-screen bg-cozy-grain">
      <div
        className={cn(
          "fixed top-0 left-0 right-0 z-[9999] h-[2px] overflow-hidden transition-opacity duration-300",
          isFetching ? "opacity-100" : "opacity-0",
        )}
      >
        <div className="h-full w-full animate-loading-bar bg-gradient-to-r from-transparent via-primary to-transparent" />
      </div>
      {!open && (
        <div className="fixed inset-x-4 top-3 z-50 flex items-center justify-between gap-2 pointer-events-none">
          <button
            onClick={() => setOpen(true)}
            aria-label="Show sidebar"
            className="pointer-events-auto grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-background/80 text-foreground shadow-soft backdrop-blur-xl transition-all hover:bg-white/10 hover:text-primary"
          >
            <Menu className="h-4 w-4" />
          </button>

          <span className="flex-1 text-center text-sm font-semibold text-foreground truncate px-2 pointer-events-none">
            {pageTitle}
          </span>

          <div className="pointer-events-auto flex items-center gap-1.5">
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-muted-foreground backdrop-blur-xl transition-all hover:bg-white/10 hover:text-foreground"
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === "dark" ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-emerald-600" />}
            </button>
            <NotificationBell />
            <img
              src="/logo.png"
              alt="LifePulse"
              className="h-8 w-8 rounded-xl object-cover border border-white/10 shadow-soft"
            />
          </div>
        </div>
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-sidebar-border bg-sidebar/70 backdrop-blur-xl transition-transform duration-300",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-primary/15 to-transparent" />

        <div className="relative flex h-16 items-center gap-3 px-5">
          <img
            src="/logo.png"
            alt="LifePulse Logo"
            className="h-10 w-10 rounded-2xl object-cover shadow-[0_10px_30px_-8px_oklch(0.78_0.14_160/0.7)] border border-white/10"
          />
          <div className="flex flex-col leading-tight">
            <span className="font-display text-lg font-semibold text-gradient-primary">LifePulse</span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">your home</span>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={() => setOpen(false)}
              aria-label="Hide sidebar"
              className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
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
                  <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-gradient-to-b from-primary to-accent shadow-[0_0_12px_oklch(0.78_0.14_160/0.8)]" />
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

        <div className="relative border-t border-sidebar-border p-3 flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            className="flex-1 justify-start gap-2 text-muted-foreground hover:text-foreground"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
          <button
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            className="hidden lg:grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
          >
            {theme === "dark" ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-emerald-600" />}
          </button>
        </div>
      </aside>

      {open && isMobile && (
        <div
          className="fixed inset-0 z-30 bg-background/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col transition-[margin,padding] duration-300",
          open ? "lg:ml-64" : "lg:ml-0",
        )}
      >
        <div
          className={cn(
            "min-w-0 flex-1 pt-12 lg:pt-0 transition-[padding] duration-300",
            !open && "pl-0 lg:pl-14",
          )}
        >
          {children}
        </div>
      </div>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
      <AiChat />
      <MiniPlayer />
      <GlobalAudioPlayer />
      <NotificationPoller />
    </div>
  );
}
