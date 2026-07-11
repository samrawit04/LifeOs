import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CalendarDays, StickyNote, NotebookText, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data.session) {
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
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-lagoon text-cream font-display text-lg">
            L
          </div>
          <span className="font-display text-xl font-semibold text-lagoon">LifeOS</span>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/auth">
            <Button variant="ghost">Sign in</Button>
          </Link>
          <Link to="/auth" search={{ mode: "signup" }}>
            <Button className="bg-lagoon text-cream hover:bg-lagoon/90">Get started</Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-20 pt-8">
        <section className="grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:items-center">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-clay">
              A cozy home for your day
            </p>
            <h1 className="mt-3 font-display text-5xl font-semibold leading-[1.05] text-lagoon sm:text-6xl">
              Sticky notes, notebooks & calendar — all on one warm dashboard.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              LifeOS pulls your loose thoughts, upcoming plans, and running to-dos into a single
              gentle workspace. Draggable notes, nested notebooks, and a soft calendar — the
              morning glance you actually want to open.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/auth" search={{ mode: "signup" }}>
                <Button size="lg" className="bg-lagoon text-cream hover:bg-lagoon/90">
                  Create your workspace
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline">
                  I already have an account
                </Button>
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-6 top-6 h-40 w-56 rotate-[-6deg] rounded-2xl bg-note-yellow p-4 shadow-note">
              <p className="text-xs font-semibold uppercase tracking-wider text-clay">Idea</p>
              <p className="mt-2 font-display text-lg text-lagoon">
                Sunday brunch — invite Amy & Jonas
              </p>
            </div>
            <div className="absolute right-2 top-0 h-36 w-52 rotate-[4deg] rounded-2xl bg-note-pink p-4 shadow-note">
              <p className="text-xs font-semibold uppercase tracking-wider text-clay">Urgent</p>
              <p className="mt-2 font-display text-lg text-lagoon">Reply to Tom before 3pm</p>
            </div>
            <div className="absolute -bottom-2 left-16 h-32 w-48 rotate-[-2deg] rounded-2xl bg-note-blue p-4 shadow-note">
              <p className="text-xs font-semibold uppercase tracking-wider text-clay">Reference</p>
              <p className="mt-2 font-display text-lg text-lagoon">Reading list · fiction ‘26</p>
            </div>
            <div className="h-96 w-full rounded-3xl bg-corkboard shadow-soft" />
          </div>
        </section>

        <section className="mt-24 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: StickyNote, label: "Sticky board", desc: "Freeform, colorful, draggable." },
            { icon: NotebookText, label: "Notebooks", desc: "Nested folders for long-form." },
            { icon: CalendarDays, label: "Calendar", desc: "Month, week, day — one look." },
            { icon: CheckCircle2, label: "Tasks", desc: "Due dates, priority, done pile." },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="rounded-2xl border bg-card p-5 shadow-soft">
              <Icon className="h-6 w-6 text-blossom" strokeWidth={1.75} />
              <h3 className="mt-3 font-display text-lg text-lagoon">{label}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
