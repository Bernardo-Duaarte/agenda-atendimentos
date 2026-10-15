# Agenda

**English** · [Português](README.pt-BR.md)

Scheduling, client and finance app for a freelance makeup artist who works both
at her studio and at clients' homes. Built and maintained as a personal project
and in production use by a real business. Single user: the business owner.

The UI and the code identifiers are in Portuguese, because that is the language
of the person who uses it every day.

<!-- Screenshots: add 2–3 images here, using fictional client data only. -->

## What it does

- **Appointments that account for travel.** A home visit blocks the calendar
  from `start − travel there` to `end + travel back`, not just the service
  time, so back-to-back bookings across town can't overlap.
- **Automatic travel fee.** Distance and drive time come from the Google
  Routes API (traffic-aware). The fee uses a base + per-km + per-minute
  formula calibrated against real ride-hailing prices.
- **Off-hours pricing.** Services starting outside the configured working
  window are priced differently. The same pricing function runs in the browser
  for instant feedback and on the server, where the result is final.
- **Deposits and payments.** A deposit confirms a booking. Payments can be
  split across months (brides often pay in installments), and a cancelled
  booking keeps its deposit.
- **Monthly report with two separate views.** *Work* (by appointment date:
  what was done, what was earned after partner payouts, what is still owed)
  and *Cash* (by payment date: what actually came in). They are never mixed.
- **Partner professionals.** Appointments can include partners, with their
  share deducted from the owner's earnings.
- **Conflict alerts from her personal iPhone calendar.** The app reads her
  published iCloud calendar (read-only) and warns before booking over a
  personal event.
- **Calendar feed for the iPhone.** Appointments are published as a
  subscribable calendar behind a long random token.
- **Client import from phone contacts.** vCard upload with phone
  normalization to E.164, deduplication and batch limits.
- **WhatsApp messages without an API.** `wa.me` links open WhatsApp with the
  message already written. No cost, no Meta verification and no risk of the
  business number being banned.
- **Product inventory (currently switched off).** Built and kept behind a
  feature flag: estimating per-service product usage turned out too imprecise,
  and a bad estimate would corrupt cost and profit numbers. Data is kept.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Server Actions), React 19, TypeScript |
| Database | PostgreSQL on Supabase, Prisma 7 ORM with migrations |
| Styling | Tailwind CSS 4, light and dark themes |
| Hosting | Vercel (São Paulo region), daily cron job |
| External APIs | Google Routes API, iCloud published calendars (ICS) |

## Design decisions

- **Money is always an integer number of cents.** Never floating point: in a
  revenue report, `0.1 + 0.2 ≠ 0.3` becomes missing cents.
- **Stock is a sum, not a field.** A product's balance is the sum of its
  movements, so the number can always be explained by its history.
- **Product cost is per unit, derived from the purchase.** "35 ml bottle for
  R$ 229" is divided automatically, so 4 ml of foundation never costs a whole
  bottle.
- **Dates are stored in UTC.** Conversion to São Paulo time happens only at
  display, in a single module (`src/lib/tempo.ts`).
- **Business rules live in plain modules.** Pricing, travel fees, finance,
  reports and contact import are pure functions in `src/lib`, separate from
  database and session code, so the rules that can go wrong are easy to check.

## Security

- **Verified TLS to the database**, with Supabase's CA pinned in code. Without
  it the driver connects in plain text.
- **Single-password login** with a signed session cookie (`httpOnly`,
  `secure`, `sameSite=lax`), valid for 30 days.
- **Auth checked on every page and every Server Action.** Server Actions are
  real POST endpoints, reachable without going through a page or layout.
- **Login rate limiting stored in the database**, not in memory: on serverless,
  each instance would otherwise keep its own counter.
- **Supabase's public API is closed.** `anon` and `authenticated` permissions
  are revoked and Row Level Security is on with no policies.
- **The database enforces what the code checks.** `CHECK` constraints reject
  negative prices, appointments that end before they start and stock movements
  with the wrong sign.
- **API keys stay on the server.** The Google Maps key is only used inside
  Server Actions, never shipped to the browser.

## Running locally

Requires Node 22 or newer and a PostgreSQL database (Supabase was used in
production).

```bash
npm install
cp .env.example .env    # then fill it in (see below)
npm run db:migrate      # creates the tables
npm run db:seed         # optional: sample services and products
npm run dev             # http://localhost:3000
```

### Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Connection used by the app (Supabase transaction pooler, port 6543) |
| `DIRECT_URL` | Connection used by migrations (session pooler, port 5432) |
| `SENHA_ACESSO` | Login password, at least 8 characters |
| `SESSION_SECRET` | Signs the session cookie; changing it logs everyone out |
| `CALENDAR_TOKEN` | Protects the calendar feed URL; treat it as a password |
| `CRON_SECRET` | Protects the daily keep-alive route |
| `GOOGLE_MAPS_API_KEY` | Optional. Enables travel distance, time and fee; without it those fields are manual |

Generate a random secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run db:migrate` | Create and apply migrations |
| `npm run db:deploy` | Apply existing migrations (production) |
| `npm run db:seed` | Insert sample data |
| `npm run db:studio` | Open Prisma Studio |
| `npm run lint` | Lint the code |

## Deployment

Hosted on Vercel. `vercel.json` pins the region to São Paulo (`gru1`), next to
the database, and schedules a daily request to `/api/manter-acordado`, because
Supabase's free tier pauses a project after 7 days without activity. The
variables from `.env` must also be set in the Vercel dashboard.
