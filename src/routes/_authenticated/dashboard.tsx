import { createFileRoute, Link } from "@tanstack/react-router";
import { format, isToday, isTomorrow, isWithinInterval, addDays, startOfDay } from "date-fns";
import { StickyNote, NotebookText, CheckSquare, CalendarDays, Pin, Sparkles, ArrowUpRight } from "lucide-react";
import { useItems } from "@/hooks/use-lifeos";
import { noteColorCss } from "@/lib/lifeos-types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { data: items = [] } = useItems();
  const active = items.filter((i) => !i.archived);
  const today = startOfDay(new Date());
  const in7 = addDays(today, 7);

  const todayEvents = active
    .filter((i) => i.type === "event" && i.event_date && isToday(new Date(i.event_date)))
    .sort((a, b) => (a.event_date! < b.event_date! ? -1 : 1));

  const upcomingTasks = active
    .filter((i) => i.type === "task" && !i.completed && i.due_date && isWithinInterval(new Date(i.due_date), { start: today, end: in7 }))
    .sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1));

  const pinnedNotes = active.filter((i) => i.type === "sticky" && i.pinned).slice(0, 4);
  const recentNotes = active.filter((i) => i.type === "sticky").slice(0, 6);
  const recentPages = active.filter((i) => i.type === "notebook_page").slice(0, 5);

  const stats = [
    { label: "Sticky notes", value: active.filter((i) => i.type === "sticky").length, icon: StickyNote, tint: "from-note-yellow/30 to-transparent" },
    { label: "Notebook pages", value: active.filter((i) => i.type === "notebook_page").length, icon: NotebookText, tint: "from-note-blue/30 to-transparent" },
    { label: "Open tasks", value: active.filter((i) => i.type === "task" && !i.completed).length, icon: CheckSquare, tint: "from-note-green/30 to-transparent" },
    { label: "Events this week", value: active.filter((i) => i.type === "event" && i.event_date && isWithinInterval(new Date(i.event_date), { start: today, end: in7 })).length, icon: CalendarDays, tint: "from-accent/30 to-transparent" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <header className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <Sparkles className="h-3 w-3 text-primary" />
            {format(new Date(), "EEEE · MMMM d, yyyy")}
          </div>
          <h1 className="mt-4 font-display text-5xl font-semibold leading-tight text-gradient-primary sm:text-6xl">
            Good {greeting()}.
          </h1>
          <p className="mt-2 max-w-xl text-base text-muted-foreground">
            Your quiet corner of the internet — a soft glance at everything on your mind today.
          </p>
        </div>
      </header>

      {/* Stat strip */}
      <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, tint }) => (
          <div key={label} className="glass-card relative overflow-hidden rounded-2xl p-5">
            <div className={cn("pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br blur-2xl", tint)} />
            <Icon className="h-4 w-4 text-primary" />
            <p className="mt-3 font-display text-3xl font-semibold text-foreground">{value}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Today's calendar" icon={CalendarDays} to="/calendar" accent="from-primary/20">
          {todayEvents.length === 0 ? (
            <Empty text="Nothing scheduled. Enjoy the space." />
          ) : (
            <ul className="space-y-2">
              {todayEvents.map((e) => (
                <li key={e.id} className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-3 transition hover:bg-white/[0.06]">
                  <div
                    className="mt-1.5 h-2.5 w-2.5 rounded-full shadow-[0_0_10px_currentColor]"
                    style={{ background: e.color ?? "var(--primary)", color: e.color ?? "var(--primary)" }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">{e.title || "Untitled event"}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(e.event_date!), "p")}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Upcoming tasks" icon={CheckSquare} to="/tasks" accent="from-accent/20">
          {upcomingTasks.length === 0 ? (
            <Empty text="Inbox zero this week." />
          ) : (
            <ul className="space-y-2">
              {upcomingTasks.slice(0, 6).map((t) => (
                <li key={t.id} className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-3 transition hover:bg-white/[0.06]">
                  <div className={cn("mt-1.5 h-2 w-2 rounded-full", prioClass(t.priority))} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">{t.title || "Untitled task"}</p>
                    <p className="text-xs text-muted-foreground">
                      Due {relDate(t.due_date!)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Recently edited" icon={NotebookText} to="/notebooks" accent="from-note-blue/20">
          {recentPages.length === 0 ? (
            <Empty text="No notebook pages yet." />
          ) : (
            <ul className="space-y-2">
              {recentPages.map((p) => (
                <li key={p.id} className="rounded-xl border border-white/5 bg-white/[0.03] p-3 transition hover:bg-white/[0.06]">
                  <p className="truncate font-medium text-foreground">{p.title || "Untitled"}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{p.content}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <section className="mt-12">
        <div className="mb-5 flex items-baseline justify-between">
          <h2 className="flex items-center gap-2 font-display text-2xl text-foreground">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-primary/30 to-accent/20">
              <StickyNote className="h-4 w-4 text-primary" />
            </span>
            {pinnedNotes.length > 0 ? "Pinned notes" : "Recent sticky notes"}
          </h2>
          <Link
            to="/sticky"
            className="group inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Open board
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>
        {(pinnedNotes.length > 0 ? pinnedNotes : recentNotes).length === 0 ? (
          <div className="glass-card rounded-2xl p-10 text-center text-muted-foreground">
            No sticky notes yet. Head to the board and double-click anywhere to jot one down.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(pinnedNotes.length > 0 ? pinnedNotes : recentNotes).map((n, i) => (
              <div
                key={n.id}
                className="group relative aspect-square rounded-2xl p-4 shadow-note transition-transform duration-300 hover:-translate-y-1 hover:rotate-0"
                style={{
                  background: `linear-gradient(160deg, ${noteColorCss(n.color)}, color-mix(in oklab, ${noteColorCss(n.color)} 70%, black))`,
                  transform: `rotate(${(i % 2 === 0 ? -1 : 1) * (1 + (i % 3))}deg)`,
                }}
              >
                {n.pinned && <Pin className="absolute right-3 top-3 h-3.5 w-3.5 text-black/50" />}
                {n.title && <p className="font-display text-lg text-black/85">{n.title}</p>}
                <p className="mt-1 line-clamp-6 whitespace-pre-wrap text-sm text-black/75">{n.content}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "night";
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}
function relDate(iso: string) {
  const d = new Date(iso);
  if (isToday(d)) return "today";
  if (isTomorrow(d)) return "tomorrow";
  return format(d, "EEE, MMM d");
}
function prioClass(p: string | null) {
  return p === "high"
    ? "bg-destructive shadow-[0_0_8px_oklch(0.63_0.22_20/0.8)]"
    : p === "medium"
    ? "bg-sunbeam shadow-[0_0_8px_oklch(0.85_0.14_90/0.6)]"
    : "bg-primary/60";
}

function Panel({
  title, icon: Icon, to, children, accent,
}: { title: string; icon: typeof StickyNote; to: string; children: React.ReactNode; accent: string }) {
  return (
    <section className="glass-card group relative overflow-hidden rounded-3xl p-6">
      <div className={cn("pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-to-br blur-3xl opacity-70 transition-opacity group-hover:opacity-100", accent)} />
      <div className="relative mb-5 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-foreground">
          <span className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/[0.04]">
            <Icon className="h-4 w-4 text-primary" />
          </span>
          {title}
        </h2>
        <Link to={to} className="text-xs text-muted-foreground transition hover:text-foreground">
          All →
        </Link>
      </div>
      <div className="relative">{children}</div>
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center text-sm text-muted-foreground">
      {text}
    </p>
  );
}
