# LemFi Candidate Intent Platform

Internal league table ranking ~173 target companies by "Move Likelihood Score" —
public signals on layoffs, leadership churn, negative press, Glassdoor sentiment,
and funding distress — so TA knows which companies to prioritize sourcing from
this week.

Companion to the `lemfi-competitor-intel` Slack bot: this app ports that bot's
Claude-web-search signal detection into a standalone scoring pipeline that
writes to Postgres on a schedule, with a proper league table + detail page UI
on top instead of a Slack digest.

## Local setup

Requires a Postgres database (local or Neon) and Node 18+.

```bash
npm install
cp .env.local.example .env.local   # fill in real values, see below
npx tsx scripts/seed-db.ts          # creates tables, inserts the 173 companies
npx tsx scripts/run-scan.ts --demo  # fixture data, no Anthropic calls — good for UI dev
# or: npx tsx scripts/run-scan.ts   # real scan, calls the Anthropic API for all 173 companies
npm run dev
```

Env vars (see `.env.local.example`):

| Var | Purpose |
|---|---|
| `ACCESS_PASSWORD` | Shared password recruiters use to log in |
| `SESSION_SECRET` | Signs the login session cookie — not the password itself |
| `CRON_SECRET` | Bearer token Vercel Cron sends to `/api/cron/scan` |
| `ANTHROPIC_API_KEY` | Same key the `lemfi-competitor-intel` bot uses |
| `SLACK_WEBHOOK_URL` | Incoming webhook for threshold-crossing alerts (optional) |
| `POSTGRES_URL` | Standard Postgres connection string (local or Neon) |

## Architecture

- `app/` — Next.js App Router pages. Server components read pre-computed data
  from Postgres via `lib/companies.ts` — **never** call the Anthropic API on
  page render.
- `lib/scoring/` — signal detection + the weighted composite score. Retune
  weights in `lib/scoring/weights.ts`.
- `lib/search/` — Claude + `web_search` tool wrapper, same pattern as the old
  bot's `searchWeb()`.
- `scripts/run-scan.ts` — the actual scoring engine. Run manually
  (`npx tsx scripts/run-scan.ts`) or via `app/api/cron/scan/route.ts`, which
  Vercel Cron hits on a schedule.
- `middleware.ts` — password gate via HMAC-signed session cookie.

## Deploying to Vercel

1. Push this repo to GitHub, import it in Vercel.
2. Add a Postgres database via the Vercel/Neon integration — this sets
   `POSTGRES_URL` automatically.
3. Set the remaining env vars above in the Vercel project settings.
4. Run `npx tsx scripts/seed-db.ts` once against the production database
   (e.g. via `vercel env pull` locally, or a one-off script run) to create
   tables and seed the 173 companies.
5. Deploy. `vercel.json` registers a **daily** cron hitting `/api/cron/scan`
   — Hobby tier only allows daily-frequency cron schedules, so the route
   itself no-ops unless the day is Mon/Wed/Fri (see the comment in
   `app/api/cron/scan/route.ts`). On Pro, this can be simplified to a literal
   `0 9 * * 1,3,5` schedule with the day-check removed.
6. Trigger `/api/cron/scan` manually once with the `CRON_SECRET` bearer token
   to confirm the full pipeline (search → score → write → Slack alert) before
   waiting on the schedule.
