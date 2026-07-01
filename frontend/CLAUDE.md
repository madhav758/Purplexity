# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun dev          # Dev server with HMR at http://localhost:3000
bun start        # Production server (NODE_ENV=production)
bun run build    # Production build → dist/
bun test         # Run tests
```

## Architecture

This is a **Bun fullstack app** — one process serves both the API and the React SPA.

`src/index.tsx` is the Bun server entry point. It uses `Bun.serve()` with route-based handlers. The catch-all `"/*"` route serves `src/index.html`, which Bun automatically bundles (including the imported `.tsx` and `.css`). Add new API routes directly in `src/index.tsx`.

`src/frontend.tsx` is the React entry point — it mounts `<App />` into `#root` and handles HMR via `import.meta.hot`. `src/App.tsx` owns the React Router config; add new `<Route>` entries there.

Pages live in `src/pages/`. There is currently one page: `src/pages/Auth.tsx`, which handles OAuth sign-in via Supabase (Google and GitHub providers).

## Key conventions

- **Path alias**: `@/*` resolves to `./src/*` (configured in `tsconfig.json`).
- **Tailwind**: v4 via `bun-plugin-tailwind`. Tokens defined as CSS variables in `styles/globals.css` using shadcn/ui's "new-york" style with zinc base color. Import the stylesheet from `src/index.css` or directly in components.
- **shadcn/ui**: Components are added with `bunx shadcn@latest add <component>` and land in `src/components/ui/`. The `cn()` helper in `src/lib/utils.ts` merges Tailwind classes.
- **Icons**: `lucide-react`.
- **Environment variables**: Prefix with `BUN_PUBLIC_` to expose to the browser (enforced by `bunfig.toml`). Bun loads `.env` automatically — no dotenv needed.

## Supabase

Auth is wired through `@supabase/supabase-js`. The client is instantiated inline in `src/pages/Auth.tsx` using:

```
BUN_PUBLIC_SUPABASE_URL
BUN_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

These must be set in `.env.local` for local development.

## Bun APIs to prefer

- `Bun.serve()` over express
- `Bun.file()` over `fs.readFile/writeFile`
- `bun:sqlite` over better-sqlite3
- `Bun.sql` over pg/postgres.js
- `Bun.$\`cmd\`` over execa
