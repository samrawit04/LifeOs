import { createFileRoute, Link } from "@tanstack/react-router";
import { format, isToday, isTomorrow, isWithinInterval, addDays, startOfDay } from "date-fns";
import { StickyNote, NotebookText, CheckSquare, CalendarDays, Pin } from "lucide-react";
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

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-clay">
          {format(new Date(), "EEEE, MMMM d")}
        </p>
        <h1 className="mt-1 font-display text-4xl font-semibold text-lagoon">
          Good {greeting()}. Here's your day.
        </h1>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Today's calendar" icon={CalendarDays} to="/calendar">
          {todayEvents.length === 0 ? (
            <Empty text="Nothing scheduled. Enjoy the space." />
          ) : (
            <ul className="space-y-2">
              {todayEvents.map((e) => (
                <li key={e.id} className="flex items-start gap-3 rounded-xl border bg-card p-3">
                  <div className="mt-0.5 h-2.5 w-2.5 rounded-full" style={{ background: e.color ?? "var(--blossom)" }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-lagoon">{e.title || "Untitled event"}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(e.event_date!), "p")}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Upcoming tasks" icon={CheckSquare} to="/tasks">
          {upcomingTasks.length === 0 ? (
            <Empty text="Inbox zero this week." />
          ) : (
            <ul className="space-y-2">
              {upcomingTasks.slice(0, 6).map((t) => (
                <li key={t.id} className="flex items-start gap-3 rounded-xl border bg-card p-3">
                  <div className={cn("mt-0.5 h-2 w-2 rounded-full", prioClass(t.priority))} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-lagoon">{t.title || "Untitled task"}</p>
                    <p className="text-xs text-muted-foreground">
                      Due {relDate(t.due_date!)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Recently edited" icon={NotebookText} to="/notebooks">
          {recentPages.length === 0 ? (
            <Empty text="No notebook pages yet." />
          ) : (
            <ul className="space-y-2">
              {recentPages.map((p) => (
                <li key={p.id} className="rounded-xl border bg-card p-3">
                  <p className="truncate font-medium text-lagoon">{p.title || "Untitled"}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{p.content}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <section className="mt-10">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-display text-2xl text-lagoon flex items-center gap-2">
            <StickyNote className="h-5 w-5 text-blossom" />
            {pinnedNotes.length > 0 ? "Pinned notes" : "Recent sticky notes"}
          </h2>
          <Link to="/sticky" className="text-sm text-lagoon underline-offset-4 hover:underline">
            Open board →
          </Link>
        </div>
        {(pinnedNotes.length > 0 ? pinnedNotes : recentNotes).length === 0 ? (
          <div className="rounded-2xl border bg-card p-8 text-center text-muted-foreground">
            No sticky notes yet. Head to the board and double-click anywhere to jot one down.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(pinnedNotes.length > 0 ? pinnedNotes : recentNotes).map((n) => (
              <div
                key={n.id}
                className="relative aspect-square rounded-2xl p-4 shadow-note"
                style={{ background: noteColorCss(n.color) }}
              >
                {n.pinned && <Pin className="absolute right-3 top-3 h-3.5 w-3.5 text-clay" />}
                {n.title && <p className="font-display text-lg text-lagoon">{n.title}</p>}
                <p className="mt-1 line-clamp-6 whitespace-pre-wrap text-sm text-lagoon/85">{n.content}</p>
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
  return p === "high" ? "bg-destructive" : p === "medium" ? "bg-sunbeam" : "bg-lagoon/40";
}

function Panel({
  title, icon: Icon, to, children,
}: { title: string; icon: typeof StickyNote; to: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border bg-card p-5 shadow-soft">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-lg text-lagoon">
          <Icon className="h-4 w-4 text-blossom" /> {title}
        </h2>
        <Link to={to} className="text-xs text-muted-foreground hover:text-lagoon">All →</Link>
      </div>
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-xl bg-muted/50 px-4 py-6 text-center text-sm text-muted-foreground">{text}</p>;
}
