import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { apiClient } from "@/integrations/api/client";
import { Button } from "@/components/ui/button";
import { CalendarDays, StickyNote, NotebookText, CheckCircle2, Sparkles, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let mounted = true;
    apiClient.auth.getUser().then((user) => {
      if (!mounted) return;
      if (user) {
        navigate({ to: "/dashboard", replace: true });
      } else {
        setChecked(true);
      }
    });
    return () => {
      mounted = false;
    };
  }, [navigate]);

  if (!checked) return <div className="min-h-screen bg-cozy-grain" />;

  return (
    <div className="min-h-screen bg-cozy-grain">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-[0_10px_30px_-8px_oklch(0.78_0.14_160/0.7)]">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="font-display text-xl font-semibold text-gradient-primary">LifeOS</span>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/auth">
            <Button variant="ghost">Sign in</Button>
          </Link>
          <Link to="/auth" search={{ mode: "signup" }}>
            <Button className="bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-[0_10px_30px_-10px_oklch(0.78_0.14_160/0.8)] hover:opacity-95">
              Get started
            </Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24 pt-12">
        <section className="grid gap-12 lg:grid-cols-[1.15fr_1fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_oklch(0.78_0.14_160/0.9)]" />
              A quiet home for your day
            </div>
            <h1 className="mt-5 font-display text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl">
              <span className="text-gradient-primary">Sticky notes, notebooks & calendar</span>
              <span className="text-foreground"> — all under one soft light.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              LifeOS gathers your loose thoughts, upcoming plans, and running to-dos into a single
              elegant workspace. Draggable notes, nested notebooks, and a calm calendar — the
              morning glance you actually want to open.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/auth" search={{ mode: "signup" }}>
                <Button
                  size="lg"
                  className="group bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-[0_20px_50px_-15px_oklch(0.78_0.14_160/0.8)] hover:opacity-95"
                >
                  Create your workspace
                  <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline" className="border-white/15 bg-white/[0.03] hover:bg-white/[0.06]">
                  I already have an account
                </Button>
              </Link>
            </div>
          </div>

          <div className="relative h-[420px]">
            <div className="glass-card absolute inset-0 rounded-3xl" />
            <div className="pointer-events-none absolute -left-10 top-20 h-40 w-56 rotate-[-6deg] rounded-2xl bg-note-yellow p-4 shadow-note">
              <p className="text-xs font-semibold uppercase tracking-wider text-black/60">Idea</p>
              <p className="mt-2 font-display text-lg text-black/85">
                Sunday brunch — invite Amy & Jonas
              </p>
            </div>
            <div className="pointer-events-none absolute right-4 top-8 h-36 w-52 rotate-[5deg] rounded-2xl bg-note-pink p-4 shadow-note">
              <p className="text-xs font-semibold uppercase tracking-wider text-black/60">Urgent</p>
              <p className="mt-2 font-display text-lg text-black/85">Reply to Tom before 3pm</p>
            </div>
            <div className="pointer-events-none absolute bottom-8 left-14 h-32 w-48 rotate-[-2deg] rounded-2xl bg-note-blue p-4 shadow-note">
              <p className="text-xs font-semibold uppercase tracking-wider text-black/60">Reference</p>
              <p className="mt-2 font-display text-lg text-black/85">Reading list · fiction '26</p>
            </div>
            <div className="pointer-events-none absolute bottom-6 right-6 h-32 w-44 rotate-[3deg] rounded-2xl bg-note-lavender p-4 shadow-note">
              <p className="text-xs font-semibold uppercase tracking-wider text-black/60">Later</p>
              <p className="mt-2 font-display text-lg text-black/85">Sketch a new logo</p>
            </div>
          </div>
        </section>

        <section className="mt-28 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: StickyNote, label: "Sticky board", desc: "Freeform, colorful, draggable." },
            { icon: NotebookText, label: "Notebooks", desc: "Nested folders for long-form." },
            { icon: CalendarDays, label: "Calendar", desc: "Month, week, day — one look." },
            { icon: CheckCircle2, label: "Tasks", desc: "Due dates, priority, done pile." },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="glass-card group relative overflow-hidden rounded-2xl p-6 transition-transform hover:-translate-y-1">
              <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-primary/20 to-transparent blur-2xl" />
              <div className="relative grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary/30 to-accent/20">
                <Icon className="h-5 w-5 text-primary" strokeWidth={1.75} />
              </div>
              <h3 className="relative mt-4 font-display text-lg text-foreground">{label}</h3>
              <p className="relative mt-1 text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
