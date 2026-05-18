# Custom Form Builder — Technical Notes

This document explains what we built the project with, where those pieces live in the codebase, and why we picked them. It follows the SRS stack: **React + TypeScript + Redux Toolkit** on the front, **Node.js + Express + MySQL** on the back.

---

## Quick picture

The app is split into two folders:

- **`frontend/`** — everything the user sees (admin panel, form builder, public forms)
- **`backend/`** — REST API, database access, login, file uploads

Locally you run the UI on port **5173** and the API on **3001**. Vite forwards `/api` and `/uploads` to the backend so you do not have to fight CORS during development.

On production (e.g. CloudPanel), the built React files usually sit in the site root, and nginx sends only `/api` and `/uploads` to Node — or you can let Express serve the static files with `SERVE_STATIC=true`.

---

# Backend

## What we used

| Tool | Role |
|------|------|
| **Node.js + TypeScript** | Runs the API; types help catch mistakes early |
| **Express** | Routes and middleware (`/api/login`, `/api/forms`, etc.) |
| **Prisma + MySQL** | Database models and queries |
| **bcrypt** | Hash passwords — never store plain text |
| **JWT** | Login tokens for the admin panel |
| **Zod** | Validate request bodies before hitting the DB |
| **Multer** | File uploads (form files + profile avatars) |
| **express-rate-limit** | Slow down spam on public form submit |
| **cors + dotenv** | Allow the React app to call the API; keep secrets in `.env` |

## Folder layout (`backend/`)

```
backend/
├── prisma/
│   ├── schema.prisma    # tables: users, forms, fields, submissions...
│   └── seed.ts          # default admin + sample "Contact Us" form
├── src/
│   ├── index.ts         # starts the server
│   ├── app.ts           # wires routes + middleware
│   ├── routes/          # auth, forms, public, submissions, dashboard, profile
│   ├── services/        # validation + form helpers
│   ├── middleware/      # JWT check, error handler
│   └── lib/             # prisma client, slug helper
├── uploads/             # uploaded files on disk
└── .env                 # DATABASE_URL, JWT_SECRET, PORT, etc.
```

## Main API routes

| Path | File | What it does |
|------|------|----------------|
| `POST /api/login`, `POST /api/logout`, `GET /api/me` | `routes/auth.ts` | Admin login |
| `GET/PUT /api/profile` | `routes/profile.ts` | Name, email, password, avatar |
| `GET /api/dashboard/stats` | `routes/dashboard.ts` | Dashboard numbers + chart data |
| `/api/forms` CRUD + duplicate | `routes/forms.ts` | Manage forms |
| `/api/forms/:id/submissions` | `routes/submissions.ts` | View, search, filter, export CSV |
| `GET/POST /api/public/forms/:slug` | `routes/public.ts` | Public form (no login) |
| `/uploads/*` | static in `app.ts` | Serve uploaded files |

## Database (Prisma models)

Matches the SRS tables:

- **users** — admin accounts  
- **forms** — title, slug, draft/published  
- **form_fields** — each input on a form (type, label, validation JSON)  
- **form_submissions** — one row per submit  
- **submission_values** — actual answers (field name + value)  
- **revoked_tokens** — used when someone logs out (JWT invalidation)

Setup commands:

```bash
cd backend
npm install
npx prisma db push
npm run db:seed
```

Default seed login: `admin@example.com` / `admin123`

## Why these backend choices?

- **Express** — simple, well documented, enough for our REST API.  
- **Prisma** — schema in one file, type-safe queries, easy `db push` on Laragon/MySQL.  
- **JWT** — works naturally with a React SPA (`Authorization: Bearer` header).  
- **Zod** — login and form save payloads are validated in one place.  
- **Validation service** — same rules on the server as the browser (required, email, min/max, files) so users cannot bypass checks.

Typical flow when someone submits a public form:

1. Request hits `public.ts`  
2. Rate limiter runs  
3. Multer handles files if any  
4. `validation.ts` checks all fields  
5. Rows inserted in `form_submissions` + `submission_values`

---

# Frontend

## What we used

| Tool | Role |
|------|------|
| **React 19 + TypeScript** | Pages and components |
| **Vite** | Dev server + production build |
| **Redux Toolkit** | Shared state (user, forms, builder, submissions) |
| **React Router** | `/login`, `/dashboard`, `/forms/...`, `/f/:slug` |
| **Tailwind CSS** | Styling (sidebar, cards, forms) |
| **@dnd-kit** | Drag-and-drop in the form builder |

## Folder layout (`frontend/src/`)

```
src/
├── main.tsx, App.tsx       # entry + routes
├── api/client.ts           # fetch + JWT token in sessionStorage
├── store/slices/           # auth, forms, builder, submissions
├── pages/                  # Login, Dashboard, Forms, Builder, Submissions, Profile, Public
├── components/
│   ├── layout/             # AdminLayout, header, user menu
│   ├── builder/            # field palette, settings, validation rules
│   ├── form/FieldInput.tsx # renders each field type on public forms
│   └── dashboard/          # submissions chart
└── utils/                  # conditional fields + client validation
```

## Pages and routes

| URL | Page | Who uses it |
|-----|------|-------------|
| `/login` | Login | Admin |
| `/dashboard` | Stats, forms list, chart | Admin |
| `/forms` | List / create / delete forms | Admin |
| `/forms/:id/edit` | Drag-and-drop builder | Admin |
| `/forms/:id/submissions` | View + filter + export | Admin |
| `/profile` | Update profile | Admin |
| `/f/:slug` | Live public form | Anyone (no login) |

`ProtectedRoute` sends guests to `/login` if there is no token.

## Redux slices (short)

- **authSlice** — login, logout, current user, profile update  
- **formsSlice** — list of forms, load/save/delete  
- **builderSlice** — fields on the canvas while editing (saved with PUT)  
- **submissionsSlice** — table data, search, date filters  

API calls go through `api/client.ts`, which attaches the JWT from `sessionStorage`.

## Why these frontend choices?

- **Vite** — fast refresh while building UI.  
- **Redux Toolkit** — required by SRS; several screens share the same form/user data.  
- **@dnd-kit** — drag-and-drop for reordering fields without a heavy library.  
- **Tailwind** — quick layout for admin sidebar + mobile-friendly public forms.  
- **fieldValidation.ts** — instant errors on public forms before POST.

Builder save flow: edit fields in Redux → click Save → `PUT /api/forms/:id` with full `fields[]` array → backend replaces `form_fields` in a transaction.

---

# How front and back talk

```
Browser (React)
    → fetch /api/...
        → Express (port 3001)
            → Prisma → MySQL
```

| Topic | Backend | Frontend |
|-------|---------|----------|
| Login | bcrypt + JWT | token in sessionStorage |
| Form design | saved in `form_fields` | builder UI → PUT request |
| Public form | `GET/POST /api/public/...` | `PublicFormPage` + `FieldInput` |
| Files | saved under `uploads/` | `<input type="file">` + FormData |

---

# Environment variables (backend `.env`)

```env
DATABASE_URL="mysql://user:pass@127.0.0.1:3306/dbname"
JWT_SECRET="long-random-string"
JWT_EXPIRES_IN="24h"
CORS_ORIGIN="https://your-domain.com"
PORT=3001
UPLOAD_DIR="./uploads"
SERVE_STATIC=true   # only if nginx proxies everything to Node
```

---

# Build commands

**Development**

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

**Production**

```bash
cd backend && npm run build && pm2 start dist/index.js --name form-builder-api
cd frontend && npm run build
# copy frontend/dist/* to site web root
```

More detail for CloudPanel: see `DEPLOY_CLOUDPANEL.md`.

---

# SRS checklist (where it lives)

| Requirement | Backend | Frontend |
|-------------|---------|----------|
| Login / logout | `routes/auth.ts` | `LoginPage`, `authSlice` |
| Dashboard | `routes/dashboard.ts` | `DashboardPage` |
| Form CRUD | `routes/forms.ts` | `FormsPage` |
| Drag-and-drop builder | saves `form_fields` | `FormBuilderPage`, dnd-kit |
| Public form + submit | `routes/public.ts` | `PublicFormPage` |
| Submissions + CSV | `routes/submissions.ts` | `SubmissionsPage` |
| Validations | `services/validation.ts` | `ValidationSettings`, `fieldValidation.ts` |

---

*Written for the Custom Form Builder SRS project — React + Node + MySQL.*
