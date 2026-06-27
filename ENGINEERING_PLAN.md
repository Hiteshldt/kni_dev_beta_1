# KANNI — Phase 1 Engineering Plan & Tickets

> Build plan for the MVP (single region, 2 languages, direct pickup only). Batching is Phase 2. Estimates are rough engineer-weeks for a small team (2 mobile, 2 backend, 1 web/admin, 1 designer). Adjust to your actual team.

**Phase 1 scope recap:** OTP auth · 4 roles · seller listing (vernacular/voice) · admin review + margin/fee · buyer browse/MOQ/checkout/track · driver onboarding + direct pickup · payments (escrow + payout) · notifications · Tamil + Malayalam.

---

## 1. Recommended stack (decided defaults — change if you disagree)

| Layer | Choice | Why |
|-------|--------|-----|
| Mobile | **Flutter** (single app, role-gated) | One codebase, strong i18n, good camera/voice plugins |
| Backend | **NestJS (Node + TypeScript)** | Typed, modular, fast to staff for |
| DB | **PostgreSQL + PostGIS** | Relational + geo proximity in one |
| Cache/Queue | **Redis** + BullMQ | OTP rate-limit, job queues, notifications |
| Auth/OTP | **MSG91** (primary) / Firebase Auth fallback | India SMS deliverability |
| Payments | **Razorpay** (PG + RazorpayX payouts) | UPI, escrow-style hold, vendor payouts |
| Maps/Geo | **Google Maps SDK** + Distance Matrix | Coverage in rural India |
| Voice | **Bhashini** STT/TTS (+ Google fallback) | Govt vernacular models, free tier |
| Storage | **S3 / Cloudflare R2** | Listing photos, KYC docs |
| Admin web | **React + Vite + shadcn/ui** | Fast internal tooling |
| Infra | Docker + AWS (ECS/RDS) or GCP | CI/CD via GitHub Actions |
| Observability | Sentry + structured logs | Crash + error tracking |

---

## 2. Repository structure (monorepo)

```
kanni/
├── apps/
│   ├── mobile/          # Flutter (seller + buyer + driver, role-routed)
│   └── admin/           # React admin web
├── services/
│   └── api/             # NestJS REST API
├── packages/
│   ├── shared-types/    # TS DTOs shared api<->admin
│   └── i18n/            # translation bundles (ta, ml, en)
├── infra/               # docker, terraform, CI
└── docs/                # PRD.md, WIREFRAMES.md, this file
```

---

## 3. Data model (Phase 1 tables)

```
users            (id, phone, role, language, status, created_at)
seller_profiles  (user_id, name, photo_url, farm_geo, payout_kyc_status, upi_id)
buyer_profiles   (user_id, business_name, gst, delivery_geo, verify_status)
driver_profiles  (user_id, license_url, rc_url, vehicle_type, capacity_kg, bank_*, verify_status)
produce_catalog  (id, names_i18n jsonb, category, default_unit, default_moq, perishability)
listings         (id, seller_id, catalog_id, qty, unit, payout_price, moq, photos jsonb,
                  pickup_geo, available_from, available_to, status, grade)
pricing          (listing_id|order_id, margin_pct, flat_fee, computed_buyer_price)
orders           (id, buyer_id, status, delivery_geo, subtotal, fee, tax, total, created_at)
order_items      (order_id, listing_id, qty, unit_price, payout_price)
shipments        (id, order_id, mode 'direct', driver_id, pickup_code, drop_otp, status,
                  picked_at, delivered_at, proof_url)
payments         (id, order_id, pg_ref, amount, status 'held|captured|refunded')
payouts          (id, seller_id|driver_id, amount, status, pg_ref)
ratings          (from_user, to_user, score, context, order_id)
notifications    (user_id, type, channel, payload, sent_at)
```
PostGIS: `geography(Point,4326)` columns + GIST index for proximity queries.

---

## 4. API surface (Phase 1, REST)

```
POST  /auth/otp/request           {phone}
POST  /auth/otp/verify            {phone, code} -> {token, role|null}
POST  /auth/role                  {role}                      (first signup)

# Seller
POST  /seller/profile
GET   /catalog                    ?lang=ta
POST  /listings                   (create -> status=pending)
GET   /listings/mine
GET   /orders/seller
POST  /voice/tts                  {text, lang} -> audio        (read-back)
POST  /voice/stt                  {audio, lang} -> text        (number capture)

# Buyer
POST  /buyer/profile
GET   /listings                   ?category&near&sort  (live only, buyer price)
GET   /listings/:id
POST  /cart/validate              (MOQ check)
POST  /orders                     -> {order, payment_intent}
POST  /payments/webhook           (razorpay)
GET   /orders/buyer
GET   /orders/:id/track

# Driver
POST  /driver/profile             (docs, vehicle, capacity)
GET   /driver/jobs                ?near  (direct, capacity-fit)
POST  /driver/jobs/:id/accept
POST  /shipments/:id/pickup       {code}
POST  /shipments/:id/deliver      {otp, proof?}
GET   /driver/earnings

# Admin
GET   /admin/listings?status=pending
POST  /admin/listings/:id/review  {action, grade, margin_pct, flat_fee}
GET   /admin/users?role&status
POST  /admin/users/:id/verify
GET   /admin/orders               (+ refund/reassign)
POST  /admin/pricing-rules
```

---

## 5. Epics & tickets

Legend: **[S]** small (≤2d) · **[M]** medium (3–5d) · **[L]** large (1–2wk). Priority: P0 = MVP-blocking.

### EPIC A — Foundations & Infra
- A1 **[M] P0** Monorepo setup (Flutter app, NestJS api, admin, shared-types, CI).
- A2 **[M] P0** Postgres + PostGIS schema migrations (tables in §3).
- A3 **[S] P0** Env/secrets management, Docker compose for local dev.
- A4 **[S] P0** Sentry + structured logging + health checks.
- A5 **[S] P1** S3/R2 upload service (signed URLs) for photos & KYC docs.

### EPIC B — Auth & Identity
- B1 **[M] P0** OTP request/verify via MSG91; Redis rate-limiting; JWT issuance.
- B2 **[S] P0** Role selection + role-gated routing (mobile + API guards).
- B3 **[M] P0** Session persistence, token refresh, logout, new-device re-auth.
- B4 **[S] P1** KYC status state machine (none→pending→verified→rejected).

### EPIC C — i18n & Voice (the USP)
- C1 **[M] P0** i18n framework + Tamil & Malayalam bundles; language switcher.
- C2 **[M] P0** TTS read-back service (Bhashini, Google fallback), cached audio.
- C3 **[M] P1** STT number capture for quantity/price (Bhashini), with retry UX.
- C4 **[S] P0** Spoken-label component (tap any item → hear it) — reusable widget.
- C5 **[S] P1** Localized error + empty states (spoken).

### EPIC D — Seller / Listings
- D1 **[M] P0** Seller onboarding (name, photo, GPS farm location, payout-later).
- D2 **[S] P0** Produce catalog seed (top 30 items) with i18n names + images.
- D3 **[L] P0** Create-listing 5-step wizard (grid → qty/unit → price/MOQ → photos/pickup → voice confirm).
- D4 **[S] P0** Fair-price hint integration (Agmarknet/mandi data; static fallback).
- D5 **[M] P0** Seller home (my listings, statuses) + listing edit/withdraw.
- D6 **[S] P0** Seller order detail + pickup code display.

### EPIC E — Admin
- E1 **[M] P0** Admin auth (separate, web) + RBAC.
- E2 **[M] P0** Listing review queue: approve/reject, set grade, **margin% + flat fee**, live buyer-price preview.
- E3 **[S] P0** Pricing rules (default margin/fee per category).
- E4 **[M] P1** Users & KYC verification screens (seller/buyer/driver).
- E5 **[M] P1** Orders & disputes (view breakdown, refund, reassign driver).
- E6 **[S] P2** Reports dashboard (GMV, conversion, on-time%).

### EPIC F — Buyer / Commerce
- F1 **[S] P0** Buyer onboarding (business, delivery location).
- F2 **[M] P0** Browse/search with category filter + **PostGIS proximity sort**.
- F3 **[M] P0** Listing detail with **buyer price** + price breakdown.
- F4 **[S] P0** **MOQ enforcement** (cart validate, block < MOQ).
- F5 **[M] P0** Checkout + order creation + inventory decrement.
- F6 **[S] P0** Order tracking screen (status timeline + driver ETA).

### EPIC G — Payments & Settlement
- G1 **[M] P0** Razorpay order + UPI/card checkout; payment hold (escrow-style).
- G2 **[M] P0** Payment webhook → confirm order; idempotent handling.
- G3 **[M] P0** Payout on delivery confirmation (RazorpayX) to seller; driver earning credit.
- G4 **[S] P1** Refund/cancellation flow (admin-triggered).
- G5 **[S] P1** Per-order settlement record (payout + margin + fee + driver split).

### EPIC H — Driver / Logistics (direct pickup only in P1)
- H1 **[M] P0** Driver onboarding (license/RC/vehicle/**capacity_kg**/bank) → admin verify.
- H2 **[M] P0** Online toggle + nearby **direct** jobs (capacity-fit, proximity).
- H3 **[S] P0** Accept job → shipment assigned → seller/buyer notified.
- H4 **[M] P0** Active trip: navigate, **pickup code** verify, mark picked up.
- H5 **[M] P0** Delivery: **drop OTP** + optional photo proof → mark delivered → triggers payout.
- H6 **[S] P1** Driver earnings screen.

> **Phase 2 (not in P1):** batch builder, capacity bin-pack, route optimization, next-day scheduling — see PRD §8. Keep `shipments.mode` and a `batches` table shape in mind now so it's additive.

### EPIC I — Notifications & Trust
- I1 **[M] P0** Notification service: push (FCM) + SMS + in-app; event templates (order, pickup, payment) in 2 languages.
- I2 **[S] P1** Ratings (buyer→seller, buyer→driver) + seller reliability score.

### EPIC J — QA, Field & Launch
- J1 **[M] P0** E2E test pass on each role's happy path.
- J2 **[M] P0** Field usability test with 8–10 real farmers (listing < 60s, completion > 70%).
- J3 **[S] P0** Play Store internal track + staged rollout.
- J4 **[S] P1** Analytics events (activation, conversion, drop-off funnel).

---

## 6. Suggested build sequence (sprints, ~2 weeks each)

| Sprint | Focus | Key tickets |
|--------|-------|-------------|
| 1 | Foundations + auth | A1–A4, B1–B3, C1 |
| 2 | Seller listing core + voice | C2, C4, D1–D3, A5 |
| 3 | Admin review + pricing + catalog | E1–E3, D4–D6, C3 |
| 4 | Buyer commerce + MOQ | F1–F6 |
| 5 | Payments + settlement | G1–G3, E4–E5 |
| 6 | Driver direct pickup | H1–H5, I1 |
| 7 | Notifications, ratings, refunds | I2, G4–G5, H6, B4 |
| 8 | QA, field test, launch | J1–J4, E6 |

~16 weeks to a regional MVP with this team size. Parallelize mobile/backend/admin within each sprint.

---

## 7. Definition of Done (per ticket)
- Code reviewed + merged; unit tests for logic-heavy paths (pricing, MOQ, capacity, payout).
- Localized (ta + ml) for any user-facing string.
- No P0/P1 Sentry errors in staging.
- API documented in shared-types/OpenAPI.
- Manually verified on a low-end Android device.

---

## 8. Critical technical risks to de-risk early (spikes)
1. **Vernacular STT accuracy for numbers** (Bhashini) — spike in Sprint 1; if weak, fall back to steppers-only and keep STT as assist.
2. **Razorpay escrow/payout flow** legality + nodal account — confirm with finance/legal before Sprint 5.
3. **Rural GPS accuracy** for pickup geo — allow manual map pin adjust.
4. **SMS deliverability** in target region — test MSG91 vs alternatives early.
5. **Low-end device performance** of Flutter + maps + camera — test on ₹6–8k phones.

---

## 9. What I need from you to finalize this plan
1. **Launch region + top crops** → finalizes catalog seed (D2) and fair-price source (D4).
2. **Team size/shape** → recalibrate the 16-week estimate.
3. **Gig-only vs. seeded fleet** at launch → affects H-epic ops, not code much.
4. **Stack sign-off** (Flutter / NestJS / Razorpay / Bhashini) or your preferences.
```
