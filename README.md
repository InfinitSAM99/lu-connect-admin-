# LU CONNECT — Admin App

Administration dashboard for **LU CONNECT** — the university social network for students.

## What this is

A separate React application that lets authorized administrators manage the LU CONNECT platform:

- **Dashboard** — live platform statistics
- **Students** — search, verify, suspend student accounts
- **Posts** — moderate and delete posts
- **Comments** — moderate and delete comments
- **Reports** — review and resolve user reports
- **Announcements** — create, edit, publish, pin announcements
- **Events** — create and manage university events
- **Groups** — review and manage communities
- **Payments** — approve M-Pesa submissions (verification, followers, boosts)
- **Analytics** — signup and engagement charts
- **Admins** — manage admin roles (super admin only)
- **Audit Logs** — track all privileged actions

## Related apps

- **Student App:** [github.com/InfinitSAM99/lu-connect-student-](https://github.com/InfinitSAM99/lu-connect-student-)
- **Shared backend:** Supabase (Postgres + Auth + Storage + Realtime + RLS)

## Tech stack

- React 18
- Vite 5
- Supabase JS v2
- React Router v6
- Pure CSS with design tokens (light + dark theme)

## Quick start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase project values:
#   VITE_SUPABASE_URL=https://your-project.supabase.co
#   VITE_SUPABASE_PUBLISHABLE_KEY=your-key

# Start the dev server
npm run dev -- --host --port 5174
