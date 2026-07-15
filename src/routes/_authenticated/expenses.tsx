import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { format, startOfMonth, isSameMonth, subMonths } from "date-fns";
import { Wallet, Plus, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import {
  useCreateExpense,
  useDeleteExpense,
  useExpenses,
} from "@/hooks/use-expenses";
import { EXPENSE_CATEGORIES, categoryEmoji } from "@/lib/lifeos-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/expenses")({
  component: ExpensesPage,
});

function ExpensesPage() {
  const { data: expenses = [] } = useExpenses();
  const create = useCreateExpense();
  const del = useDeleteExpense();

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>("Food");
  const [note, setNote] = useState("");

  const now = new Date();
  const monthStart = startOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));

  const thisMonth = expenses.filter((e) => isSameMonth(new Date(e.occurred_at), monthStart));
  const lastMonth = expenses.filter((e) => isSameMonth(new Date(e.occurred_at), lastMonthStart));

  const totalThis = thisMonth.reduce((s, e) => s + Number(e.amount), 0);
  const totalLast = lastMonth.reduce((s, e) => s + Number(e.amount), 0);
  const diff = totalThis - totalLast;
  const trending = diff >= 0;

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of thisMonth) map.set(e.category, (map.get(e.category) ?? 0) + Number(e.amount));
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [thisMonth]);

  const maxCat = byCategory[0]?.[1] ?? 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseFloat(amount);
    if (!n || n <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    create.mutate(
      { amount: n, category, note: note || null },
      {
        onSuccess: () => {
          setAmount("");
          setNote("");
          toast.success("Expense added");
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-muted-foreground">
            <Wallet className="h-3 w-3 text-primary" /> Money
          </div>
          <h1 className="mt-3 font-display text-4xl text-gradient-indigo">Expenses</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A calm space to track where your money goes.
          </p>
        </div>
      </header>

      {/* Summary tiles */}
      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <SummaryTile label="This month" value={totalThis} accent="from-primary/25" big />
        <SummaryTile label="Last month" value={totalLast} accent="from-accent/20" />
        <div className="glass-card relative flex items-center gap-4 overflow-hidden rounded-2xl p-5">
          <div
            className={cn(
              "grid h-12 w-12 place-items-center rounded-xl",
              trending ? "bg-destructive/15 text-destructive" : "bg-emerald-500/15 text-emerald-400",
            )}
          >
            {trending ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">vs last month</p>
            <p className="font-display text-2xl">
              {trending ? "+" : "−"}${Math.abs(diff).toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        {/* Add form + category breakdown */}
        <div className="space-y-6">
          <form onSubmit={submit} className="glass-card space-y-4 rounded-3xl p-6">
            <h2 className="font-display text-lg">Add expense</h2>
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-12 text-lg"
              />
              <div className="grid h-12 place-items-center rounded-md border border-white/10 bg-white/[0.03] px-3 text-sm text-muted-foreground">
                USD
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {EXPENSE_CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategory(c.value)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition",
                    category === c.value
                      ? "border-primary/50 bg-primary/15 text-foreground shadow-[0_0_20px_-6px_oklch(0.62_0.22_275/0.7)]"
                      : "border-white/10 bg-white/[0.03] text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span>{c.emoji}</span> {c.value}
                </button>
              ))}
            </div>
            <Input
              placeholder="Note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <Button type="submit" className="w-full gap-2" disabled={create.isPending}>
              <Plus className="h-4 w-4" /> Add expense
            </Button>
          </form>

          <div className="glass-card rounded-3xl p-6">
            <h2 className="mb-4 font-display text-lg">This month by category</h2>
            {byCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground">No expenses yet this month.</p>
            ) : (
              <ul className="space-y-3">
                {byCategory.map(([cat, val]) => (
                  <li key={cat}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span>{categoryEmoji(cat)}</span>
                        <span className="text-foreground">{cat}</span>
                      </span>
                      <span className="text-muted-foreground">${val.toFixed(2)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                        style={{ width: `${(val / maxCat) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Recent list */}
        <div className="glass-card rounded-3xl p-6">
          <h2 className="mb-4 font-display text-lg">Recent</h2>
          {expenses.length === 0 ? (
            <p className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center text-sm text-muted-foreground">
              Nothing tracked yet. Add your first expense on the left.
            </p>
          ) : (
            <ul className="divide-y divide-white/5">
              {expenses.slice(0, 30).map((e) => (
                <li key={e.id} className="group flex items-center gap-3 py-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/[0.04] text-lg">
                    {categoryEmoji(e.category)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">
                      {e.note || e.category}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {e.category} · {format(new Date(e.occurred_at), "MMM d, p")}
                    </p>
                  </div>
                  <p className="font-display text-lg tabular-nums text-foreground">
                    ${Number(e.amount).toFixed(2)}
                  </p>
                  <button
                    onClick={() => del.mutate(e.id)}
                    className="rounded-lg p-2 text-muted-foreground opacity-0 transition hover:bg-white/5 hover:text-destructive group-hover:opacity-100"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  accent,
  big,
}: {
  label: string;
  value: number;
  accent: string;
  big?: boolean;
}) {
  return (
    <div className="glass-card relative overflow-hidden rounded-2xl p-5">
      <div className={cn("pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br blur-2xl", accent)} />
      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className={cn("mt-2 font-display tabular-nums", big ? "text-4xl text-gradient-indigo" : "text-3xl")}>
        ${value.toFixed(2)}
      </p>
    </div>
  );
}
