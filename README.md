# LifePulse

**LifePulse** is your personal all-in-one life dashboard — a quiet, beautiful workspace where you can organize your thoughts, plan your days, and stay on top of what matters.

---

## What is LifePulse?

LifePulse brings together everything you need to manage your daily life in one calm, elegant place:

- **Sticky Notes** — Colorful draggable notes for quick thoughts and ideas
- **Notebooks** — Nested, richly formatted pages for deeper writing and documentation
- **Task Board** — A Kanban-style board to organize tasks across Today, All Tasks, and Done
- **Calendar** — A visual calendar to plan and view upcoming events
- **Expense Tracker** — Log spending, set category budgets, and visualize your financial patterns
- **Music & Focus** — Search and play YouTube music or ambient sounds without leaving the app
- **AI Assistant** — A context-aware AI chat powered by Gemini that knows your tasks, notes, events, and spending — like a brilliant personal friend

---
<img width="1345" height="610" alt="image" src="https://github.com/user-attachments/assets/057e7806-8b7f-44b7-b857-ab47fa00923c" />
<img width="1354" height="611" alt="image" src="https://github.com/user-attachments/assets/875509d1-775b-40de-9dde-db2cf456ee40" />
<img width="1349" height="597" alt="image" src="https://github.com/user-attachments/assets/aac0a8e2-cedf-427d-b23c-b092cba2232a" />
<img width="1352" height="597" alt="image" src="https://github.com/user-attachments/assets/7733735c-5aa9-4a34-ab58-8fac36620cc2" />
<img width="1358" height="605" alt="image" src="https://github.com/user-attachments/assets/9842a793-59bd-43bd-88f2-f7ef5fc488ba" />
<img width="1348" height="616" alt="image" src="https://github.com/user-attachments/assets/c794cb35-4017-47dd-ab14-2b7b7c775bae" />
<img width="1349" height="608" alt="image" src="https://github.com/user-attachments/assets/b89042f4-f14a-4cbd-922a-220f9e47f721" />







## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + TypeScript (Vite) |
| Routing | TanStack Router |
| Styling | Tailwind CSS + custom design tokens |
| Backend | ASP.NET Core (.NET 9) |
| Database | PostgreSQL via Entity Framework Core |
| Auth | JWT + Google OAuth |
| AI | Google Gemini API |

---

## Getting Started

### Prerequisites

- Node.js 18+
- .NET 9 SDK
- PostgreSQL database

### 1. Clone the repository

```bash
git clone https://github.com/your-username/lifepulse.git
cd lifepulse
```

### 2. Set up environment variables

Create a `.env` file in the project root:

```env
VITE_API_URL=http://localhost:5000
VITE_GEMINI_API_KEY=your_gemini_api_key
```

Create `backend/LifeOS.Api/appsettings.Development.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Database=lifepulse;Username=your_user;Password=your_password"
  },
  "Jwt": {
    "Secret": "your_jwt_secret_key"
  },
  "Google": {
    "ClientId": "your_google_client_id",
    "ClientSecret": "your_google_client_secret"
  }
}
```

### 3. Run the backend

```bash
cd backend/LifeOS.Api
dotnet run
```

The API will be available at `http://localhost:5000`.

### 4. Run the frontend

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

---

## Project Structure

```
lifepulse/
├── src/                        # React frontend
│   ├── components/             # Shared UI components
│   │   ├── ai-chat/            # Gemini AI chat panel
│   │   └── app-shell.tsx       # Main layout with sidebar and nav
│   ├── routes/                 # Page routes (TanStack Router)
│   │   ├── _authenticated/     # Protected pages
│   │   │   ├── dashboard.tsx
│   │   │   ├── tasks.tsx
│   │   │   ├── calendar.tsx
│   │   │   ├── sticky.tsx
│   │   │   ├── notebooks.tsx
│   │   │   ├── expenses.tsx
│   │   │   └── music.tsx
│   │   ├── auth.tsx            # Sign in / Sign up
│   │   └── index.tsx           # Landing page
│   ├── hooks/                  # React Query data hooks
│   ├── integrations/api/       # API client
│   └── lib/                    # Utilities, types, Gemini config
├── backend/LifeOS.Api/         # ASP.NET Core backend
│   ├── Controllers/            # REST API endpoints
│   ├── Data/                   # EF Core DbContext and migrations
│   └── Program.cs              # App entry point
└── README.md
```

---

