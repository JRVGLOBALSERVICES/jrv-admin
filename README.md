# JRV Admin

A lightweight admin panel built with Next.js (App Router), TypeScript, Tailwind CSS, Supabase (auth + DB), and Cloudinary for image uploads.

This README explains how to get started locally, which environment variables are required, how authentication and roles work, where to find key parts of the codebase, and deployment notes.

---

## Contents

- Quick Start
- Environment variables
- Project structure (important files)
- Authentication & roles
- Uploads
- Development notes & commands
- Deployment
- Troubleshooting & tips
- Useful links

---

## Quick Start

1. Install dependencies

```bash
npm install
```

2. Create a file `.env.local` in the project root (see "Environment variables" below).

3. Run the development server:

```bash
npm run dev
# Open http://localhost:3000
```

4. Build for production:

```bash
npm run build
npm start
```

5. Lint (ESLint):

```bash
npm run lint
```

---

## Environment variables

The app uses Supabase and Cloudinary. Keep secret keys out of version control.

Create `.env.local` and populate:

```env
# Public Supabase client (safe to expose to client)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=public-anon-key

# Server-only Supabase service role key (DO NOT expose to client)
SUPABASE_SERVICE_ROLE_KEY=service-role-key

# Cloudinary for uploads
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
```

Notes:
- `NEXT_PUBLIC_...` variables are available to the browser.
- `SUPABASE_SERVICE_ROLE_KEY` must remain secret and only be set on the server (Vercel dashboard, environment secrets, etc.). The codebase uses this to initialize `supabaseAdmin` (see `src/lib/supabase/admin.ts`).
- `CLOUDINARY_*` values are required by `src/lib/cloudinary.ts` and by the server upload route.

---

## Project structure (high level)

Key folders and files you will use frequently:

- `src/app/`
  - `page.tsx` – public/login UI (root).
  - `layout.tsx` – global layout/styles.
  - `admin/` – admin area (protected).
    - `layout.tsx` – admin layout with Sidebar.
    - `login/api/route.ts` – login API route.
    - `upload/route.ts` – upload endpoint used by the browser.
    - many admin pages (cars, agreements, users, audit) under `src/app/admin/*`.
- `src/components/ui/` – reusable UI primitives (Button, Card, Table, Sidebar, Modal).
- `src/lib/`
  - `supabase/client.ts` – createSupabaseBrowser() for client-side operations.
  - `supabase/server.ts` – createSupabaseServer() to use Supabase server-side with cookie support.
  - `supabase/admin.ts` – supabaseAdmin: server-side service-role client.
  - `cloudinary.ts` – Cloudinary configuration.
  - `auth/requireAdmin.ts` – server-side guard that verifies the current user is an admin.
  - `auth/roles.ts` – role types and permissions.
  - `upload.ts` – client helper to call `/admin/upload`.

---

## Authentication & Roles

Auth is provided by Supabase (email/password). The app enforces admin-only access to the admin area.

Key points:

- Server guard: `requireAdmin()` (in `src/lib/auth/requireAdmin.ts`) reads the current Supabase session via `createSupabaseServer()` and checks the `admin_users` table for a role (either `admin` or `superadmin`).
  - Returns `{ ok: true, id, role }` if allowed.
  - Returns `{ ok: false, status, message }` if not allowed.

- Role definitions:
  - `superadmin` – has elevated permissions (see `src/lib/auth/roles.ts`).
  - `admin` – regular admin.

Seed an initial admin user in Supabase:
1. Create a user in Supabase Auth (via the dashboard or using Supabase client).
2. Run SQL (in Supabase SQL Editor) to insert the admin record:

```sql
INSERT INTO admin_users (user_id, role)
VALUES ('<SUPABASE_USER_ID>', 'superadmin'); -- or 'admin'
```

Replace `<SUPABASE_USER_ID>` with the user's `id` from Supabase Auth.

Security notes:
- The server uses cookie-based auth reading cookies from Next's `cookies()` store. Ensure cookies are not stripped by proxies.
- Keep `SUPABASE_SERVICE_ROLE_KEY` secret — used only by server-side code.

---

## Image uploads

Client-side helper: `src/lib/upload.ts`

- Upload flow:
  1. Browser sends a FormData POST to `/admin/upload` route.
  2. The server route (in `src/app/admin/upload/route.ts`) typically uploads the file to Cloudinary and returns a URL.
  3. The client receives the URL and stores it as needed.

Example usage:

```ts
import { uploadImage } from "@/lib/upload";

async function onFileChange(file: File) {
  const url = await uploadImage(file);
  console.log("uploaded to", url);
}
```

Make sure Cloudinary env vars are set on the server where the upload route runs.

---

## Development notes & commands

- Start dev server:
  - `npm run dev`

- Build production artifacts:
  - `npm run build`
  - `npm start` (starts built server)

- Lint:
  - `npm run lint`

- TypeScript:
  - tsconfig is configured with the `@/*` path alias pointing to `./src/*`.

- Tailwind:
  - `tailwind.config.js` includes `./src/app/**/*` and `./src/components/**/*` for purging content.

- Supabase client usage:
  - Client (browser): `createSupabaseBrowser()` uses `NEXT_PUBLIC_SUPABASE_*` variables.
  - Server (SSR, route handlers): `createSupabaseServer()` reads cookies via `next/headers` so auth is preserved during server rendering.
  - Admin (elevated privileges): `supabaseAdmin` is initialized with the service role key.

---

## Deployment

Recommended: Vercel (supports Next.js App Router).

Things to configure on Vercel (or any host):
- Set the environment variables from the "Environment variables" section.
- Ensure `SUPABASE_SERVICE_ROLE_KEY`, `CLOUDINARY_API_SECRET` are set as server-only secrets (do not expose to client).
- Build command: `npm run build`
- Start command: `npm start` (Vercel will handle builds automatically)

Security reminder:
- Never commit `.env.local` or service-role keys.
- Audit logs and database admins should be protected in production.

---

## Troubleshooting & tips

- Missing env variables
  - If the app fails during server start, confirm all required env vars are defined.
- Supabase auth session not present on server
  - `createSupabaseServer()` depends on Next's `cookies()` to return Supabase auth cookies. If cookies are missing, check your authentication flow and sameSite/secure cookie settings.
- Upload errors
  - If `/admin/upload` returns an error, check Cloudinary keys and server logs.
- Admin user not recognized
  - Ensure an entry exists in `admin_users` where `user_id` is the Supabase auth user's id.
- Service role misuse
  - Do not use `SUPABASE_SERVICE_ROLE_KEY` in client code—only server-side code should use it.

---

## Contributing

- Open an issue for planned changes or bugs.
- Make a branch per feature/fix.
- Keep PRs focused and update README if behaviour or env vars change.

---

## Useful links

- Next.js App Router: https://nextjs.org/docs/app
- Supabase docs: https://supabase.com/docs
- Cloudinary docs: https://cloudinary.com/documentation
- Tailwind CSS: https://tailwindcss.com/docs

---
