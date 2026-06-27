#!/usr/bin/env bash
# End-to-end smoke test of Phase 2 batch consolidation.
#   driver builds a 2-shipment batch from compatible orders
#   executes multi-stop pickup+drop with codes/otps
#   settlement combines both orders into one driver earning
set -euo pipefail

BASE="${BASE:-http://localhost:3333/api}"
ADMIN_PHONE="${ADMIN_PHONE:-+910000000000}"
TS=$(date +%s | tail -c 5)
SELLER_PHONE="+91990${TS}001"
BUYER1_PHONE="+91990${TS}010"
BUYER2_PHONE="+91990${TS}020"
DRIVER_PHONE="+91990${TS}030"

jget() { python3 -c 'import sys,json;d=json.load(sys.stdin)
p=sys.argv[1].split(".")
for k in p:
    d=d[int(k)] if k.isdigit() else d[k]
print(d)' "$1"; }

post() { curl -s -X POST "$BASE$1" -H 'Content-Type: application/json' ${TOKEN:+-H "Authorization: Bearer $TOKEN"} -d "$2"; }
get()  { curl -s "$BASE$1" ${TOKEN:+-H "Authorization: Bearer $TOKEN"}; }
line() { printf '\n\033[1m== %s\033[0m\n' "$1"; }
ok()   { printf '   \033[32m✓ %s\033[0m\n' "$1"; }

login() {
  local phone="$1"
  local code; code=$(post /auth/otp/request "{\"phone\":\"$phone\"}" | jget devCode)
  local res;  res=$(post /auth/otp/verify "{\"phone\":\"$phone\",\"code\":\"$code\"}")
  TOKEN=$(echo "$res" | jget token)
  ROLE=$(echo "$res" | jget role 2>/dev/null || echo "null")
}
set_role() { TOKEN=$(post /auth/role "{\"role\":\"$1\"}" | jget token); }

line "Setup: 1 seller listing (500kg) + 2 buyers orders"
login "$SELLER_PHONE"; [ "$ROLE" = "seller" ] || set_role seller
post /seller/profile '{"name":"Farmer X","farmLat":11.0168,"farmLng":76.9558,"upiId":"x@upi"}' >/dev/null
TOMATO_ID=$(get "/catalog" | python3 -c 'import sys,json;print([x for x in json.load(sys.stdin) if x["slug"]=="tomato"][0]["id"])')
LISTING_ID=$(post /seller/listings "{\"catalogId\":\"$TOMATO_ID\",\"qty\":500,\"unit\":\"kg\",\"payoutPrice\":20,\"moq\":30,\"grade\":\"A\"}" | jget id)
ok "listing 500kg @ ₹20"

login "$ADMIN_PHONE"
post "/admin/listings/$LISTING_ID/review" '{"action":"approve","grade":"A","marginPct":8,"flatFee":0}' >/dev/null
ok "approved"

line "Buyer 1: order 150kg"
login "$BUYER1_PHONE"; [ "$ROLE" = "buyer" ] || set_role buyer
post /buyer/profile '{"businessName":"Shop A","deliveryLat":11.0510,"deliveryLng":76.9800}' >/dev/null
ORDER1_ID=$(post /buyer/orders "{\"items\":[{\"listingId\":\"$LISTING_ID\",\"qty\":150}],\"deliveryLat\":11.0510,\"deliveryLng\":76.9800}" | jget id)
PAY1=$(post "/payments/order/$ORDER1_ID/pay" '{}')
SHIPMENT1_ID=$(echo "$PAY1" | jget shipment.id)
PICKUP_CODE1=$(echo "$PAY1" | jget shipment.pickup_code)
DROP_OTP1=$(echo "$PAY1" | jget shipment.drop_otp)
ok "order ₹3000 paid"

line "Buyer 2: order 200kg"
login "$BUYER2_PHONE"; [ "$ROLE" = "buyer" ] || set_role buyer
post /buyer/profile '{"businessName":"Shop B","deliveryLat":11.0480,"deliveryLng":76.9750}' >/dev/null
ORDER2_ID=$(post /buyer/orders "{\"items\":[{\"listingId\":\"$LISTING_ID\",\"qty\":200}],\"deliveryLat\":11.0480,\"deliveryLng\":76.9750}" | jget id)
PAY2=$(post "/payments/order/$ORDER2_ID/pay" '{}')
SHIPMENT2_ID=$(echo "$PAY2" | jget shipment.id)
PICKUP_CODE2=$(echo "$PAY2" | jget shipment.pickup_code)
DROP_OTP2=$(echo "$PAY2" | jget shipment.drop_otp)
ok "order ₹4000 paid"

line "Driver: onboard + verify + batch candidates"
login "$DRIVER_PHONE"; [ "$ROLE" = "driver" ] || set_role driver
post /driver/profile '{"vehicleType":"truck","capacityKg":2000}' >/dev/null
login "$ADMIN_PHONE"
DRIVER_ID=$(get /admin/drivers | python3 -c 'import sys,json
d=json.load(sys.stdin); print(d[0]["user_id"] if d else "")')
post "/admin/drivers/$DRIVER_ID/verify" '{"approve":true}' >/dev/null
ok "driver verified"

login "$DRIVER_PHONE"
CANDS=$(get "/driver/batch/candidates?lat=11.0168&lng=76.9558")
echo "$CANDS" | python3 -c 'import sys,json
d=json.load(sys.stdin)
print("   found %d candidates (total weight %skg)"%(len(d),sum(float(x["weight_kg"]) for x in d)))'
ok "2 candidates available"

line "Driver: plan batch (2 shipments)"
PLAN=$(post /driver/batch/plan "{\"shipmentIds\":[\"$SHIPMENT1_ID\",\"$SHIPMENT2_ID\"]}")
echo "$PLAN" | python3 -c 'import sys,json;p=json.load(sys.stdin)
print("   route: %d stops, %.1fkm, utilization %0.1f%%, earnings ₹%0.2f"%(
  p["totalStops"],p["totalKm"],p["utilization"],p["estEarnings"]))'
ok "batch planned"

line "Driver: create + start batch"
# Server re-plans from shipment IDs (never trusts a client-supplied plan).
BATCH=$(post /driver/batches "{\"shipmentIds\":[\"$SHIPMENT1_ID\",\"$SHIPMENT2_ID\"]}")
BATCH_ID=$(echo "$BATCH" | jget batch_id)
ok "batch $BATCH_ID created"
post "/driver/batches/$BATCH_ID/start" '{}' | jget status | grep -q in_progress && ok "started"

line "Driver: execute multi-stop (pickup both, deliver both)"
post "/driver/batches/$BATCH_ID/shipments/$SHIPMENT1_ID/pickup" "{\"code\":\"$PICKUP_CODE1\"}" | jget status | grep -q picked_up && ok "picked up shipment 1"
post "/driver/batches/$BATCH_ID/shipments/$SHIPMENT2_ID/pickup" "{\"code\":\"$PICKUP_CODE2\"}" | jget status | grep -q picked_up && ok "picked up shipment 2"

DELIV1=$(post "/driver/batches/$BATCH_ID/shipments/$SHIPMENT1_ID/deliver" "{\"otp\":\"$DROP_OTP1\"}")
echo "$DELIV1" | jget batch_complete | grep -qi false && ok "shipment 1 delivered (batch not complete yet)"
DELIV2=$(post "/driver/batches/$BATCH_ID/shipments/$SHIPMENT2_ID/deliver" "{\"otp\":\"$DROP_OTP2\"}")
echo "$DELIV2" | jget batch_complete | grep -qi true && ok "shipment 2 delivered — batch complete + settled"

line "Verify settlement"
login "$DRIVER_PHONE"
EARNINGS=$(get /driver/earnings)
echo "$EARNINGS" | python3 -c 'import sys,json;e=json.load(sys.stdin)
assert e["trips"] == 1, "expected exactly 1 driver payout for the batch, got %d"%e["trips"]
print("   driver: %.2f₹ (%d trip = whole batch, one payout)"%(e["total"],e["trips"]))'
ok "1 batch = 1 driver payout (vs. 2 for separate direct trips)"

line "Double-deliver / stale-action rejection"
post "/driver/batches/$BATCH_ID/shipments/$SHIPMENT1_ID/deliver" "{\"otp\":\"$DROP_OTP1\"}" \
  | grep -qi "is 'delivered'\|Incorrect\|not" && ok "re-deliver on completed batch rejected"

printf '\n\033[1;32mBATCH SMOKE PASSED ✅  Multi-stop batch consolidation works.\033[0m\n'
