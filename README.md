# Roommate Hub (Shared Living)

A React + Vite app for shared household chores, bills, rules, and members.

**Supabase:** Sign-in and household data use **[Supabase](https://supabase.com)** (Auth + PostgreSQL + Row Level Security) when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set. Without them, the app uses browser-only accounts (`localStorage`).

## Stack

- **UI:** React, Vite
- **Cloud (optional):** Supabase — cross-device auth and shared household / profile tables; schema SQL lives in `supabase/migrations/`.

## Download / run locally

1. Clone or download this repository and open the project folder in a terminal.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```
4. Open the URL shown in the terminal (usually `http://localhost:5173`).

Other useful commands: `npm run build` (production build), `npm run preview` (preview the build).

## Supabase environment (Vercel)

For hosted deployments, the app needs Supabase URL and anon key **at build time** (Vite inlines `VITE_*` variables).

1. In [Vercel](https://vercel.com), open your project.
2. Go to **Project → Settings → Environment Variables**.
3. Add:

   | Name | Value |
   |------|--------|
   | `VITE_SUPABASE_URL` | `https://jegxloaxtcpsiechiypi.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | `sb_publishable_tvQzQmpPYxd3V1twNOOaqQ_2USpuYEZ` |

4. Save and **redeploy** so a new build picks up the variables.

Without these, the app falls back to browser-only (localStorage) accounts on that deployment.

## Supabase environment (local)

Use the **same** two variables on your machine. Create a **`.env.local`** file in the project root (recommended; it is gitignored) or a **`.env`** file:

```env
VITE_SUPABASE_URL=https://jegxloaxtcpsiechiypi.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_tvQzQmpPYxd3V1twNOOaqQ_2USpuYEZ
```

Restart `npm run dev` after changing env files.

Apply the SQL in `supabase/migrations/` in the Supabase SQL Editor if you have not already created the required tables.

---

## Vite template (original README)

This project started from the official React + Vite template: minimal setup with HMR and ESLint.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

### React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

### Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
