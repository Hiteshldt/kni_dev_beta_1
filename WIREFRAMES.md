# KANNI — Screen Flow & Wireframe Spec (v1)

> Low-fidelity, text-based wireframes for the MVP. Goal: lock the vernacular, voice + icon, near-zero-typing UX before visual design. ASCII boxes show layout intent, not pixel design.

**Design principles (non-negotiable for the farmer flow):**
1. **No free-text typing** anywhere in the critical path (login, listing). Pickers, steppers, voice, camera only.
2. **One primary action per screen** — a single large button, bottom of screen, thumb-reachable.
3. **Icon + label + spoken name** for every choice; tap any item to hear it.
4. **Read-back confirmation**: before anything is submitted, the app speaks it aloud.
5. **High contrast, large type (min 18sp), big tap targets (min 56dp).**
6. All copy in the user's chosen language; English never required.

---

## 0. Shared: Login (all roles)

```
┌─────────────────────────────┐      ┌─────────────────────────────┐
│         🌾  KANNI           │      │         🌾  KANNI           │
│                             │      │                             │
│   [ Language picker ▾ ]     │      │   Enter the 6-digit code    │
│   தமிழ் | മലയാളം | हिन्दी    │      │   sent to +91 98••• •••21    │
│                             │      │                             │
│   Enter phone number        │      │     ┌─┬─┬─┬─┬─┬─┐           │
│   ┌───────────────────┐     │      │     │ │ │ │ │ │ │           │
│   │ +91  [ 98765••••] │     │      │     └─┴─┴─┴─┴─┴─┘           │
│   └───────────────────┘     │      │                             │
│                             │      │   Resend code in 0:28        │
│   ┌───────────────────┐     │      │                             │
│   │     GET CODE  →   │     │      │   ┌───────────────────┐     │
│   └───────────────────┘     │      │   │     VERIFY  →     │     │
│                             │      │   └───────────────────┘     │
└─────────────────────────────┘      └─────────────────────────────┘
```
- Phone keypad is the only typing; OTP auto-reads from SMS where possible.
- After verify: if new user → **Role selection**; else → role home.

### Role selection (first signup only)
```
┌─────────────────────────────┐
│   Who are you?              │
│                             │
│   ┌─────────┐ ┌─────────┐   │
│   │  👨‍🌾     │ │  🛒      │   │
│   │ FARMER  │ │ BUYER   │   │   ← large image tiles, spoken on tap
│   └─────────┘ └─────────┘   │
│   ┌─────────┐               │
│   │  🚚     │               │   (Admin is web-only, not shown here)
│   │ DRIVER  │               │
│   └─────────┘               │
└─────────────────────────────┘
```

---

## 1. SELLER (FARMER) FLOW

### 1.1 Seller onboarding (one-time)
```
┌─────────────────────────────┐
│  Let's set up your account  │
│                             │
│  📷  [ Add photo (optional)]│
│  Name:  [ 🎤 speak / type ] │
│                             │
│  Your farm location          │
│  ┌───────────────────────┐  │
│  │ 📍 USE MY LOCATION    │  │   ← one tap GPS; map preview below
│  └───────────────────────┘  │
│  [ mini map preview ]        │
│                             │
│  For payment (UPI / Aadhaar)│
│  [ Add later ▸ ]   [ Add ▸ ]│
│                             │
│  ┌───────────────────────┐  │
│  │       CONTINUE  →     │  │
│  └───────────────────────┘  │
└─────────────────────────────┘
```

### 1.2 Seller home — "My Listings"
```
┌─────────────────────────────┐
│  வணக்கம், ரவி 👋             │
│  ┌───────────────────────┐  │
│  │  🟢 2 Live  🟡 1 Pending│  │
│  └───────────────────────┘  │
│                             │
│  My produce                  │
│  ┌───────────────────────┐  │
│  │🍅 Tomato  500kg ₹18/kg│🟢│
│  │   3 orders ›          │  │
│  ├───────────────────────┤  │
│  │🍌 Banana  200dz ₹40   │🟡│  ← pending review
│  └───────────────────────┘  │
│                             │
│        [ Orders ] [ Pay ]   │  ← bottom tabs
│   ┌───────────────────────┐ │
│   │   ➕  ADD PRODUCE     │ │  ← big primary FAB-style
│   └───────────────────────┘ │
└─────────────────────────────┘
```

### 1.3 Create listing — Step 1: pick produce (visual grid)
```
┌─────────────────────────────┐
│  ‹ What are you selling?     │
│  [ 🎤 say the name ]         │
│                             │
│  🍅      🥔      🧅          │   ← tap image → hears name spoken
│ Tomato  Potato  Onion        │
│                             │
│  🍌      🥬      🫑          │
│ Banana  Greens  Chilli       │
│                             │
│  🥥      🌽      🍆          │
│ Coconut  Corn   Brinjal      │
│                             │
│        [ ● ○ ○ ○ ○ ]        │  ← step indicator
└─────────────────────────────┘
```

### 1.4 Step 2: quantity & unit (stepper + voice)
```
┌─────────────────────────────┐
│  ‹ How much Tomato? 🍅       │
│                             │
│       ┌───┐  500  ┌───┐     │
│       │ − │       │ + │     │  ← huge steppers
│       └───┘  kg   └───┘     │
│                             │
│   [ 🎤 "ஐநூறு கிலோ" ]        │  ← voice fills the number
│                             │
│   Unit:  ( kg ) quintal crate│  ← segmented picker
│                             │
│        [ ○ ● ○ ○ ○ ]        │
│   ┌───────────────────────┐ │
│   │       NEXT  →         │ │
│   └───────────────────────┘ │
└─────────────────────────────┘
```

### 1.5 Step 3: price + MOQ (with fair-price hint)
```
┌─────────────────────────────┐
│  ‹ Your price 🍅            │
│                             │
│   Price per kg               │
│       ┌───┐  ₹18  ┌───┐     │
│       │ − │       │ + │     │
│       └───┘       └───┘     │
│   💡 Nearby rate: ₹16–₹20    │  ← fair-price hint (Agmarknet)
│                             │
│   Minimum order (MOQ)        │
│       ┌───┐  50kg ┌───┐     │
│       │ − │       │ + │     │
│       └───┘       └───┘     │
│                             │
│        [ ○ ○ ● ○ ○ ]        │
│   [        NEXT  →        ] │
└─────────────────────────────┘
```

### 1.6 Step 4: photos + pickup location
```
┌─────────────────────────────┐
│  ‹ Add photos & pickup       │
│                             │
│   ┌────┐ ┌────┐ ┌────┐      │
│   │ 📷 │ │ ➕ │ │ ➕ │      │  ← camera tiles
│   └────┘ └────┘ └────┘      │
│                             │
│   Pickup location            │
│   (•) Same as my farm        │
│   ( ) Different location      │
│   [ mini map preview ]       │
│                             │
│   Available: ( Today ) 2 days│  ← perishability-aware
│        [ ○ ○ ○ ● ○ ]        │
│   [        NEXT  →        ] │
└─────────────────────────────┘
```

### 1.7 Step 5: voice read-back & confirm
```
┌─────────────────────────────┐
│  ‹ Please confirm 🔊         │
│                             │
│  🔊 "Tomato, 500 kilo,       │
│      18 rupees per kilo,     │
│      minimum 50 kilo,        │
│      pickup from your farm,  │
│      available today."       │
│   [ ▶ Play again ]           │
│                             │
│        [ ○ ○ ○ ○ ● ]        │
│   ┌───────────────────────┐ │
│   │     ✅  CONFIRM        │ │  ← big green
│   └───────────────────────┘ │
│   [ ✎ Edit ]                │
└─────────────────────────────┘
```
→ Toast: "Sent for review ✓" → returns to home with 🟡 Pending.

### 1.8 Seller order detail (after a buyer orders)
```
┌─────────────────────────────┐
│  ‹ Order #1042  🍅          │
│  Status: 🚚 Pickup scheduled │
│  ┌───────────────────────┐  │
│  │ Buyer: Suresh Traders │  │
│  │ Qty: 200 kg            │  │
│  │ Your payout: ₹3,600    │  │  ← farmer sees payout, not buyer price
│  │ Driver: Anand 🚚 4:30pm│  │
│  └───────────────────────┘  │
│  Pickup code:  ⬛ 4 8 2 1    │  ← shown to driver to confirm
│                             │
│  [ Call driver ]  [ Help ]   │
└─────────────────────────────┘
```

---

## 2. BUYER FLOW

### 2.1 Browse / search
```
┌─────────────────────────────┐
│  📍 Coimbatore   [ 🔍 ]      │
│  [ All ][ Veg ][ Fruit ][..] │  ← category chips
│                             │
│  ┌───────────────────────┐  │
│  │ 🍅 Tomato Grade A      │  │
│  │ ₹20/kg · MOQ 50kg      │  │  ← buyer price (incl. margin/fee)
│  │ 🚚 12 km · ⭐4.6        │  │
│  ├───────────────────────┤  │
│  │ 🍌 Banana · ₹45/dz     │  │
│  │ MOQ 20dz · 8km · ⭐4.8  │  │
│  └───────────────────────┘  │
│  [ Sort: distance ▾ ]        │
└─────────────────────────────┘
```

### 2.2 Listing detail
```
┌─────────────────────────────┐
│  ‹ [ photo carousel ]        │
│  Tomato — Grade A 🍅         │
│  ₹20 / kg                    │
│  ┌───────────────────────┐  │
│  │ Price breakdown ▾      │  │  ← farmer ₹18 + KANNI ₹1.50 + fee ₹0.50
│  └───────────────────────┘  │
│  MOQ: 50 kg · Available: 500kg│
│  Seller: Ravi ⭐4.6 · 12 km  │
│                             │
│  Quantity                    │
│   ┌───┐  100 kg  ┌───┐      │  ← must be ≥ MOQ; blocks below
│   │ − │          │ + │      │
│   └───┘          └───┘      │
│  Subtotal: ₹2,000            │
│   ┌───────────────────────┐ │
│   │   ADD TO CART  →      │ │
│   └───────────────────────┘ │
└─────────────────────────────┘
```
- If quantity < MOQ → button disabled + inline "Minimum 50 kg".

### 2.3 Checkout
```
┌─────────────────────────────┐
│  ‹ Checkout                  │
│  Deliver to:                 │
│  📍 Suresh Traders, Gandhipuram│  [ change ]
│                             │
│  Items (1 seller)            │
│  🍅 Tomato 100kg     ₹2,000  │
│  Logistics fee        ₹120   │
│  GST                  ₹—     │
│  ──────────────────────────  │
│  Total                ₹2,120 │
│                             │
│  Pay with:  ( UPI ) Card  COD│
│   ┌───────────────────────┐ │
│   │   PAY ₹2,120  →       │ │
│   └───────────────────────┘ │
└─────────────────────────────┘
```

### 2.4 Order tracking
```
┌─────────────────────────────┐
│  ‹ Order #1042               │
│  ●━━━●━━━○━━━○━━━○            │
│  Confirmed Pickup Picked Transit Delivered
│   assigned                   │
│  Driver: Anand 🚚  ETA 5:10pm │
│  [ live map ]                │
│  [ Call driver ] [ Support ] │
└─────────────────────────────┘
```

---

## 3. DRIVER FLOW (Rapido-style)

### 3.1 Driver onboarding
```
┌─────────────────────────────┐
│  Driver setup                │
│  📄 Driving licence  [ 📷 ]  │
│  📄 Vehicle RC       [ 📷 ]  │
│  Vehicle type:               │
│   ( Tempo ) Mini-truck  Truck│
│  Capacity (kg):              │
│   ┌───┐  1000  ┌───┐         │  ← critical for batching
│   │ − │        │ + │         │
│   └───┘        └───┘         │
│  🏦 Bank details   [ Add ]   │
│   [   SUBMIT FOR REVIEW  →  ]│
└─────────────────────────────┘
```
→ Pending admin verification → Active.

### 3.2 Driver home
```
┌─────────────────────────────┐
│  Anand 🚚   [ ONLINE ⬤ ]     │
│  Today: ₹1,240 · 3 trips     │
│                             │
│  Mode:  ( Direct )  Batch    │  ← toggle
│                             │
│  Nearby pickups              │
│  ┌───────────────────────┐  │
│  │ 🍅 200kg · 4km · ₹180  │  │
│  │ Ravi farm → Gandhipuram│  │
│  │   [ ACCEPT ]           │  │
│  └───────────────────────┘  │
└─────────────────────────────┘
```

### 3.3 Batch builder (the differentiator)
```
┌─────────────────────────────┐
│  ‹ Build a batch  🚚 1000kg  │
│  Capacity used: [▓▓▓▓░░] 600 │  ← live bar
│                             │
│  ☑ #1042 Tomato 200kg  4km   │
│  ☑ #1051 Onion  150kg  6km   │
│  ☑ #1063 Greens 250kg  7km   │
│  ☐ #1070 Potato 500kg  ✋too big│ ← greyed, won't fit
│                             │
│  Est. route: 22km · 3 stops  │
│  Est. earnings: ₹520         │
│  Run:  ( Now )  Tomorrow 6am │  ← scheduling
│   [   OPTIMIZE & START  →   ]│
└─────────────────────────────┘
```

### 3.4 Active route (multi-stop)
```
┌─────────────────────────────┐
│  Stop 1 of 3 — Pickup        │
│  📍 Ravi farm · 🍅 200kg     │
│  [ 🧭 NAVIGATE ]             │
│                             │
│  Capacity left: 400kg        │
│  Enter pickup code: ⬛⬛⬛⬛   │  ← matches seller's code
│   ┌───────────────────────┐ │
│   │   MARK PICKED UP  ✓   │ │  → capacity auto-updates
│   └───────────────────────┘ │
│  Next: Onion 150kg · 2km     │
└─────────────────────────────┘
```

### 3.5 Delivery proof
```
┌─────────────────────────────┐
│  Deliver to Suresh Traders   │
│  Drop OTP: [ ⬛⬛⬛⬛ ]        │
│  📷 [ Photo proof (optional)]│
│   [   MARK DELIVERED  ✓     ]│
│  Earnings +₹180 credited      │
└─────────────────────────────┘
```

---

## 4. ADMIN (WEB)

### 4.1 Listing review queue
```
┌──────────────────────────────────────────────┐
│ KANNI Admin   [ Listings ][ Users ][ Orders ] │
│ Review queue (12 pending)                      │
│ ┌────────────────────────────────────────────┐│
│ │ 🍅 Tomato · Ravi · 500kg · ₹18/kg · 📷×2   ││
│ │ Category [Veg ▾]  Grade [A ▾]               ││
│ │ Margin % [ 8 ]  Flat fee ₹[ 0.50 ]          ││
│ │ → Buyer price: ₹20.00/kg                     ││
│ │ [ ✅ Approve ]  [ ✏ Edit ]  [ ❌ Reject ]   ││
│ └────────────────────────────────────────────┘│
└──────────────────────────────────────────────┘
```

### 4.2 Other admin screens (list, lower fidelity for v1)
- **Users & KYC**: filter by role/status; approve seller payout KYC, buyer business, driver docs+vehicle.
- **Orders & disputes**: search order, view pricing breakdown, refund/cancel, reassign driver.
- **Pricing rules**: default margin/fee per category.
- **Logistics/zones**: define service areas, base/per-km/per-stop fares, batch bonus.
- **Reports**: GMV, conversion, on-time %, batch utilization.

---

## 5. Cross-cutting UX rules
- **Empty states** speak + show illustration + one CTA.
- **Errors** are spoken in-language, never raw codes.
- **Offline**: listing draft saved locally, syncs when back online (Phase 1 stretch).
- **Accessibility**: every interactive element has a spoken label; supports TalkBack.
- **Notifications**: order/pickup/payment events push + SMS + TTS in-app.

---

## 6. Screen inventory (build checklist for Phase 1)
| # | Screen | Role | Phase |
|---|--------|------|-------|
| 1 | Login + OTP | all | 1 |
| 2 | Role select | all | 1 |
| 3 | Seller onboarding | seller | 1 |
| 4 | Seller home | seller | 1 |
| 5 | Create listing (5 steps) | seller | 1 |
| 6 | Seller order detail | seller | 1 |
| 7 | Buyer onboarding | buyer | 1 |
| 8 | Browse/search | buyer | 1 |
| 9 | Listing detail | buyer | 1 |
| 10 | Checkout + pay | buyer | 1 |
| 11 | Order tracking | buyer | 1 |
| 12 | Driver onboarding | driver | 1 |
| 13 | Driver home + direct accept | driver | 1 |
| 14 | Active trip + delivery proof | driver | 1 |
| 15 | Batch builder + route | driver | **2** |
| 16 | Admin review queue | admin | 1 |
| 17 | Admin users/orders/pricing | admin | 1 |
```
