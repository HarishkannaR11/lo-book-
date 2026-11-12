# லாரி கணக்கு · Lorry Book

Trip, diesel and dues book for small lorry owners. Phone-first PWA, Tamil by default, in eleven
Indian languages.

**Status: Phases 1–3 complete, plus on-device OCR and eleven languages.** Phase 1: schema,
RLS, phone-OTP sign-in, onboarding, installable PWA. Phase 2: trips, diesel and expenses, close
trip, profit and mileage, offline sync. Phase 3: party ledger, part payments, outstanding, WhatsApp
reminder. OCR: bunk slips and vehicle document expiry dates, read on the phone.

## Languages

தமிழ் (default) · English · हिन्दी · বাংলা · मराठी · తెలుగు · ગુજરાતી · ಕನ್ನಡ · മലയാളം · ଓଡ଼ିଆ · ਪੰਜਾਬੀ

- A phone set to one of these Indian languages opens the app in it; any other phone, English
  included, opens in Tamil. The owner can switch on the login screen or in Settings, and the
  choice is saved to their account.
- Numbers are always 0–9 (what owners type and what slips and number plates print), and money
  is always ₹ with Indian grouping.
- The WhatsApp reminder can be sent in any of the eleven, whatever language the app is in.
- One file per language in `messages/`. `npm run check:i18n` fails CI if any file is missing a
  key or a placeholder. Adding a language means one translated file, one entry in
  `src/i18n/config.ts` and one enum value in a migration.
- The translations are fluent but were not written by native-speaking lorry owners. Have each
  one read by someone from that trade before launch in that state.

## Offline

- Every trip, expense and close is written to IndexedDB (Dexie) plus an outbox entry, in one
  transaction, with a `client_uuid` minted on the phone. The outbox drains oldest-first when the
  app opens, when signal returns, and when the app comes back to the foreground.
- The server writes with `ON CONFLICT (client_uuid) DO NOTHING`, so a resend after a lost reply
  is harmless. An entry leaves the outbox only after the server confirms it.
- `/expenses/new` and `/trips/new` read from IndexedDB and are served by the service worker, so
  they open with no signal. Totals on the trip page come only from the `trip_summary` view;
  entries still on the phone are listed separately as "not counted yet".
- Signing out with unsent entries asks first, then wipes the phone's copy.

## OCR (on the phone)

Tesseract (English, LSTM, `best_int` model) runs in a Web Worker; nothing is sent anywhere.
`npm install` copies the engine to `public/tesseract/` (~7 MB actually downloaded per phone,
once, cached by the service worker so scans work offline).

- **Bunk slip** → litres, amount, rate, date. Accepted only when rate × litres = amount. If one
  digit is misread, it is repaired and that field is highlighted for checking; otherwise the
  owner types it. Nothing is saved without the owner tapping Save.
- **FC / insurance / permit / PUC** → the expiry date (the "valid upto / to" date, not the issue
  date). Parsers: `src/lib/ocr/`, tests: `npm test`.

## Run it locally

Needs Node 22 and Docker.

```bash
npm ci
npm run db:start          # local Supabase: Postgres, Auth, REST. Applies supabase/migrations.
cp .env.example .env.local  # fill in API_URL / PUBLISHABLE_KEY / SECRET_KEY printed by db:start
npm run dev               # http://localhost:3000
```

Local test phones (no SMS is sent): `90000 00001` … `90000 00004`, OTP `123456`.

## Checks

| Command | What it proves |
| --- | --- |
| `npm run typecheck` | Strict TS, generated Supabase types, typed i18n keys |
| `npm run lint` | Fails on any hardcoded user-facing string in a component |
| `npm run check:i18n` | `ta.json` and `en.json` have identical keys and placeholders |
| `npm test` | OCR parsers on slip/certificate text, including OCR-garbled variants; language detection |
| `npm run verify:rls` | Signs in owner A, owner B and A's driver over the real API and tries every read/write that must fail |

CI (`.github/workflows/ci.yml`) runs all five, plus a check that `src/lib/database.types.ts`
matches the migrations.

## Database

- Migrations live in `supabase/migrations/` and are the only way the schema changes.
- Local: `npm run db:reset` rebuilds from migrations. `npm run db:types` regenerates types.
- Hosted: `SUPABASE_DB_URL=… npm run db:migrate` shows a dry run, asks, then applies.

Derived numbers (profit, mileage, outstanding, the home-screen totals) exist only as
`security_invoker` views: `trip_summary`, `vehicle_mileage`, `party_outstanding`,
`owner_dashboard`. The client never computes them.

### Who can see what

- Every table is scoped to `owner_id = auth.uid()`. Child rows reference their parents with
  composite `(id, owner_id)` foreign keys, so a trip can never point at another owner's
  vehicle, driver or party.
- `trips` and `payments` have owner policies only. A driver has **no** row access to them, so
  freight, advance and payments are unreachable. Every view inherits this.
- A driver (a signed-in user whose verified phone matches an active `drivers` row) can read and
  insert `trip_expenses` only for their own trip while it is `open`. They can't edit or delete.
- `driver_open_trips()` is the driver's only view of a trip: vehicle and route, no money.

## Deploy (Supabase + Vercel)

1. Create a Supabase project (Mumbai region). Run `npm run db:migrate` with its connection string.
2. **Auth → Providers → Phone**: enable, and pick an SMS provider. For India, SMS must be
   DLT-registered (sender ID + OTP template) before real OTPs are delivered. Until that is done,
   add your own number under *Test phone numbers* with a fixed OTP to sign in.
3. Vercel: import the repo, set `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Deploy.
4. On the Android phone, open the Vercel link in Chrome → ⋮ → *Add to home screen* / *Install app*.

To check RLS against the hosted project with real accounts, add three test phone numbers with a
fixed OTP, then run `verify:rls` with `RLS_TEST_PHONE_OWNER_A/B`, `RLS_TEST_PHONE_DRIVER`,
`RLS_TEST_OTP` and the project's keys. It deletes those three test users before and after.
