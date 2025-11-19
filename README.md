<h1 align="center">📚 githubers-SOEN341_Project_F25</h1>
<p align="center">
A collaborative campus events and ticketing web application built by our team for SOEN341.
</p>


## 👥 Team Information

| **Name**            | **Student ID** | **GitHub Username** |
|---------------------|----------------|---------------------|
| Gunkeet Mutiana     | 40226566       | [@keetsm1](https://github.com/keetsm1) |
| Ranjit Singh Dhunna | 40294791       | [@Ranjit-Singh-Dhunna](https://github.com/Ranjit-Singh-Dhunna) |
| Arnav Singh         | 40258921       | [@arnav-singh-ahlawat](https://github.com/arnav-singh-ahlawat) |
| Kevin Tam           | 40317186       | [@kevintam20504](https://github.com/kevintam20504) |
| Saad Asghar         | 40157825       | [@4kbooka](https://github.com/4kbooka) |
| Lorne Geniele       | 40111396       | [@hotplate5](https://github.com/hotplate5) |
| Wijdane Khamali     | 40282056       | [@WiwiKiwi20](https://github.com/WiwiKiwi20) |


---

:pushpin:**Description**
---
This project is a Campus Events & Ticketing Web Application designed to help students discover, organize, and attend events on campus. The system streamlines event management by allowing students to browse events, claim tickets, and check in with QR codes. Organizers can create and manage events while tracking attendance through dashboards, and administrators oversee organizations, moderate event listings, and access global analytics.


This document is the single source of truth for cloning, configuring, testing, and running the Sprint 4 deliverable of `squad-events-pro`. Follow the steps in order; no additional tribal knowledge is required.

---

## 1. Prerequisites

- **OS:** macOS, Linux, or WSL2
- **Node.js:** 20.x (ships with npm 10) – use `nvm use 20` if available
- **Python:** 3.11+ (for scripted test cases)
- **Supabase account:** project owner or developer-level access
- **Git:** 2.40+

Optional but recommended:

- **Supabase CLI** (`brew install supabase/tap/supabase`) for seeding and running SQL locally.

---

## 2. Clone & Repo Layout

```bash
git clone https://github.com/<org>/githubers-SOEN341_Project_F25.git
cd githubers-SOEN341_Project_F25
```

Relevant directories:

- `Sprint4/squad-events-pro/` – React + Vite frontend (uses Supabase).
- `Sprint4/squad-events-pro/db/` – SQL scripts for database schema & RPCs.
- `Sprint4/squad-events-pro/test-cases/` – Python-based high-level regression scripts.

---

## 3. Environment Variables

Create `Sprint4/squad-events-pro/.env.local` (Vite auto-loads `.env.local`, `.env`) with:

```
VITE_SUPABASE_URL=<https://YOUR_PROJECT.supabase.co>
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

| Variable | Description | Source |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | REST URL for your Supabase project | Supabase Dashboard → Project Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Public anon key with Row Level Security rules applied | Same as above |

> Keep secrets out of commits. Copy `.env.local` from the provided template and never push it.

Sample file:

```
VITE_SUPABASE_URL=https://abc123.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 4. Backend (Supabase) Setup

1. **Create/Select Project:** In Supabase, create a new project or reuse an existing dev project.
2. **Run Schema SQL:** From the dashboard SQL editor (or Supabase CLI), run the script `Sprint4/squad-events-pro/db/create_payments_and_rpc.sql`.
   ```bash
   supabase db execute --file Sprint4/squad-events-pro/db/create_payments_and_rpc.sql
   ```
3. **Auth & RLS:** Ensure the default policies allow authenticated requests for `profiles`, `events`, `companies`, etc. The app expects RLS enabled with Supabase-authenticated users.
4. **Storage (Optional):** If event images are required, create a bucket named `event-images` and allow public read + authenticated write.
5. **Copy API Keys:** Grab the anon key & URL from Project Settings → API and paste into `.env.local`.

---

## 5. Frontend Setup

```bash
cd Sprint4/squad-events-pro
npm install
npm run dev
```

The Vite dev server defaults to `http://localhost:5173`. The app will automatically connect to the Supabase instance referenced in `.env.local`.

Key dependencies (managed via `package.json`):

- React 18 + TypeScript 5, Vite 5, Tailwind CSS 3
- shadcn/ui + Radix UI primitives
- TanStack Query, React Router DOM, Supabase JS SDK, Recharts

---

## 6. Running Tests & Quality Checks

| Layer | Command | Notes |
| --- | --- | --- |
| Frontend lint | `npm run lint` | ESLint rules for React/TypeScript |
| Scenario scripts | `cd test-cases && python3 master.py` | Executes student/company flows end-to-end via mocked APIs |

The `master.py` harness will run:

```bash
python3 Sprint4/squad-events-pro/test-cases/master.py
```

Ensure your Python environment has `requests` installed if any script imports it (`pip install -r requirements.txt` if present or `pip install requests`).

---

## 7. Local Deployment (Prod-like)

1. Build static assets:
   ```bash
   cd Sprint4/squad-events-pro
   npm run build
   ```
2. Preview the production build (uses the same `.env.local` values):
   ```bash
   npm run preview -- --host
   ```
3. For containerized deploys, serve the `dist/` folder via any static host (Netlify, Vercel, Nginx) and expose the same Supabase env vars.

---

## 8. Troubleshooting Tips

- **Blank screen / 401 errors:** Verify the Supabase URL & anon key match the project you seeded.
- **Migrations fail:** Confirm you’re targeting the correct Supabase project; rerun the SQL script.
- **Python tests cannot find modules:** Run them from the `test-cases` folder or pass `PYTHONPATH` accordingly.
- **Port conflicts:** Override the Vite dev port with `npm run dev -- --port 5174`.

---

## 9. Next Steps

- Keep `.env.local` updated per environment (dev, staging, prod).
- Commit documentation updates alongside code changes each sprint.
- Share this README with new collaborators to ensure consistent onboarding.



:pushpin:**Core Features**
---
1. Student Event Experience
   - Browse & Search for Events
   - Event Management : Save events, claim tickets, receive tickets with QR Codes.

2. Organizer Event Management
   - Event Creation: title, description, date/time, location, ticket capacity, ticket type (free or paid).
   - Event Analytics: tickets issued, attendance rates, and remaining capacity.
   - Tools: Export attendee list as CSV, integrated QR Scanner

3. Administrator Dashboard & Moderation
   - Platform oversight
   - View global stats
   - Manage Organizations

:pushpin: **Tech Stack**
---

### Frontend
- **Framework:** React 18.3.1 + TypeScript 5.8.3  
- **Build Tool:** Vite 5.4.19  
- **UI Framework:** shadcn/ui with Radix UI components  
- **Styling:** Tailwind CSS 3.4.17  
- **Forms:** React Hook Form 7.61.1 + Zod validation  
- **Charts:** Recharts 2.15.4  
- **Routing:** React Router DOM 6.30.1  
- **State Management:** React Context + TanStack Query  

### Backend
- **Platform:** Supabase (PostgreSQL + Auth)  

### Key Directories
- `src/pages/` – 15 pages (11 main + 4 admin)  
- `src/components/` – 50+ reusable UI components  
- `src/services/` – Database service layer  
- `src/contexts/` – AuthContext for authentication  
- `src/hooks/` – Custom React hooks  

### Database Tables
1. **profiles** – User profiles with roles  
2. **companies** – Company/organization records  
3. **events** – Event listings  
4. **friendships** – Friend relationships  
5. **friend_requests** – Pending friend requests  
6. **starred_events** – User-starred events  
7. **organizations** – Approved organizations

---


## 📄 Documentation Index

- [Student User Guide](Sprint4/docs/student_user_guide.md)
- [Organizer User Guide](Sprint4/docs/organizer_user_guide.md)
- [Admin User Guide](Sprint4/docs/admin_user_guide.md)
- [Deployment Guide](Sprint4/docs/deployment_guide.md)
- [User Manual (All Roles)](Sprint4/docs/user_manual.md)
- [Ticket Lifecycle](Sprint4/docs/ticket_lifecycle.md)
- [Wiki Home Draft](Sprint4/docs/wiki_home.md)
- [Coding Style & Naming Conventions](styANDCONV.md)


---
![Logo](https://upload.wikimedia.org/wikipedia/fr/9/97/Universit%C3%A9_Concordia_%28logo%29.svg)



