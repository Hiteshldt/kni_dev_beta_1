# KANNI — Product Requirements Document (PRD)

> **Kanni (കന്നി / கன்னி)** is the first month of the harvest season in the Malayalam & Tamil calendars — "the beginning of the harvest." The app connects farmers directly to bulk buyers, with logistics built in.

**Document owner:** Product
**Status:** Draft v1.0
**Last updated:** 2026-06-20
**Audience:** Founders, Engineering, Design, Ops

---

## 1. TL;DR

KANNI is a mobile-first B2B agri-marketplace + logistics network. Farmers (sellers) list fresh produce in their native language with near-zero typing. Bulk buyers (wholesalers, retailers, restaurants, vendors) browse, meet a Minimum Order Quantity (MOQ), and purchase. An admin layer reviews listings and applies margin/fees. A Rapido-style driver network handles fulfillment via two modes: **direct pickup** (one order, point-to-point) or **batch pickup** (multiple orders consolidated by truck capacity using a route-optimization algorithm).

**The wedge:** radically simple, vernacular, voice-and-icon-driven UX so a farmer with low literacy and a basic Android phone can list produce in under 60 seconds.

---

## 2. Problem & Why Now

### The farmer's problem
- Farmers sell to a chain of middlemen (mandi agents, aggregators) and capture a small fraction of the final price.
- Price discovery is opaque; farmers don't know the fair rate.
- No reliable, affordable logistics for small/medium lots.
- Existing apps are English-heavy, form-heavy, and assume digital literacy farmers don't have.

### The buyer's problem
- Sourcing fresh produce in bulk is fragmented, inconsistent in quality, and hard to plan.
- No transparent, traceable supply with predictable delivery.

### The logistics gap
- Empty-return trips and single-order runs make rural pickup uneconomical.
- No system to batch nearby farm pickups into one efficient route.

### Why now
- Cheap Android + UPI + cheap data have reached rural India.
- Vernacular voice/STT is good enough for production.
- Gig-logistics (Rapido/Porter model) is a proven, fundable pattern.

---

## 3. Goals & Non-Goals

### Goals (v1)
1. Let a farmer list produce in < 60 seconds with minimal literacy.
2. Enable verified bulk buyers to purchase against an MOQ.
3. Give admin control over catalog quality, margin, and fees.
4. Provide working logistics for both direct and batched pickups.
5. Build trust via OTP identity, location capture, and order tracking.

### Non-Goals (v1)
- Consumer (D2C) retail / home delivery of single items.
- In-app credit/lending (Phase 3 consideration).
- Cold-chain / warehousing ownership (partner, don't build).
- International / cross-border.
- Live commodity-exchange-style dynamic auctions (Phase 2+).

---

## 4. Users & Roles

KANNI has **four roles**. A single phone number maps to one primary role at signup; multi-role is a later consideration.

| Role | Who | Core job |
|------|-----|----------|
| **Seller (Farmer)** | Individual farmers, FPOs, small growers | List produce, set price/qty/MOQ, share farm/pickup location, get paid |
| **Buyer** | Wholesalers, retailers, restaurants, mandi traders | Discover produce, meet MOQ, order, pay, track delivery |
| **Admin** | KANNI ops team | Verify users & listings, apply margin/fees, resolve disputes, manage catalog |
| **Driver** | Gig truck/tempo owners & drivers | Onboard (Rapido-style), accept direct or batch pickups, fulfill routes |

### Personas (brief)
- **Ravi, 44, farmer, Tamil Nadu** — owns a smartphone, low text literacy, speaks Tamil, grows tomatoes & bananas. Wants a fair price without the mandi cut.
- **Suresh, 38, vegetable wholesaler** — buys 500kg–2T daily, wants consistent supply and clean invoicing.
- **Meena, 29, KANNI ops** — reviews 200 listings/day, needs fast moderation tools.
- **Anand, 31, tempo owner** — wants steady pickup jobs and efficient routes to avoid empty runs.

---

## 5. The KANNI Difference (USP)

> **"List your harvest by tapping pictures and speaking — no typing, no English."**

1. **Vernacular-first**: Malayalam, Tamil (v1), then Telugu, Kannada, Hindi. All copy, voice prompts, and TTS readouts.
2. **Icon + voice UX**: Produce chosen from a visual grid; quantity and price entered via large steppers + voice input; the app reads back the listing aloud for confirmation.
3. **Near-zero typing**: OTP login, GPS one-tap location, photo capture, picker-based inputs.
4. **Logistics included**: built-in pickup so the farmer never arranges transport.
5. **Transparent pricing**: farmer sees their payout; buyer sees their price; admin margin is explicit.

---

## 6. Core User Journeys

### 6.1 Seller (Farmer) journey
1. **Login** — enter phone number → OTP → done.
2. **Onboarding** (one-time) — name, language, profile photo (optional), farm location via "Use my location," KYC-lite (Aadhaar/UPI for payout). Saved for reuse.
3. **Create listing**:
   - Pick produce from a **visual grid** (with names spoken on tap).
   - Set **quantity** (large +/− stepper or voice: "five hundred kilo").
   - Set **unit** (kg / quintal / crate / dozen).
   - Set **asking price per unit** (with a suggested fair-price hint).
   - Set **MOQ** (minimum a buyer must order) — default suggested by category.
   - Add **photos** of the produce (camera).
   - Set **pickup location** (defaults to farm location; can change).
   - Set **availability window** (today / next N days; perishability-aware).
   - App **reads the listing back aloud** → farmer taps the big green ✓.
4. **Listing goes to "Pending review."**
5. Admin approves (and may adjust margin/fee) → listing goes **live**.
6. Farmer gets notified on order, pickup scheduled, and **payout on delivery confirmation**.

### 6.2 Buyer journey
1. Login (OTP) → onboarding (business name, GST optional, delivery location).
2. Browse/search produce → filter by category, distance, price, availability.
3. Open listing → see price (incl. KANNI margin/fee), MOQ, farm distance, photos, seller rating.
4. Add to cart (must meet MOQ) → set **delivery address**.
5. Pay (UPI / online; COD optional for trusted buyers) → order confirmed.
6. Track: Confirmed → Pickup assigned → Picked up → In transit → Delivered.
7. Confirm receipt → rate seller & driver.

### 6.3 Admin journey
1. **Listing review queue**: approve/reject, edit category/quality grade, flag fraud.
2. **Pricing control**: apply per-category or per-listing **margin %** and/or **flat fee**; the system computes buyer price from farmer payout + margin/fee.
3. **User verification**: KYC for sellers, business verification for buyers, document + vehicle verification for drivers.
4. **Order & dispute management**: refunds, cancellations, quality complaints.
5. **Logistics oversight**: monitor batches, reassign drivers, set service zones & pricing.

### 6.4 Driver journey (Rapido-style)
1. **Onboarding**: phone OTP → license, vehicle RC, vehicle type & **capacity (kg / volume)**, photo, bank details → admin verification → active.
2. **Go online** → see available pickup jobs near them.
3. **Two fulfillment modes**:
   - **Direct pickup**: accept a single order, navigate to farm, pick up, deliver to buyer.
   - **Batch pickup**: select **multiple orders** that fit the truck's capacity (entered/confirmed at pickup time). The app proposes an optimized multi-stop route. Driver can run it now or schedule for next day.
4. At each stop: navigate → verify order (code/QR) → mark "Picked up" (capacity remaining auto-updates).
5. Deliver: single-drop or multi-drop per buyer location → mark "Delivered" with proof (OTP/photo).
6. Earnings credited; ratings updated.

---

## 7. Key Features (Detailed)

### 7.1 Authentication & Identity
- Phone-number + OTP (SMS) login for all roles.
- Role chosen at first signup.
- Session persistence; re-auth on new device.
- KYC tiers: seller (payout KYC), buyer (business verify), driver (vehicle + license verify).

### 7.2 Listings & Catalog
- Master produce catalog with images, vernacular names, default units & MOQ.
- Quality grades (A/B/C) set by admin or self-declared + photo evidence.
- Perishability metadata drives availability windows and pickup SLA.
- Listing states: Draft → Pending → Live → Sold/Expired → Archived.

### 7.3 MOQ & Commerce
- Every listing has an MOQ; buyer cannot order below it.
- Cart supports multi-listing checkout, but pickup is grouped by seller location.
- Inventory decrement on order; partial fulfillment rules (configurable).

### 7.4 Pricing, Margin & Fees (Admin)
- **Farmer payout price** (what farmer set / agreed).
- **KANNI margin** (% configurable per category/listing).
- **Platform/logistics fee** (flat or computed from distance & weight).
- **Buyer price = payout + margin + fee + taxes.**
- All components stored per order for transparent settlement & invoicing.

### 7.5 Logistics & Batching Algorithm (see Section 8)
- Direct vs. batch pickup.
- Capacity-aware order selection.
- Route optimization & next-day scheduling.
- Driver earnings model (base + per-km + per-stop, with batch incentives).

### 7.6 Payments & Settlement
- Buyer pays via UPI/PG at checkout (escrow-style hold).
- On delivery confirmation: farmer payout released, KANNI retains margin/fee, driver earnings credited.
- Refund/cancellation flows with admin control.

### 7.7 Notifications
- SMS + push + in-app, all vernacular, with **voice/TTS** for key events (order received, pickup scheduled, payment done).

### 7.8 Ratings & Trust
- Buyers rate sellers & drivers; drivers rate pickup experience.
- Seller reliability score (fulfillment rate, quality complaints).

---

## 8. Logistics: Direct vs. Batch & the Routing Algorithm

This is KANNI's hardest and most defensible piece. Design it as a service from day one.

### 8.1 Inputs
- Order set: each order has pickup (farm) geo, drop (buyer) geo, weight/volume, time window, perishability.
- Driver: current location, vehicle **capacity (kg + volume)**, shift availability, home/return base.
- Constraints: capacity, time windows, max route duration, road feasibility.

### 8.2 Direct pickup mode
- Single order, point-to-point. Assigned to nearest available, capacity-fit driver.
- Simple ETA + earnings calc. Used for urgent/perishable or high-value lots.

### 8.3 Batch pickup mode
- Driver (or system) selects multiple compatible orders that **fit remaining capacity**.
- This is a **Capacitated Vehicle Routing Problem (CVRP) with pickup-and-delivery & time windows (PDPTW)**.

**v1 pragmatic approach (don't over-engineer):**
1. **Cluster** open orders geographically (e.g., DBSCAN / grid buckets by pickup zone).
2. **Greedy bin-pack** orders into a candidate batch until capacity (weight & volume) is hit, preferring same-direction drops and overlapping time windows.
3. **Route** the chosen batch with a nearest-neighbor seed + **2-opt local improvement** (or call Google/Mapbox/OSRM optimization API for v1 speed).
4. **Score** the batch: total payout to driver vs. distance/time; reject inefficient batches.
5. **Constraint guards**: never violate capacity; respect perishability (tighter SLA first); cap total route time.

**Scheduling:** driver can execute now or **schedule for next day** — system holds the batch, re-validates capacity & order status at start of run.

**Future (Phase 2+):** OR-Tools CVRP solver, dynamic re-batching as new orders arrive, multi-driver assignment optimization, return-trip backhauls.

### 8.4 Capacity handling
- Driver confirms actual usable capacity **at pickup time** (truck may be partially loaded).
- Remaining capacity updates after each stop; app stops suggesting orders that no longer fit.

### 8.5 Driver earnings (proposed)
`earnings = base_fare + (per_km × distance) + (per_stop × stops) + batch_bonus − adjustments`
- Batch bonus incentivizes consolidation; surge for remote/perishable.

---

## 9. Information Architecture / Screens (v1)

**Seller app**: Login/OTP → Onboarding → Home (My Listings) → Create Listing (grid → qty → price → MOQ → photos → pickup → voice confirm) → Orders → Payouts → Profile.

**Buyer app**: Login/OTP → Onboarding → Browse/Search → Listing detail → Cart/Checkout → Orders & Tracking → Ratings → Profile.

**Driver app**: Login/OTP → Onboarding (docs/vehicle/capacity) → Home (online toggle, jobs) → Direct job / Batch builder → Route & navigation → Stop checklist → Earnings → Profile.

**Admin (web)**: Dashboard → Listing review queue → Pricing/margin config → Users & KYC → Orders & disputes → Logistics/zones → Reports.

---

## 10. Technical Architecture (proposed)

- **Mobile**: Flutter or React Native (single codebase, strong i18n) — recommend **Flutter** for performance + rich offline/voice. Three app flavors (seller/buyer/driver) or one app with role routing (recommend one app, role-gated, for v1 to cut overhead — revisit if bundle size hurts).
- **Admin**: React web.
- **Backend**: Node.js/NestJS or Python/Django REST; PostgreSQL + PostGIS (geo), Redis (cache/queues).
- **Geo/Routing**: PostGIS for proximity; Google Maps / Mapbox / OSRM for distance matrix & optimization; OR-Tools later.
- **Auth/OTP**: MSG91 / Twilio / Firebase Auth.
- **Payments**: Razorpay / Cashfree (UPI, escrow, payouts via RazorpayX).
- **Voice/STT/TTS**: Bhashini (Govt. of India), Google Cloud STT/TTS for vernacular.
- **Notifications**: FCM + SMS gateway.
- **Storage**: S3-compatible for images.
- **Infra**: containerized (Docker), cloud (AWS/GCP), CI/CD, observability (Sentry, logs, metrics).

---

## 11. Data Model (high-level entities)

- **User** (id, phone, role, language, kyc_status, ...)
- **SellerProfile / BuyerProfile / DriverProfile** (role-specific + DriverProfile.vehicle_capacity)
- **ProduceCatalog** (category, names_i18n, default_unit, default_moq, perishability)
- **Listing** (seller_id, catalog_id, qty, unit, payout_price, moq, photos, pickup_geo, window, status)
- **PricingRule / OrderPricing** (margin%, fee, computed buyer_price)
- **Order** (buyer_id, items, total, status, delivery_geo)
- **Pickup/Shipment** (order refs, mode: direct|batch, driver_id, route, stops, capacity_used)
- **Batch** (driver_id, order_ids, route_plan, scheduled_for, status)
- **Payment / Payout / DriverEarning**
- **Rating** (from, to, score, context)

---

## 12. Metrics & Success Criteria

**North Star:** GMV fulfilled per week (₹), with on-time delivery ≥ X%.

| Area | Metric | v1 target (illustrative) |
|------|--------|--------------------------|
| Activation | Farmer completes first listing | < 60s median, > 70% completion |
| Liquidity | Listings → orders conversion | ≥ 25% |
| Commerce | Weekly GMV, repeat buyer rate | growth WoW |
| Logistics | Batch utilization (capacity %), on-time % | ≥ 70% cap, ≥ 90% on-time |
| Trust | Quality-complaint rate, refund rate | < 5% |
| Retention | Farmer 30-day retention | ≥ 40% |

---

## 13. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Low digital literacy → drop-off | Voice/icon UX, read-back confirm, field onboarding agents |
| Two-sided cold start | Seed one region densely; onboard buyers first via ops |
| Logistics economics (empty runs) | Batching + backhaul; start in dense farm clusters |
| Quality disputes | Photo + grading + escrow + ratings + admin moderation |
| Perishability / spoilage | Tight SLAs, perishability-aware routing, fast direct mode |
| Payment trust | Escrow hold; payout on delivery confirmation |
| Fraud (fake listings/drivers) | KYC tiers, admin review, vehicle verification |
| Connectivity gaps | Offline-tolerant listing draft + sync |

---

## 14. Phasing / Roadmap

**Phase 0 — Discovery (2–3 wks)**
Field research in 1 region, catalog & pricing study, design prototypes tested with real farmers.

**Phase 1 — MVP (single region, ~10–14 wks)**
- OTP auth, role onboarding (seller/buyer/driver/admin).
- Seller listing flow (vernacular, voice read-back, photos, MOQ, pickup geo).
- Admin review + margin/fee.
- Buyer browse/MOQ/checkout (UPI) + tracking.
- Driver onboarding + **direct pickup** + basic earnings.
- SMS/push notifications. Two languages (Tamil + Malayalam).

**Phase 2 — Logistics depth (~8–10 wks)**
- **Batch pickup** + capacity-aware selection + route optimization + next-day scheduling.
- Ratings, disputes, refunds, settlement automation.
- More languages (Telugu, Kannada, Hindi).

**Phase 3 — Scale & moat**
- OR-Tools dynamic batching, demand forecasting, fair-price intelligence.
- Credit/financing, insurance, multi-region, FPO tooling.

---

## 15. Open Questions

1. One app with role-gating vs. separate apps per role for v1?
2. Escrow model legality/operations — PG escrow vs. nodal account?
3. COD policy for buyers, and credit terms?
4. Quality grading — self-declared + photo vs. KANNI field inspectors?
5. Logistics: own fleet seed vs. pure gig from day one?
6. First launch region (Tamil Nadu vs. Kerala) and crop focus?
7. Pricing intelligence source for "fair price" hints (mandi APIs / Agmarknet)?

---

## 16. Appendix: Glossary
- **MOQ** — Minimum Order Quantity a buyer must purchase for a listing.
- **CVRP / PDPTW** — Capacitated Vehicle Routing / Pickup-Delivery with Time Windows; the math behind batching.
- **Backhaul** — using a return trip to carry another load, reducing empty runs.
- **FPO** — Farmer Producer Organization.
- **Bhashini** — Government of India's vernacular language AI platform.
