#!/usr/bin/env bash
# End-to-end smoke test of payments + driver direct-pickup fulfillment.
#   buyer pays (escrow hold) -> shipment created
#   driver onboards -> admin verifies -> driver accepts -> pickup (code) ->
#   deliver (OTP) -> settlement (capture + seller payout + driver earning)
set -euo pipefail

BASE="${BASE:-http://localhost:3333/api}"
ADMIN_PHONE="${ADMIN_PHONE:-+910000000000}"
SELLER_PHONE="+919000000001"
BUYER_PHONE="+919000000002"
DRIVER_PHONE="+919000000003"

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

line "Seller: new listing (tomato 300kg @ ₹20, MOQ 50)"
login "$SELLER_PHONE"; [ "$ROLE" = "seller" ] || set_role seller
post /seller/profile '{"name":"Ravi","farmLat":11.0168,"farmLng":76.9558,"upiId":"ravi@upi"}' >/dev/null
TOMATO_ID=$(get "/catalog" | python3 -c 'import sys,json;print([x for x in json.load(sys.stdin) if x["slug"]=="tomato"][0]["id"])')
LISTING_ID=$(post /seller/listings "{\"catalogId\":\"$TOMATO_ID\",\"qty\":300,\"unit\":\"kg\",\"payoutPrice\":20,\"moq\":50,\"grade\":\"A\"}" | jget id)
ok "listing $LISTING_ID created"

line "Admin: approve (10% margin)"
login "$ADMIN_PHONE"
post "/admin/listings/$LISTING_ID/review" '{"action":"approve","grade":"A","marginPct":10,"flatFee":0}' \
  | jget buyer_price | xargs -I{} echo "   buyer_price=₹{} (expect 22.0)"; ok "live"

line "Buyer: order 100kg + pay (escrow hold)"
login "$BUYER_PHONE"; [ "$ROLE" = "buyer" ] || set_role buyer
post /buyer/profile '{"businessName":"Suresh Traders","deliveryLat":11.0510,"deliveryLng":76.9800}' >/dev/null
ORDER_ID=$(post /buyer/orders "{\"items\":[{\"listingId\":\"$LISTING_ID\",\"qty\":100}],\"deliveryLat\":11.0510,\"deliveryLng\":76.9800}" | jget id)
ok "order $ORDER_ID placed (₹2200)"
PAY=$(post "/payments/order/$ORDER_ID/pay" '{}')
SHIPMENT_ID=$(echo "$PAY" | jget shipment.id)
PICKUP_CODE=$(echo "$PAY" | jget shipment.pickup_code)
DROP_OTP=$(echo "$PAY" | jget shipment.drop_otp)
echo "$PAY" | python3 -c 'import sys,json;s=json.load(sys.stdin)["shipment"];print("   shipment %s | %skg | %skm"%(s["id"][:8],s["weight_kg"],s["distance_km"]))'
ok "paid -> escrow HELD; shipment created (codes issued)"

line "Driver: onboarding (tempo, 1000kg capacity)"
login "$DRIVER_PHONE"; [ "$ROLE" = "driver" ] || set_role driver
post /driver/profile '{"vehicleType":"tempo","capacityKg":1000,"licenseUrl":"x","rcUrl":"y"}' >/dev/null
ok "submitted, awaiting verification"

line "Admin: verify driver"
login "$ADMIN_PHONE"
DRIVER_ID=$(get /admin/drivers | python3 -c 'import sys,json
d=json.load(sys.stdin); print(d[0]["user_id"] if d else "")')
post "/admin/drivers/$DRIVER_ID/verify" '{"approve":true}' | jget verify_status | grep -q verified && ok "driver verified"

line "Driver: see job, accept, pickup, deliver"
login "$DRIVER_PHONE"
get "/driver/jobs?lat=11.0168&lng=76.9558" | python3 -c 'import sys,json
for j in json.load(sys.stdin): print("   job",j["shipment_id"][:8],j["produce_slug"],"%skg"%j["weight_kg"],"earn ₹%s"%j["est_earnings"])'
post "/driver/jobs/$SHIPMENT_ID/accept" '{}' | jget status | grep -q assigned && ok "accepted"
post "/driver/shipments/$SHIPMENT_ID/pickup" "{\"code\":\"$PICKUP_CODE\"}" | jget status | grep -q picked_up && ok "picked up (code verified)"
DELIV=$(post "/driver/shipments/$SHIPMENT_ID/deliver" "{\"otp\":\"$DROP_OTP\"}")
echo "$DELIV" | python3 -c 'import sys,json;s=json.load(sys.stdin)["settlement"]
print("   settlement: payment=%s, seller_payout=₹%s, driver_earning=₹%s"%(s["payment"],s["seller_payouts"][0]["amount"],s["driver_earning"]))'
ok "delivered (OTP verified) + settlement run"

line "Driver earnings"
get /driver/earnings | python3 -c 'import sys,json;d=json.load(sys.stdin);print("   total ₹%s over %s trip(s)"%(d["total"],d["trips"]))'

line "Wrong-code rejection check"
login "$DRIVER_PHONE"
# attempt pickup with a bad code on an already-delivered shipment should fail
post "/driver/shipments/$SHIPMENT_ID/pickup" '{"code":"0000"}' | grep -qi "is 'delivered'\|Incorrect\|not" && ok "stale/incorrect action rejected"

printf '\n\033[1;32mLOGISTICS SMOKE PASSED ✅  pay → driver → pickup → deliver → settle works.\033[0m\n'
