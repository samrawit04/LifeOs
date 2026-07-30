import type { Item, Expense } from "@/lib/lifeos-types";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

function buildSystemPrompt(items: Item[], expenses: Expense[]): string {
  const now = new Date();
  const active = items.filter((i) => !i.archived);

  const tasks =
    active
      .filter((i) => i.type === "task" && !i.completed)
      .map(
        (t) =>
          `- ${t.title ?? "Untitled"}${t.due_date ? ` (due ${t.due_date.slice(0, 10)})` : ""}${t.priority ? ` [${t.priority} priority]` : ""}`,
      )
      .join("\n") || "No open tasks.";

  const events =
    active
      .filter((i) => i.type === "event" && i.event_date && new Date(i.event_date) >= now)
      .sort((a, b) => (a.event_date! < b.event_date! ? -1 : 1))
      .slice(0, 10)
      .map((e) => `- ${e.title ?? "Untitled"} on ${e.event_date?.slice(0, 10)}`)
      .join("\n") || "No upcoming events.";

  const notes =
    active
      .filter((i) => i.type === "sticky")
      .slice(0, 8)
      .map((n) => `- ${n.title ? `[${n.title}] ` : ""}${(n.content ?? "").slice(0, 120)}`)
      .join("\n") || "No sticky notes.";

  const notebooks =
    active
      .filter((i) => i.type === "notebook_page")
      .slice(0, 5)
      .map((p) => `- ${p.title ?? "Untitled"}: ${(p.content ?? "").slice(0, 150)}`)
      .join("\n") || "No notebook pages.";

  const expenseMap: Record<string, number> = {};
  for (const e of expenses) {
    expenseMap[e.category] = (expenseMap[e.category] ?? 0) + e.amount;
  }
  const expenseSummary = Object.entries(expenseMap).length
    ? Object.entries(expenseMap)
        .sort((a, b) => b[1] - a[1])
        .map(([cat, total]) => `- ${cat}: ${total.toFixed(2)} ${expenses[0]?.currency ?? ""}`)
        .join("\n")
    : "No expenses recorded.";

  const recentExpenses =
    expenses
      .slice(0, 5)
      .map(
        (e) =>
          `- ${e.category}: ${e.amount} ${e.currency}${e.note ? ` (${e.note})` : ""} on ${e.occurred_at.slice(0, 10)}`,
      )
      .join("\n") || "No recent expenses.";

  return `You are a warm, empathetic, and insightful life assistant built into LifePulse — a personal productivity app. Today is ${now.toDateString()}.

You have full access to the user's personal data. Use it naturally to give personalized advice. Reference specific tasks, events, or spending patterns when relevant — but don't dump all the data at the user; weave it in conversationally.

You can help with absolutely anything: relationship advice, emotional support, budgeting tips, life planning, goal-setting, stress management, career decisions, or just a friendly chat.

Be warm, concise, and human. Avoid bullet-point walls unless the user explicitly asks for a list. Speak like a brilliant friend, not a corporate assistant.

--- USER'S CURRENT DATA ---

**Open Tasks:**
${tasks}

**Upcoming Events:**
${events}

**Sticky Notes (recent):**
${notes}

**Notebook Pages (recent):**
${notebooks}

**Spending by Category (all time):**
${expenseSummary}

**Recent Expenses:**
${recentExpenses}

---

Remember: You know the user's life. Make them feel heard, understood, and supported.`;
}

export type ChatMessage = {
  role: "user" | "model";
  text: string;
};

export class LifePulseChat {
  private history: ChatMessage[] = [];

  constructor(
    private items: Item[],
    private expenses: Expense[],
  ) {}

  async send(userMessage: string): Promise<string> {
    if (!API_KEY) {
      throw new Error("VITE_GEMINI_API_KEY is not set. Please add it to your .env file and restart the dev server.");
    }

    // Add user message to history
    this.history.push({ role: "user", text: userMessage });

    // Format history for the REST API
    const contents = this.history.map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.text }],
    }));

    // Using active free-tier model aliases (gemini-flash-latest and gemini-flash-lite-latest)
    const models = ["gemini-flash-latest", "gemini-flash-lite-latest", "gemini-2.0-flash"];
    let lastError: Error | null = null;

    for (const model of models) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;

      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents,
            systemInstruction: {
              parts: [{ text: buildSystemPrompt(this.items, this.expenses) }],
            },
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          const errMsg = errData?.error?.message || `HTTP ${res.status} ${res.statusText}`;

          if (res.status === 429 || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("Quota")) {
            console.warn(`[Gemini] ${model} hit rate limit (429), trying fallback model...`);
            lastError = new Error(
              "Gemini API rate limit reached. Free-tier keys allow 15 requests/minute and 1,500/day. " +
              "Please wait a minute and try again, or get a fresh API key from https://aistudio.google.com/app/apikey " +
              "(make sure the key starts with 'AIza' — that is the correct Google AI Studio format)."
            );
            continue;
          }

          // Non-quota error — throw immediately with the original message
          this.history.pop();
          throw new Error(errMsg);
        }

        const data = await res.json();
        const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!replyText) {
          this.history.pop();
          throw new Error("No response content received from Gemini.");
        }

        this.history.push({ role: "model", text: replyText });
        return replyText;
      } catch (err) {
        if (err instanceof Error && (err.message.includes("rate limit") || err.message.includes("429") || err.message.includes("Quota"))) {
          lastError = err;
          continue;
        }
        this.history.pop();
        throw err;
      }
    }

    // All models exhausted their quota
    this.history.pop();
    throw lastError || new Error("Gemini API request failed. Check your VITE_GEMINI_API_KEY in .env.");
  }

  reset() {
    this.history = [];
  }
}
