# Autofocus

Autofocus is a productivity system that helps you stay focused and on track. It's a simple yet powerful tool that helps you manage your tasks and prioritize your work. This project is a web application that implements the Autofocus system with additional productivity features.

---

# Features

## Task Management (AF4 System)

- **Single-list workflow** with page-based navigation (12 tasks per page)
- **Working task panel** with live timer (start / pause / resume / stop)
- **Task tags** with filter bar — customizable in `src/lib/tags.ts`
- **Task notes** — add context and achievements during work sessions
- **Sidequest tracking** — log mini-tasks completed during main task sessions
- **Completed tasks view** with three display modes:
  - Default: grouped by date and time of day (morning/afternoon/evening)
  - Bullet Journal: chronological log with activity logging
  - 7-Day View: week-at-a-glance grid
- **Task search** in both active and completed views
- **Export functionality** — export tasks to JSON, CSV, or Markdown
- **Mobile-optimized** with swipe-to-reveal action tray
- **Drag-and-drop** task reordering

## Habit Tracking

- **Daily habit check-ins** with streak tracking
- **Category organization** (Health, Productivity, Learning, Mindfulness, Social, Creative)
- **Frequency targets** — set weekly goals (e.g., 3x/week, 5x/week)
- **Progress visualization** — current streak and weekly completion stats
- **66-day habit formation** tracking
- **Export habits** to JSON, CSV, or Markdown

## Project Management

- **Project dashboard** with status tracking (Planning, Active, On Hold, Completed, Archived)
- **Priority levels** (High, Medium, Low)
- **Progress tracking** with percentage completion
- **Category organization** (Work, Personal, Learning, Health, Creative, Finance, Social)
- **Due dates** and key outcomes tracking
- **Detailed notes** and descriptions
- **Export projects** to JSON, CSV, or Markdown

## Book Tracking

- **Reading list** organized by domain (Fiction, Non-Fiction, Technical, Business, Self-Help, Philosophy, Science, History, Biography)
- **Reading progress** tracking (page numbers and percentages)
- **Priority system** for reading queue
- **Status management** (To Read, Reading, Completed, Paused, DNF)
- **Rating system** (1-5 stars)
- **Notes and key takeaways** capture
- **Dashboard view** with reading statistics
- **Export books** to JSON, CSV, or Markdown

## Second Brain Integration

- **Quick-links panel** with Notion integration
- **Customizable pamphlets** — organize links by category
- **One-click access** to external resources

## Theming & Customization

- **Multiple themes**: Light, Dark, Golden Twilight, Mossy Woods
- **Custom fonts**: Geist Mono, Rubik, IBM Plex Mono, Literata, DM Sans, Playfair Display
- **Responsive design** — works seamlessly on desktop, tablet, and mobile

## Data Persistence

- **Supabase backend** — all data syncs across devices in real-time
- **Offline-capable** with SWR caching
- **Row-level security** for authenticated users

---

# Why I Built It?

I built Autofocus because I wanted to create a tool that helps me stay focused and productive. I found that traditional task management systems can be overwhelming and distracting, so I wanted to create a simple and intuitive tool that helps me stay on track.

I also wanted to create a tool that is customizable to my needs. Autofocus allows me to prioritize my tasks and tag them in a way that makes sense to me. It also provides a comprehensive task history so that I can see what I've done in the past and learn from it.

Beyond tasks, I needed a unified system to track habits, manage projects, and organize my reading list — all in one place. Autofocus is a complete productivity suite that helps me stay focused, productive, and organized across all areas of my life.

---

# Tech Stack

- **Next.js 16** — React framework with App Router and Turbopack
- **React 19** — UI library with latest features
- **TypeScript 5.7** — Type-safe development
- **Tailwind CSS 4** — Utility-first styling
- **Radix UI** — Accessible, modular UI components
- **Lucide Icons** — Beautiful open-source icons
- **DND Kit** — Drag-and-drop functionality
- **SWR** — Data fetching and caching
- **Date-fns** — Date manipulation
- **Supabase** — Backend, database, and real-time sync
- **Framer Motion** — Smooth animations
- **Sonner** — Toast notifications
- **Class Variance Authority** — Component variant management
- **Vercel Analytics** — Performance monitoring

---

## Setup

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) account (free tier is fine)

---

### Step 1 — Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **New Project**
3. Choose your organization, name the project (e.g. `af4-autofocus`), pick a region close to you, and set a database password — save this somewhere safe
4. Wait for the project to finish provisioning (~1 minute)

---

### Step 2 — Run the database schema

1. In your Supabase project dashboard, click **SQL Editor** in the left sidebar
2. Click **New query**
3. Copy and paste the entire contents of `scripts/create_tables.sql` into the editor
4. Click **Run** (or `Cmd+Enter` / `Ctrl+Enter`)
5. You should see `Success. No rows returned` — tables and indexes are now created

---

### Step 3 — Get your Supabase credentials

1. In your Supabase project, go to **Settings → API**
2. Copy two values:
   - **Project URL** — looks like `https://xxxx.supabase.co`
   - **Anon/public key** — a long JWT string

---

### Step 4 — Configure environment variables

In the root of the project, create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

---

### Step 5 — Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

### Step 6 — Verify

1. Add a task — it should appear instantly
2. Complete a task — it should move to the Completed view
3. Refresh the page — all data should persist
4. Open the app on another device — data should be in sync

---

## Customization

### Adding New Tags

Tags are defined in `src/lib/tags.ts`:

```typescript
export const TAG_DEFINITIONS = [
	{ id: "read" as const, label: "to Read", emoji: "📚" },
	{ id: "learn" as const, label: "to Learn", emoji: "🎓" },
	{ id: "finish" as const, label: "to Finish", emoji: "📋" },
	{ id: "watch" as const, label: "to Watch", emoji: "👀" },
] as const;
```

The `tag` column in Supabase has no `CHECK` constraint — TypeScript enforces valid values. Just add the entry to `TAG_DEFINITIONS` and everything (picker, filter, pill) updates automatically.

---

### Customizing Themes

Themes are configured in `app/layout.tsx`. The app includes four built-in themes:

- **Light** — Clean, minimal light theme
- **Dark** — Easy on the eyes dark theme
- **Golden Twilight** — Warm, sunset-inspired palette
- **Mossy Woods** — Natural, earthy tones

Switch themes from the settings panel in the app.

---

## Data Management

### Exporting Data

Export your data from the app's export panel:

- **Tasks** — Export active and completed tasks
- **Full Suite** — Export tasks, habits, projects, and books together
- **Formats** — JSON (structured data), CSV (spreadsheet), or Markdown (readable)

### Resetting All Data

To wipe all tasks and reset app state, run this in the Supabase SQL Editor:

```sql
DELETE FROM tasks;
UPDATE app_state
SET current_page = 1,
    working_on_task_id = NULL,
    session_start_time = NULL,
    timer_state = 'idle',
    current_session_ms = 0
WHERE id = '00000000-0000-0000-0000-000000000001';
```

---

## Troubleshooting

**App shows "Loading..." and never loads**

- Check your `.env.local` credentials are correct and the file is saved
- Check your Supabase project is not paused — free tier projects pause after 1 week of inactivity, unpause from the Supabase dashboard

**Tasks not persisting after refresh**

- Confirm the SQL schema ran without errors in the Supabase SQL Editor
- Check the browser console for Supabase error messages

**Timer appears frozen**

- The app polls `app_state` every second — check your network connection

**"violates check constraint" error when assigning a tag**

- Your Supabase project has an old schema with a `CHECK` constraint on the `tag` column
- Fix: run this in the SQL Editor:

```sql
ALTER TABLE tasks DROP CONSTRAINT tasks_tag_check;
```

---

## Deployment

The app deploys to [Vercel](https://vercel.com) without any configuration changes:

1. Push the repo to GitHub
2. Import the project on Vercel
3. Add the two environment variables (`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`) in Vercel's project settings
4. Deploy

The same `.env.local` variables work in Vercel's environment variable settings.

---

## License

MIT
