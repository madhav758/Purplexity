# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Runtime

This is a Bun project (not Node.js). Per `.cursor/rules`, default to Bun for everything:

- `bun install` — install deps
- `bun run index.ts` — start the Express server on port 3000
- `bun --bun run prisma <cmd>` — run Prisma CLI (e.g. `migrate dev`, `generate`). The `--bun` flag is required; `prisma.config.ts` was generated under that assumption.
- `bun run seed.ts` — seed a test User against the configured DB (currently hardcoded sample data — see `seed.ts`)
- `bun test` for tests (no tests exist yet)

Bun auto-loads `.env`, but `index.ts` still calls `import 'dotenv/config'`. Required env vars: `TAVILY_API_KEY`, `DATABASE_URL` (Postgres, currently Supabase-hosted per comments).

## Architecture

A "Perplexity-clone" backend. Single-file Express app (`index.ts`) that orchestrates web-search-augmented LLM responses and streams them back as SSE-flavored chunks.

The core `/purplexity_ask` flow:

1. Take `query` from the request body.
2. Call Tavily (`@tavily/core`) with `searchDepth: "advanced"` to gather web results.
3. Inject results + query into `PROMPT_TEMPLATE` from `prompt.ts`.
4. Stream the LLM response via Vercel AI SDK's `streamText` (`ai` package). The model string `openai/gpt-5.5` is routed through whatever provider the AI SDK is configured against — note this isn't a real OpenAI model name, so this currently relies on an AI gateway (OpenRouter / Vercel AI Gateway) to resolve.
5. After the model stream ends, append a `<SOURCES>...</SOURCES>` block containing the result URLs and close the connection.

The system prompt (`prompt.ts`) instructs the model to emit a structured envelope:

```
<ANSWER>...</ANSWER>
<FOLLOW_UPS><question>...</question></FOLLOW_UPS>
```

Clients are expected to parse these tags out of the stream alongside the appended `<SOURCES>` block.

Several routes are scaffolded but unimplemented: `/signup`, `/signin`, `/conversations`, `/conversation/:conversationId`, `/purplexity_ask/follow_up`. The follow-up route is meant to forward full chat history to the LLM (see inline TODO comments).

## Database (Prisma + Postgres)

- Schema: `prisma/schema.prisma`. Models: `User` → `Conversation` → `Message`. Enums `MessageRole` (User/Assistant) and `AuthProvider` (Github/Google).
- Generated client output is `./generated/prisma` (not the default `node_modules/.prisma`), and is configured with `runtime = "bun"` + `engineType = "client"` — meaning it uses Prisma's driver-adapter mode, not the binary query engine.
- The Postgres connection goes through `@prisma/adapter-pg` (`PrismaPg`) in `db.ts`, wired into `PrismaClient({ adapter })`. Import the client from `./db` (which imports from `./generated/prisma/client`), not directly from `@prisma/client`.
- After editing `schema.prisma`, regenerate with `bun --bun run prisma generate` so `generated/prisma` stays in sync.

## Conventions

- Per `.cursor/rules/use-bun-instead-of-node-vite-npm-pnpm.mdc`: prefer Bun-native APIs (`Bun.serve`, `Bun.sql`, `bun:sqlite`, `Bun.redis`, `Bun.file`) over Node/npm equivalents in new code. The current code predates this and still uses Express + `pg` + `dotenv` — match the existing style when editing `index.ts`/`db.ts`, but lean toward Bun primitives for new modules.
