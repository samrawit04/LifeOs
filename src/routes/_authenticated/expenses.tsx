import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { 
  format, startOfMonth, isSameMonth, subMonths,
  startOfDay, endOfDay, startOfWeek, endOfWeek,
  isWithinInterval, eachDayOfInterval, subDays
} from "date-fns";
import { Wallet, Plus, Trash2, TrendingUp, TrendingDown, Calendar, CheckSquare, Sparkles, Pencil, ArrowRight, Tag, Percent } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/expenses")({
  component: ExpensesPage,
});

interface PlannedPurchase {
  id: string;
  name: string;
  amount: number;
  category: string;
  purchased: boolean;
}

type PeriodType = "today" | "week" | "month" | "last_month" | "all";

const CURRENCY = "Birr";

function ExpensesPage() {
  const { data: expenses = [] } = useExpenses();
  const create = useCreateExpense();
  const del = useDeleteExpense();

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>("Food");
  const [note, setNote] = useState("");

  // Sub-tabs State (Log, Pacing, Analytics, Wishlist)
  const [activeTab, setActiveTab] = useState<"log" | "pacing" | "analytics" | "wishlist">("log");

  // Time Period Filter State for Analytics Tab
  const [activePeriod, setActivePeriod] = useState<PeriodType>("month");

  // Category Budgets State (Defaulting to user's parameters)
  const [categoryBudgets, setCategoryBudgets] = useState<Record<string, number>>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("lifeos.expenses.category_budgets");
      return saved ? JSON.parse(saved) : { Food: 4000, Transport: 3000, Shopping: 1000 };
    }
    return { Food: 4000, Transport: 3000, Shopping: 1000 };
  });

  const [isCategoryBudgetOpen, setIsCategoryBudgetOpen] = useState(false);
  const [isViewPlanOpen, setIsViewPlanOpen] = useState(false);
  const [tempCategoryBudgets, setTempCategoryBudgets] = useState<Record<string, string>>({});

  // Dynamic overall budget is the sum of category budgets
  const monthlyBudget = useMemo(() => {
    return Object.values(categoryBudgets).reduce((sum, val) => sum + val, 0);
  }, [categoryBudgets]);

  // Wishlist/Planned Purchases State
  const [plannedPurchases, setPlannedPurchases] = useState<PlannedPurchase[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("lifeos.expenses.planned_purchases");
      return saved ? JSON.parse(saved) : [
        { id: "1", name: "Buy T-shirt", amount: 1000, category: "Shopping", purchased: false }
      ];
    }
    return [
      { id: "1", name: "Buy T-shirt", amount: 1000, category: "Shopping", purchased: false }
    ];
  });

  const [wishlistName, setWishlistName] = useState("");
  const [wishlistAmount, setWishlistAmount] = useState("");
  const [wishlistCategory, setWishlistCategory] = useState("Shopping");

  const now = useMemo(() => new Date(), []);
  const monthStart = startOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));

  // Today's Spends Calculation (for the simplified logging tab)
  const todayExpenses = useMemo(() => {
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    return expenses.filter((e) => {
      const date = new Date(e.occurred_at);
      return isWithinInterval(date, { start: todayStart, end: todayEnd });
    });
  }, [expenses, now]);

  const totalToday = useMemo(() => {
    return todayExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  }, [todayExpenses]);

  // Actual current month totals for budget pacing (against the full calendar month)
  const thisMonthExpenses = useMemo(() => {
    return expenses.filter((e) => isSameMonth(new Date(e.occurred_at), monthStart));
  }, [expenses, monthStart]);

  const lastMonthExpenses = useMemo(() => {
    return expenses.filter((e) => isSameMonth(new Date(e.occurred_at), lastMonthStart));
  }, [expenses, lastMonthStart]);

  const totalThisMonth = thisMonthExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const totalLastMonth = lastMonthExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const monthDiff = totalThisMonth - totalLastMonth;
  const monthTrending = monthDiff >= 0;

  // Filtered expenses based on activePeriod dashboard selection
  const filteredExpenses = useMemo(() => {
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    return expenses.filter((e) => {
      const date = new Date(e.occurred_at);
      if (activePeriod === "today") {
        return isWithinInterval(date, { start: todayStart, end: todayEnd });
      }
      if (activePeriod === "week") {
        return isWithinInterval(date, { start: weekStart, end: weekEnd });
      }
      if (activePeriod === "month") {
        return isSameMonth(date, monthStart);
      }
      if (activePeriod === "last_month") {
        return isSameMonth(date, lastMonthStart);
      }
      return true; // all
    });
  }, [expenses, activePeriod, now, monthStart, lastMonthStart]);

  const totalFiltered = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  }, [filteredExpenses]);

  // Pacing math
  const daysInMonth = useMemo(() => {
    const year = now.getFullYear();
    const month = now.getMonth();
    return new Date(year, month + 1, 0).getDate();
  }, [now]);

  const currentDay = useMemo(() => {
    return now.getDate();
  }, [now]);

  const daysRemaining = daysInMonth - currentDay + 1;
  const elapsedPercent = (currentDay / daysInMonth) * 100;
  const spentPercent = monthlyBudget > 0 ? (totalThisMonth / monthlyBudget) * 100 : 0;
  const dailyAverage = currentDay > 0 ? totalThisMonth / currentDay : 0;
  const projectedTotal = dailyAverage * daysInMonth;
  const projectedDiff = projectedTotal - monthlyBudget;
  const remainingBudget = Math.max(monthlyBudget - totalThisMonth, 0);
  const safeSpendLimit = daysRemaining > 0 ? remainingBudget / daysRemaining : 0;

  const pacingStatus = useMemo(() => {
    if (spentPercent <= elapsedPercent) return "on_track";
    if (spentPercent <= elapsedPercent + 10) return "high";
    return "over";
  }, [spentPercent, elapsedPercent]);

  // Chart data calculations
  const dailySpendData = useMemo(() => {
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    let days: Date[] = [];
    if (activePeriod === "today") {
      days = [now];
    } else if (activePeriod === "week") {
      days = eachDayOfInterval({ start: weekStart, end: weekEnd });
    } else if (activePeriod === "month") {
      // Days from start of month up to today
      days = eachDayOfInterval({ start: monthStart, end: now });
    } else if (activePeriod === "last_month") {
      const year = lastMonthStart.getFullYear();
      const month = lastMonthStart.getMonth();
      const lastMonthEnd = new Date(year, month + 1, 0);
      days = eachDayOfInterval({ start: lastMonthStart, end: lastMonthEnd });
    } else {
      // All time, show last 7 days as default chart
      days = eachDayOfInterval({ start: subDays(now, 6), end: now });
    }

    return days.map((day) => {
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);
      const total = expenses
        .filter((e) => {
          const date = new Date(e.occurred_at);
          return isWithinInterval(date, { start: dayStart, end: dayEnd });
        })
        .reduce((sum, e) => sum + Number(e.amount), 0);

      return {
        date: day,
        label: format(day, activePeriod === "month" || activePeriod === "last_month" ? "d" : "EEE"),
        fullName: format(day, "EEEE, MMMM d"),
        total,
      };
    });
  }, [expenses, activePeriod, now, monthStart, lastMonthStart]);

  const maxDailySpend = useMemo(() => {
    return Math.max(...dailySpendData.map((d) => d.total), 1);
  }, [dailySpendData]);

  // Category breakdown for selected period
  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of filteredExpenses) {
      map.set(e.category, (map.get(e.category) ?? 0) + Number(e.amount));
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [filteredExpenses]);

  const maxCat = byCategory[0]?.[1] ?? 0;

  // Form submission
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

  // Edit category budgets handler
  const handleOpenCategoryBudget = () => {
    const temp: Record<string, string> = {};
    EXPENSE_CATEGORIES.forEach((c) => {
      temp[c.value] = (categoryBudgets[c.value] ?? 0).toString();
    });
    setTempCategoryBudgets(temp);
    setIsCategoryBudgetOpen(true);
  };

  const handleSaveCategoryBudgets = (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, number> = {};
    EXPENSE_CATEGORIES.forEach((c) => {
      const val = parseFloat(tempCategoryBudgets[c.value] || "0");
      if (!isNaN(val) && val > 0) {
        next[c.value] = val;
      }
    });
    setCategoryBudgets(next);
    localStorage.setItem("lifeos.expenses.category_budgets", JSON.stringify(next));
    setIsCategoryBudgetOpen(false);
    toast.success("Category budgets updated!");
  };

  // Add item to planned wishlist
  const handleAddWishlist = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(wishlistAmount);
    if (!wishlistName.trim() || isNaN(amt) || amt <= 0) {
      return toast.error("Please enter item name and valid amount");
    }
    const item: PlannedPurchase = {
      id: crypto.randomUUID(),
      name: wishlistName.trim(),
      amount: amt,
      category: wishlistCategory,
      purchased: false,
    };
    const next = [...plannedPurchases, item];
    setPlannedPurchases(next);
    localStorage.setItem("lifeos.expenses.planned_purchases", JSON.stringify(next));
    setWishlistName("");
    setWishlistAmount("");
    toast.success("Planned purchase added!");
  };

  // Purchase/Convert wishlist item to actual expense
  const handleBuyWishlistItem = (item: PlannedPurchase) => {
    create.mutate(
      { amount: item.amount, category: item.category, note: item.name },
      {
        onSuccess: () => {
          const next = plannedPurchases.map((p) => p.id === item.id ? { ...p, purchased: true } : p);
          setPlannedPurchases(next);
          localStorage.setItem("lifeos.expenses.planned_purchases", JSON.stringify(next));
          toast.success(`Purchased "${item.name}" and added to daily expenses!`);
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  // Delete planned purchase item
  const handleDeleteWishlistItem = (id: string) => {
    const next = plannedPurchases.filter((p) => p.id !== id);
    setPlannedPurchases(next);
    localStorage.setItem("lifeos.expenses.planned_purchases", JSON.stringify(next));
    toast.success("Item removed");
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      {/* Title Header */}
      <header className="mb-8 flex flex-wrap items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-muted-foreground">
            <Wallet className="h-3 w-3 text-primary" /> Money OS
          </div>
          <h1 className="mt-3 font-display text-4xl text-gradient-primary">Expenses</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A simple, calm space to log and analyze your spending.
          </p>
        </div>

        {/* Tab Controls for Simplified View */}
        <div className="flex border border-white/10 bg-white/[0.02] p-1 rounded-xl text-xs gap-1">
          <button
            onClick={() => setActiveTab("log")}
            className={cn(
              "px-4 py-2 rounded-lg font-semibold transition-all",
              activeTab === "log" 
                ? "bg-primary text-primary-foreground shadow" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            ✍️ Log Spend
          </button>
          <button
            onClick={() => setActiveTab("pacing")}
            className={cn(
              "px-4 py-2 rounded-lg font-semibold transition-all",
              activeTab === "pacing" 
                ? "bg-primary text-primary-foreground shadow" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            📈 Budget Pacing
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={cn(
              "px-4 py-2 rounded-lg font-semibold transition-all",
              activeTab === "analytics" 
                ? "bg-primary text-primary-foreground shadow" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            📊 Spend Analytics
          </button>
          <button
            onClick={() => setActiveTab("wishlist")}
            className={cn(
              "px-4 py-2 rounded-lg font-semibold transition-all",
              activeTab === "wishlist" 
                ? "bg-primary text-primary-foreground shadow" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            🛍️ Planned Purchases
          </button>
        </div>
      </header>

      {/* ----------------- TAB 1: LOG SPEND (SIMPLE MODE) ----------------- */}
      {activeTab === "log" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <form onSubmit={submit} className="glass-card space-y-4 rounded-3xl p-6">
            <h2 className="font-display text-lg font-semibold text-lagoon">Log Spent Today</h2>
            
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="Amount spent today..."
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-12 text-lg border-white/10 bg-white/[0.03]"
                autoFocus
              />
              <div className="grid h-12 place-items-center rounded-md border border-white/10 bg-white/[0.03] px-4 text-sm text-muted-foreground font-semibold">
                {CURRENCY}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Select Category</label>
              <div className="flex flex-wrap gap-2">
                {EXPENSE_CATEGORIES.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCategory(c.value)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition",
                      category === c.value
                        ? "border-primary/50 bg-primary/15 text-foreground shadow-[0_0_20px_-6px_oklch(0.78_0.14_160/0.7)]"
                        : "border-white/10 bg-white/[0.03] text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <span>{c.emoji}</span> {c.value}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Note / Description</label>
              <Input
                placeholder="What did you buy? (optional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="h-10 border-white/10 bg-white/[0.03]"
              />
            </div>

            <Button type="submit" className="w-full h-11 gap-2 bg-lagoon text-cream hover:bg-lagoon/90 font-semibold" disabled={create.isPending}>
              <Plus className="h-4 w-4" /> Save Expense
            </Button>
          </form>

          {/* Today's Log Card */}
          <div className="glass-card rounded-3xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between border-b border-white/5 pb-3 gap-2">
              <h2 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wider">Today's Log</h2>
              <span className="text-sm font-bold text-foreground">
                Total spent today: {totalToday.toFixed(2)} {CURRENCY}
              </span>
            </div>

            {todayExpenses.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                You haven't logged any expenses today. Enter what you spent above!
              </p>
            ) : (
              <ul className="divide-y divide-white/5 max-h-80 overflow-y-auto pr-1">
                {todayExpenses.map((e) => (
                  <li key={e.id} className="group flex items-center justify-between gap-3 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/[0.04] text-sm">
                        {categoryEmoji(e.category)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-sm text-foreground">
                          {e.note || e.category}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {e.category} · {format(new Date(e.occurred_at), "p")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-display font-semibold text-sm text-foreground font-sans">
                        {Number(e.amount).toFixed(2)} {CURRENCY}
                      </p>
                      <button
                        onClick={() => del.mutate(e.id)}
                        className="rounded p-1 text-muted-foreground hover:bg-white/5 hover:text-destructive group-hover:opacity-100 transition"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* ----------------- TAB 2: PACING & BUDGET ----------------- */}
      {activeTab === "pacing" && (
        <div className="space-y-6">
          {/* Summary Tiles Row */}
          <div className="grid gap-4 md:grid-cols-3">
            <SummaryTile label="This Month Actual" value={totalThisMonth} accent="from-primary/25" big />
            <SummaryTile label="Last Month Actual" value={totalLastMonth} accent="from-accent/20" />
            <div className="glass-card relative flex items-center gap-4 overflow-hidden rounded-2xl p-5">
              <div
                className={cn(
                  "grid h-12 w-12 place-items-center rounded-xl",
                  monthTrending ? "bg-destructive/15 text-destructive" : "bg-emerald-500/15 text-emerald-400",
                )}
              >
                {monthTrending ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">vs last month</p>
                <p className="font-display text-2xl font-semibold">
                  {monthTrending ? "+" : "−"}{Math.abs(monthDiff).toFixed(2)} {CURRENCY}
                </p>
              </div>
            </div>
          </div>

          {/* Monthly Budget Tracker */}
          <div className="glass-card rounded-3xl p-6 relative overflow-hidden">
            {/* Subtle background glow */}
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gradient-to-br from-primary/10 to-accent/10 blur-3xl" />
            
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6 relative z-10">
              <div>
                <h2 className="font-display text-xl text-lagoon font-semibold flex items-center gap-2">
                  Monthly Budget Pacing
                  <span className={cn(
                    "text-xs px-2.5 py-0.5 rounded-full font-medium border transition-colors",
                    pacingStatus === "on_track" && "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
                    pacingStatus === "high" && "bg-amber-500/10 border-amber-500/20 text-amber-400",
                    pacingStatus === "over" && "bg-destructive/10 border-destructive/20 text-destructive"
                  )}>
                    {pacingStatus === "on_track" && "On Track"}
                    {pacingStatus === "high" && "Pacing High"}
                    {pacingStatus === "over" && "Overspending"}
                  </span>
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Active plan: <span className="font-semibold text-foreground">{monthlyBudget.toFixed(2)} {CURRENCY}</span>
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={() => setIsViewPlanOpen(true)}
                  className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 gap-2 shrink-0 h-9"
                  variant="outline"
                  size="sm"
                >
                  <Percent className="h-4 w-4" /> View Category Plan
                </Button>
              </div>
            </div>

            {/* Progress Bar Indicator */}
            <div className="space-y-2 mb-6 relative z-10">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Spent: <strong>{totalThisMonth.toFixed(2)} {CURRENCY}</strong> ({spentPercent.toFixed(1)}%)</span>
                <span>Month Elapsed: <strong>{currentDay}/{daysInMonth} days</strong> ({elapsedPercent.toFixed(1)}%)</span>
              </div>
              
              {/* Dual Bar Container */}
              <div className="relative h-4 w-full bg-white/5 rounded-full overflow-hidden">
                {/* Target/Time progress marker indicator */}
                <div 
                  className="absolute top-0 bottom-0 w-0.5 bg-muted-foreground/60 border-l border-dashed border-background z-10"
                  style={{ left: `${elapsedPercent}%` }}
                  title={`Day ${currentDay} of the month (${elapsedPercent.toFixed(1)}%)`}
                />
                {/* Spend progress bar */}
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    pacingStatus === "on_track" && "bg-gradient-to-r from-emerald-500/80 to-teal-500/80",
                    pacingStatus === "high" && "bg-gradient-to-r from-amber-500/80 to-orange-500/80",
                    pacingStatus === "over" && "bg-gradient-to-r from-destructive/80 to-rose-500/80"
                  )}
                  style={{ width: `${Math.min(spentPercent, 100)}%` }}
                />
              </div>
              
              <div className="flex justify-between text-[10px] text-muted-foreground/65">
                <span>0.00 spent</span>
                <span>Budget limit: {monthlyBudget.toFixed(2)} {CURRENCY}</span>
              </div>
            </div>

            {/* Budgets Insights Grid */}
            <div className="grid gap-4 sm:grid-cols-3 relative z-10">
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Average Daily Spend</p>
                <p className="font-display text-2xl font-semibold mt-1 text-foreground font-sans">
                  {dailyAverage.toFixed(2)} <span className="text-xs font-normal text-muted-foreground">{CURRENCY} / day</span>
                </p>
                <p className="text-[10px] text-muted-foreground/75 mt-1.5">
                  Plan allowance is {(monthlyBudget / daysInMonth).toFixed(2)} {CURRENCY} / day
                </p>
              </div>

              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Month-End Projection</p>
                <p className="font-display text-2xl font-semibold mt-1 text-foreground font-sans">
                  {projectedTotal.toFixed(2)} <span className="text-xs font-normal text-muted-foreground">{CURRENCY}</span>
                </p>
                <p className={cn(
                  "text-[10px] mt-1.5 flex items-center gap-1 font-medium",
                  projectedDiff <= 0 ? "text-emerald-400" : "text-destructive"
                )}>
                  {projectedDiff <= 0 
                    ? `Under budget plan by ${Math.abs(projectedDiff).toFixed(2)} ${CURRENCY}`
                    : `Over budget plan by ${Math.abs(projectedDiff).toFixed(2)} ${CURRENCY}`
                  }
                </p>
              </div>

              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Remaining Safe Spend</p>
                <p className="font-display text-2xl font-semibold mt-1 text-foreground font-sans">
                  {safeSpendLimit.toFixed(2)} <span className="text-xs font-normal text-muted-foreground">{CURRENCY} / day</span>
                </p>
                <p className="text-[10px] text-muted-foreground/75 mt-1.5">
                  For the remaining {daysRemaining} days of {format(now, "MMMM")}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- TAB 3: SPEND ANALYTICS (DETAILED HISTORY & CHARTS) ----------------- */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          <div className="glass-card rounded-3xl p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-lg font-semibold text-lagoon">Expense Analytics</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Filter and visualize spending patterns</p>
              </div>

              {/* period selector pills */}
              <div className="flex rounded-lg border border-white/10 bg-white/[0.02] p-1 text-xs">
                {(["today", "week", "month", "last_month", "all"] as PeriodType[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setActivePeriod(p)}
                    className={cn(
                      "rounded px-2.5 py-1 font-medium capitalize transition",
                      activePeriod === p
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {p.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            {/* Total display card */}
            <div className="bg-gradient-to-br from-primary/10 to-accent/5 border border-white/5 rounded-2xl p-5 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Total Spent (Selected Range)</p>
                <p className="font-display text-3xl font-bold mt-1 text-foreground font-sans">
                  {totalFiltered.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">{CURRENCY}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Period Items</p>
                <p className="font-display text-xl font-medium mt-1 text-foreground">{filteredExpenses.length} transactions</p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Day-by-Day spend chart */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" /> Daily Spend History
                </h3>

                {dailySpendData.length === 0 || maxDailySpend === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-xs text-muted-foreground bg-white/[0.01]">
                    No daily transaction data found for this period.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="h-32 flex items-end gap-1.5 border-b border-white/10 pb-1">
                      {dailySpendData.map((d, index) => {
                        const barPercent = (d.total / maxDailySpend) * 100;
                        return (
                          <div 
                            key={index} 
                            className="flex-1 flex flex-col items-center group relative cursor-pointer"
                          >
                            <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-background border border-white/10 text-[10px] text-foreground font-semibold px-2 py-1 rounded shadow-md z-30 pointer-events-none whitespace-nowrap">
                              {d.fullName}: {d.total.toFixed(2)} {CURRENCY}
                            </div>
                            
                            <div 
                              className={cn(
                                "w-full rounded-t transition-all duration-500",
                                d.total > 0 ? "bg-primary/80 group-hover:bg-primary" : "bg-white/[0.02]"
                              )}
                              style={{ height: `${Math.max(barPercent, 3)}%` }}
                            />
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex justify-between px-0.5 text-[9px] font-semibold tracking-wider text-muted-foreground uppercase overflow-x-auto scrollbar-none gap-1">
                      {dailySpendData.map((d, index) => (
                        <span key={index} className="flex-1 text-center truncate">
                          {d.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Category distribution for range */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5" /> Category Share (Selected Period)
                </h3>
                {byCategory.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No category shares found for this period.</p>
                ) : (
                  <ul className="space-y-3">
                    {byCategory.map(([cat, val]) => (
                      <li key={cat}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="flex items-center gap-2">
                            <span>{categoryEmoji(cat)}</span>
                            <span className="text-foreground font-medium">{cat}</span>
                          </span>
                          <span className="text-muted-foreground">
                            {val.toFixed(2)} {CURRENCY} ({((val / totalFiltered) * 100).toFixed(0)}%)
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
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

            {/* Period Transactions List */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Transactions in selected period
              </h3>

              {filteredExpenses.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">No transactions in this period range.</p>
              ) : (
                <ul className="divide-y divide-white/5 max-h-80 overflow-y-auto scrollbar-none pr-1">
                  {filteredExpenses.map((e) => (
                    <li key={e.id} className="group flex items-center gap-3 py-2.5">
                      <div className="grid h-8 w-8 place-items-center rounded-lg bg-white/[0.04] text-sm">
                        {categoryEmoji(e.category)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-sm text-foreground">
                          {e.note || e.category}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {e.category} · {format(new Date(e.occurred_at), "MMM d, yyyy · p")}
                        </p>
                      </div>
                      <p className="font-display font-medium text-sm text-foreground font-sans">
                        {Number(e.amount).toFixed(2)} {CURRENCY}
                      </p>
                      <button
                        onClick={() => del.mutate(e.id)}
                        className="rounded p-1.5 text-muted-foreground hover:bg-white/5 hover:text-destructive group-hover:opacity-100 transition"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ----------------- TAB 4: PLANNED PURCHASES (WISHLIST) ----------------- */}
      {activeTab === "wishlist" && (
        <div className="max-w-xl mx-auto space-y-6">
          <div className="glass-card rounded-3xl p-6 space-y-4">
            <h2 className="font-display text-lg font-semibold text-lagoon">Add Planned Purchase</h2>
            <form onSubmit={handleAddWishlist} className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Item Name</label>
                <Input
                  placeholder="e.g. buy tshirt"
                  value={wishlistName}
                  onChange={(e) => setWishlistName(e.target.value)}
                  className="text-sm h-10 border-white/10 bg-white/[0.03]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Price ({CURRENCY})</label>
                  <Input
                    type="number"
                    placeholder="1000"
                    value={wishlistAmount}
                    onChange={(e) => setWishlistAmount(e.target.value)}
                    className="text-sm h-10 border-white/10 bg-white/[0.03]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Category</label>
                  <select
                    value={wishlistCategory}
                    onChange={(e) => setWishlistCategory(e.target.value)}
                    className="w-full bg-background border border-white/10 text-muted-foreground hover:text-foreground rounded-md px-3 h-10 text-sm"
                  >
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.emoji} {c.value}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <Button type="submit" className="w-full h-10 bg-lagoon text-cream hover:bg-lagoon/90 font-semibold">
                <Plus className="h-4 w-4 mr-1.5" /> Add to List
              </Button>
            </form>

            <ul className="space-y-2 pt-4 divide-y divide-white/5">
              {plannedPurchases.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No planned purchases yet.</p>
              ) : (
                plannedPurchases.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 pt-3 text-sm group">
                    <div className="min-w-0 flex-1">
                      <p className={cn("font-medium truncate", p.purchased && "line-through text-muted-foreground/60")}>
                        {p.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {categoryEmoji(p.category)} {p.category} · {p.amount} {CURRENCY}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!p.purchased ? (
                        <button
                          onClick={() => handleBuyWishlistItem(p)}
                          className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-1 rounded"
                          title="Buy item"
                        >
                          Buy
                        </button>
                      ) : (
                        <span className="text-[10px] bg-white/5 text-muted-foreground px-2 py-0.5 rounded">Bought</span>
                      )}
                      <button
                        onClick={() => handleDeleteWishlistItem(p.id)}
                        className="p-1.5 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      )}

      {/* View Budget Plan Dialog (MADE NARROWER & COMPACT) */}
      <Dialog open={isViewPlanOpen} onOpenChange={setIsViewPlanOpen}>
        <DialogContent className="border-white/10 bg-[#1e1a1d] text-foreground sm:max-w-[420px]">
          <DialogHeader className="flex flex-row items-center justify-between border-b border-white/5 pb-4">
            <div>
              <DialogTitle className="font-display text-xl text-lagoon">Monthly Budget Plan</DialogTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Total: <span className="font-bold text-foreground">{monthlyBudget.toFixed(2)} {CURRENCY}</span>
              </p>
            </div>
            <Button
              onClick={() => {
                setIsViewPlanOpen(false);
                handleOpenCategoryBudget();
              }}
              variant="outline"
              size="sm"
              className="border-white/10 bg-white/[0.03] hover:bg-white/[0.08] mr-6"
            >
              <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
            </Button>
          </DialogHeader>

          <div className="py-3 space-y-2.5 max-h-[380px] overflow-y-auto scrollbar-none">
            {EXPENSE_CATEGORIES.map((c) => {
              const limit = categoryBudgets[c.value] ?? 0;
              const actual = thisMonthExpenses
                .filter((e) => e.category === c.value)
                .reduce((sum, e) => sum + Number(e.amount), 0);
              const percent = limit > 0 ? (actual / limit) * 100 : 0;
              
              return (
                <div key={c.value} className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="flex items-center gap-1.5 font-medium">
                      <span>{c.emoji}</span> {c.value}
                    </span>
                    <span className="text-muted-foreground text-[11px]">
                      {limit > 0 ? `${limit} ${CURRENCY}` : "Uncapped"}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-300",
                          percent > 100 ? "bg-destructive" : percent > 85 ? "bg-amber-400" : "bg-primary"
                        )}
                        style={{ width: `${limit > 0 ? Math.min(percent, 100) : 0}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] text-muted-foreground/80">
                      <span>Spent: {actual.toFixed(2)} {CURRENCY}</span>
                      {limit > 0 && (
                        <span className={cn(percent > 100 ? "text-destructive font-semibold" : "")}>
                          {percent.toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          <DialogFooter className="border-t border-white/5 pt-3">
            <Button onClick={() => setIsViewPlanOpen(false)} className="w-full bg-lagoon text-cream hover:bg-lagoon/90 h-9 text-xs">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Budgets Dialog (MADE COMPACT & STACKED LIST) */}
      <Dialog open={isCategoryBudgetOpen} onOpenChange={setIsCategoryBudgetOpen}>
        <DialogContent className="border-white/10 bg-[#1e1a1d] text-foreground sm:max-w-[400px]">
          <form onSubmit={handleSaveCategoryBudgets}>
            <DialogHeader>
              <DialogTitle className="font-display text-lg text-lagoon">Monthly Budget Settings</DialogTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Configure monthly target budgets in {CURRENCY}. Set to 0 to keep uncapped.
              </p>
            </DialogHeader>

            <div className="py-3 max-h-[300px] overflow-y-auto space-y-2 px-1 scrollbar-none">
              {EXPENSE_CATEGORIES.map((c) => (
                <div key={c.value} className="flex items-center justify-between gap-4 py-1">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <span>{c.emoji}</span> {c.value}
                  </span>
                  <div className="flex items-center gap-1.5 justify-end">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={tempCategoryBudgets[c.value] || ""}
                      onChange={(e) => setTempCategoryBudgets({
                        ...tempCategoryBudgets,
                        [c.value]: e.target.value
                      })}
                      className="w-24 h-8 text-right bg-white/[0.04] border-white/10 text-sm"
                      placeholder="0"
                    />
                    <span className="text-[10px] text-muted-foreground">{CURRENCY}</span>
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter className="gap-2 pt-3 border-t border-white/5">
              <Button type="button" variant="outline" onClick={() => setIsCategoryBudgetOpen(false)} className="h-9 text-xs border-white/10 bg-white/[0.04] hover:bg-white/10 text-muted-foreground hover:text-foreground">
                Cancel
              </Button>
              <Button type="submit" className="h-9 text-xs bg-lagoon text-cream hover:bg-lagoon/90">
                Save Plan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
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
      <p className={cn("mt-2 font-display tabular-nums font-semibold", big ? "text-4xl text-gradient-primary" : "text-3xl")}>
        {value.toFixed(2)} {CURRENCY}
      </p>
    </div>
  );
}
