# KANNI — Deployment runbook

Target: **Neon** (Postgres) + **Render** (API + admin console) + **EAS** (Android APK).
Everything below uses free tiers. Steps that need *you* are marked **[you]**.

---

## 0. One-time: push the repo to GitHub

Render and EAS deploy from a Git repo.

```bash
cd "/Users/hiteshgupta/Vs Code/kanni"
git add -A && git commit -m "KANNI: API + admin + mobile + deploy config"
# [you] create an empty GitHub repo, then:
git remote add origin https://github.com/<you>/kanni.git
git push -u origin main
```

> `.env`, `node_modules`, and `services/api/uploads/` are git-ignored — secrets and
> the DB password are **not** committed.

---

## 1. Database — Neon ✅ (done)

Already created and migrated. For reference, to re-run migrations later:

```bash
cd services/api
DATABASE_URL='postgresql://neondb_owner:...@ep-...neon.tech/neondb?sslmode=require' \
  npm run db:migrate && \
DATABASE_URL='...' npm run db:seed
```

Use the **pooler** host for the app runtime (Render), and either host for migrations.

---

## 2. API + admin console → Render

Render reads `render.yaml` at the repo root and creates both services.

1. **[you]** Render dashboard → **New +** → **Blueprint** → pick your GitHub repo → Apply.
2. It creates `kanni-api` (web service) and `kanni-admin` (static site).
3. **[you]** On **kanni-api** → Environment → set `DATABASE_URL` to the Neon **pooler**
   connection string (ends with `-pooler.…neon.tech/neondb?sslmode=require`).
   `JWT_SECRET` is auto-generated; `OTP_PROVIDER=dev` and `PAYMENT_PROVIDER=mock`
   are pre-set so it works with no other accounts.
4. Wait for the deploy. Health check is `GET /api/catalog`. You'll get URLs like:
   - API: `https://kanni-api.onrender.com`
   - Admin: `https://kanni-admin.onrender.com`
5. **Admin console** — open it pointed at the API:
   `https://kanni-admin.onrender.com/?api=https://kanni-api.onrender.com/api`
   (the `?api=` is remembered in the browser). Sign in with `+910000000000`.

**Free-tier notes**
- The API **sleeps after ~15 min idle**; the first request then takes ~30–60s to wake.
  Neon also scales to zero — same idea. Fine for a pilot.
- **Uploaded images are ephemeral** on Render free (no persistent disk) — they
  survive until the next deploy/restart. For permanent images, add a Render Disk
  (paid) or switch storage to Cloudflare R2 / S3 (small code change, later).

---

## 3. Android APK → EAS Build

This produces an installable `.apk` you can share/sideload.

1. **[you]** Create a free Expo account at expo.dev.
2. Point the app at the deployed API — edit `apps/mobile/app.json`, set:
   ```json
   "extra": { "apiUrl": "https://kanni-api.onrender.com/api" }
   ```
3. Build:
   ```bash
   cd apps/mobile
   npx eas-cli login           # [you] your Expo account
   npx eas-cli build -p android --profile preview
   ```
   The `preview` profile (in `eas.json`) builds an **APK** with internal
   distribution. When it finishes, EAS gives a download link / QR — install it on
   any Android phone (no Play Store needed).
4. Later, for the Play Store: `--profile production` builds an `.aab`, then
   `npx eas-cli submit -p android`. **[you]** needs a Play Console account ($25 once).

iOS via App Store needs an Apple Developer account ($99/yr) and `--profile production`
for iOS — do this after Android is validated.

---

## 4. Real SMS OTP (MSG91) — when ready

The OTP code path is already seamed (`OTP_PROVIDER`); today it's `dev` (code returned
in the response). To send real SMS:

- **Cost / free:** MSG91 has **no open free tier** for the OTP widget — you load a
  small wallet (a few hundred ₹ ≈ hundreds of test OTPs). Their **Startup program**
  gives 25,000 free SMS/month for 6 months, **but** requires a *company-domain* email
  (gmail/outlook are auto-rejected) and approval.
- **India catch:** production SMS needs **DLT registration** (sender ID + approved
  templates), which needs a registered business + a few days. Until then, keep
  `OTP_PROVIDER=dev` for the pilot APK.
- When ready, I'll add the MSG91 adapter behind the existing seam and you set
  `OTP_PROVIDER=msg91` + the key in Render.

---

## 5. Live payments (Razorpay) — when ready

Adapter + webhook already built. Set `PAYMENT_PROVIDER=razorpay` + keys in Render,
and create a RazorpayX fund account per farmer/driver at onboarding. Do this last.
