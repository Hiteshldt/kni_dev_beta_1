# KANNI 🌾

Farmer-first B2B agri-marketplace + logistics. Farmers list produce in their
native language with near-zero typing; bulk buyers purchase against an MOQ;
admins moderate and price; drivers fulfill (direct pickup now, batching next).

See [`PRD.md`](./PRD.md), [`WIREFRAMES.md`](./WIREFRAMES.md), and
[`ENGINEERING_PLAN.md`](./ENGINEERING_PLAN.md) for product & engineering docs.

## Monorepo layout

```
kanni/
├── apps/
│   └── mobile/          # Expo (React Native) app — test on your phone via Expo Go
├── services/
│   ├── api/             # NestJS REST API        ← built, runnable now
│   └── admin-web/       # Admin console (zero-build static SPA) ← runnable now
├── PRD.md  WIREFRAMES.md  ENGINEERING_PLAN.md
```

## Quick start (backend API)

A self-contained dev Postgres cluster is used so you don't need to touch your
own database. Helper scripts live in `services/api`.

```bash
cd services/api
npm install

# start the bundled dev Postgres (port 5433, trust auth) — already running if
# you followed setup; otherwise:
npm run db:up

npm run db:migrate     # create schema
npm run db:seed        # seed produce catalog (Tamil + Malayalam names)
npm run start:dev      # API on http://localhost:3333
```

> Port 3333 is used (3000 is commonly taken by a Next.js dev server). Change via
> `PORT` in `services/api/.env`.

Then exercise the full loops:

```bash
npm run smoke            # seller → admin approve(margin) → buyer browse/MOQ
npm run smoke:logistics  # buyer pay(escrow) → driver onboard/verify/accept/pickup/deliver → settlement
npm run smoke:batch      # driver consolidates 2 orders → multi-stop route → one combined payout
npm run smoke:trust      # cancel/refund/restock + settlement record + ratings + notifications
```

## Admin console

A zero-build web console (plain HTML/JS, no bundler) lives in
[`services/admin-web`](./services/admin-web). With the API running:

```bash
cd services/admin-web
npm start                # → http://localhost:4444
```

Sign in with the seeded admin phone `+910000000000` (dev OTP is auto-filled).
Review listings (with live buyer-price preview), verify drivers, watch the
dashboard (queues + GMV + settled money flows), and issue refunds.

## Mobile app (test on your phone)

The farmer / buyer / driver app is an **Expo** app — scan a QR code with Expo
Go, no Xcode/Android Studio. With the API running on the same Wi-Fi:

```bash
cd apps/mobile
npm install        # first time
npm start          # scan the QR with Expo Go
```

Vernacular (en/ta/ml), icon-driven, voice read-back. See
[`apps/mobile/README.md`](./apps/mobile/README.md) for the full walkthrough.

## Deploying

Neon (Postgres) + Render (API + admin) + EAS (Android APK), all free-tier. The
API runs in production against managed Postgres over SSL. Full step-by-step in
[`DEPLOY.md`](./DEPLOY.md); Render reads [`render.yaml`](./render.yaml).

## Status

Backend working & smoke-tested end to end (`npm run build` is clean):

- **Auth** — OTP + JWT + role gating (seller/buyer/admin/driver)
- **Seller** — profile + vernacular listings (pending → live)
- **Admin** — listing review with margin/fee → buyer price; driver verification
- **Buyer** — browse (proximity + price breakdown), MOQ enforcement, orders
- **Payments** — pluggable provider seam (`PAYMENT_PROVIDER=mock|razorpay`):
  escrow hold on pay → capture on delivery → gateway payouts (RazorpayX) →
  refund on cancel, every step carrying a gateway reference. Mock is the default
  (deterministic, no network); Razorpay/RazorpayX adapter + signed webhook ready
  for live keys.
- **Driver (direct)** — onboarding (capacity), direct-pickup jobs (capacity + proximity),
  pickup-code + drop-OTP verification, **settlement** (seller payout + driver earning)
- **Driver (batch · Phase 2)** — consolidate nearby compatible orders into one run:
  capacity bin-pack + nearest-neighbour route plan + utilization/earnings scoring,
  multi-stop execute (per-shipment code/OTP), **one combined driver payout per batch**.
  Route plan re-computed server-side on create (client plans are never trusted).
  v1 routing is greedy NN; swap for OR-Tools / Mapbox in prod (see `batch-engine.ts`).
- **Notifications** — event-driven, stored in-app, rendered in the recipient's
  language (en/ta/ml) for TTS read-back; dev dispatch logs (swap for MSG91/FCM).
- **Ratings & trust** — buyer→seller / buyer→driver ratings, reputation +
  reliability score (ratings × fulfilment).
- **Refunds & settlement** — buyer self-cancel + admin refund (pre-pickup restock +
  escrow refund; post-delivery refund), and a per-order **settlement record**
  (gross = farmer + driver + kanni margin).

- **Admin console** — zero-build web SPA (`services/admin-web`): dashboard,
  listing review, driver verification, refunds, all over the existing API.
- **Mobile app** — Expo (React Native) app (`apps/mobile`): farmer / buyer /
  driver, vernacular (en/ta/ml) icon-driven UI with voice read-back; testable on
  a phone via Expo Go. Phase 1 scope (direct pickup); device TTS today.

Next per `ENGINEERING_PLAN.md` (all need external accounts/keys — ask when ready):
connect **live Razorpay keys** (adapter + webhook done; needs an account +
per-payee fund accounts), **MSG91 SMS** + **Bhashini TTS/STT** behind the
existing notification/voice seams, and in-app **push (FCM)**.
