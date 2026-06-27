# KANNI Admin Console

A zero-build, single-file admin web console for the KANNI API. Plain HTML +
CSS + vanilla JS (`index.html`) — no framework, no bundler, no `npm install`.
It talks to the running KANNI API over HTTP.

## Run

```bash
# 1) make sure the API is up (in services/api):  npm run start:dev
# 2) serve this console:
cd services/admin-web
npm start            # → http://localhost:4444  (zero-dependency node static server)
```

Then open <http://localhost:4444> and sign in with the seeded admin phone
(`+910000000000`). OTP login: in dev the code is returned by the API and filled
in automatically — just click **Verify & enter**.

> Opening `index.html` directly via `file://` also works (the API has CORS
> enabled), but serving over HTTP avoids browser `file://` quirks.

## What it does

- **Dashboard** — queue depths, marketplace counts, and settled money flows
  (GMV, KANNI revenue, farmer/driver payouts) from `GET /admin/stats`.
- **Listings** — review queue with a **live buyer-price preview** (mirrors the
  server's pricing formula); approve with grade + margin% + flat fee, or reject.
- **Drivers** — verify or reject pending driver onboarding.
- **Orders** — recent orders with payment/settlement state; **Refund** appears
  only when the order is actually refundable (held escrow pre-pickup, or a
  captured delivered order), matching the API's own guards.

## Config

The API base defaults to `http://localhost:3333/api`. Override per-session with
a query param: `http://localhost:4444/?api=https://api.example.com/api`
(remembered in `localStorage`). The admin JWT is stored in `localStorage` and
cleared on **Log out**.
