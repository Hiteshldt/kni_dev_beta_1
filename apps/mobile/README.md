# KANNI mobile app (Expo / React Native)

One app, role-gated (farmer / buyer / driver), vernacular and icon-driven — the
farmer-first USP from the PRD. Built with **Expo** so you can test on your own
phone by scanning a QR code; no Xcode/Android Studio needed.

## Test it on your phone

1. **Install "Expo Go"** from the App Store / Play Store on your phone.
2. **Start the API** (in `services/api`): `npm run start:dev` — it listens on
   `:3333` on your laptop. Phone and laptop must be on the **same Wi-Fi**.
3. **Start the app**:
   ```bash
   cd apps/mobile
   npm install      # first time only
   npm start
   ```
4. **Scan the QR code** shown in the terminal with Expo Go (Android) or the
   Camera app (iOS).

The app auto-detects the API at `http://<your-laptop-LAN-IP>:3333/api` (it reuses
the IP Expo already uses to serve the bundle). If it can't reach it, tap the
**API: …** line on the login screen and set it manually.

## Logging in

Phone + OTP. In dev the OTP is returned by the API and **filled in automatically**
— just tap **Verify**. On first login you pick a role (Farmer / Buyer / Driver).
Admins use the **web console** (`services/admin-web`), not this app.

To exercise the full loop with one device, sign in as each role using a different
phone number (e.g. `+919800000001` farmer, `…002` buyer, `…003` driver), and
approve the listing / verify the driver from the admin web console.

## What's built (Phase 1 scope)

- **Farmer**: vernacular icon grid → quantity stepper → price / MOQ / grade →
  🔊 voice read-back → list (pending review). My-produce list with status.
- **Buyer**: proximity browse → listing detail → quantity → pay (escrow). My
  orders with cancel.
- **Driver**: profile (vehicle + capacity), nearby pickup jobs → accept →
  pickup code → drop OTP → delivered. Earnings.
- **Language**: English / தமிழ் / മലയാളം toggle in every header; produce names
  come localised from the API; key text reads aloud via the device TTS.

## Notes

- Only Expo-Go-bundled native modules are used (`expo-location`,
  `expo-secure-store`, `expo-speech`) — no custom dev client required.
- Batch pickup, push/SMS, and real STT are later phases; dev uses the mock
  payment provider, so no keys are needed to test end to end.
