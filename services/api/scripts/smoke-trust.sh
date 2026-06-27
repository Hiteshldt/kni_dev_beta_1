#!/usr/bin/env bash
# End-to-end smoke test of Sprint 7: notifications, ratings, refunds, settlement.
#   A) buyer cancels a paid order -> refund + restock + notifications
#   B) full delivery -> settlement record + buyer rates seller/driver + reputation
set -euo pipefail

BASE="${BASE:-http://localhost:3333/api}"
ADMIN_PHONE="${ADMIN_PHONE:-+910000000000}"
TS=$(date +%s | tail -c 5)
SELLER_PHONE="+91980${TS}001"
BUYER_PHONE="+91980${TS}002"
DRIVER_PHONE="+91980${TS}003"

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

TOMATO_ID=""
seed_listing() { # qty -> sets LISTING_ID (approved, live, 10% margin)
  login "$SELLER_PHONE"; [ "$ROLE" = "seller" ] || set_role seller
  post /seller/profile '{"name":"Ravi","farmLat":11.0168,"farmLng":76.9558,"upiId":"ravi@upi"}' >/dev/null
  [ -n "$TOMATO_ID" ] || TOMATO_ID=$(get "/catalog" | python3 -c 'import sys,json;print([x for x in json.load(sys.stdin) if x["slug"]=="tomato"][0]["id"])')
  LISTING_ID=$(post /seller/listings "{\"catalogId\":\"$TOMATO_ID\",\"qty\":$1,\"unit\":\"kg\",\"payoutPrice\":20,\"moq\":50,\"grade\":\"A\"}" | jget id)
  login "$ADMIN_PHONE"
  post "/admin/listings/$LISTING_ID/review" '{"action":"approve","grade":"A","marginPct":10,"flatFee":0}' >/dev/null
}

# ───────────────────────── PART A: cancel + refund + restock ─────────────────────────
line "A1. Seller lists 300kg, admin approves"
seed_listing 300
ok "listing $LISTING_ID live"

line "A2. Buyer orders 100kg and pays (escrow held)"
login "$BUYER_PHONE"; [ "$ROLE" = "buyer" ] || set_role buyer
post /buyer/profile '{"businessName":"Suresh Traders","deliveryLat":11.0510,"deliveryLng":76.9800}' >/dev/null
ORDER_A=$(post /buyer/orders "{\"items\":[{\"listingId\":\"$LISTING_ID\",\"qty\":100}],\"deliveryLat\":11.0510,\"deliveryLng\":76.9800}" | jget id)
post "/payments/order/$ORDER_A/pay" '{}' >/dev/null
ok "order $ORDER_A paid; 200kg should remain on listing"

line "A3. Buyer cancels the order"
CANCEL=$(post "/buyer/orders/$ORDER_A/cancel" '{"reason":"changed my mind"}')
echo "$CANCEL" | python3 -c 'import sys,json;c=json.load(sys.stdin)
assert c["status"]=="cancelled", c
print("   cancelled, refund ₹%s, restocked %d line(s)"%(c["refund_amount"],c["restocked"]))'
ok "order cancelled + refund issued"

# Verify restock: listing back to 300 and live.
get "/buyer/listings?lat=11.0510&lng=76.9800" | LISTING_ID="$LISTING_ID" python3 -c 'import sys,json,os
lid=os.environ["LISTING_ID"]
row=[x for x in json.load(sys.stdin) if x["id"]==lid]
assert row and float(row[0]["qty_remaining"])==300, "restock failed: %s"%row
print("   listing back to %skg, live"%row[0]["qty_remaining"])'
ok "stock restored (300kg)"

# Verify buyer notifications include cancel + refund.
get /notifications | python3 -c 'import sys,json
types=[n["type"] for n in json.load(sys.stdin)]
assert "order_cancelled" in types and "refund_issued" in types, types
assert "order_paid" in types, types
print("   buyer notifications:", ",".join(sorted(set(types))))'
ok "buyer got order_paid + order_cancelled + refund_issued"

# Double-cancel must be rejected.
post "/buyer/orders/$ORDER_A/cancel" '{}' | grep -qi "can no longer be cancelled\|cannot" && ok "re-cancel rejected"

# ───────────────────────── PART B: deliver + settlement + ratings ─────────────────────────
line "B1. Buyer orders 100kg again and pays"
ORDER_B=$(post /buyer/orders "{\"items\":[{\"listingId\":\"$LISTING_ID\",\"qty\":100}],\"deliveryLat\":11.0510,\"deliveryLng\":76.9800}" | jget id)
PAY=$(post "/payments/order/$ORDER_B/pay" '{}')
SHIP=$(echo "$PAY" | jget shipment.id)
PCODE=$(echo "$PAY" | jget shipment.pickup_code)
DOTP=$(echo "$PAY" | jget shipment.drop_otp)
ok "order $ORDER_B paid; shipment $SHIP"

line "B2. Driver onboards + admin verifies"
login "$DRIVER_PHONE"; [ "$ROLE" = "driver" ] || set_role driver
post /driver/profile '{"vehicleType":"tempo","capacityKg":1000}' >/dev/null
login "$ADMIN_PHONE"
DRIVER_ID=$(get /admin/drivers | DRIVER_PHONE="$DRIVER_PHONE" python3 -c 'import sys,json,os
ph=os.environ["DRIVER_PHONE"]
m=[d for d in json.load(sys.stdin) if d["phone"]==ph]
print(m[0]["user_id"] if m else "")')
post "/admin/drivers/$DRIVER_ID/verify" '{"approve":true}' >/dev/null
ok "driver $DRIVER_ID verified"

line "B3. Driver accepts, picks up, delivers (settlement runs)"
login "$DRIVER_PHONE"
post "/driver/jobs/$SHIP/accept" '{}' >/dev/null
post "/driver/shipments/$SHIP/pickup" "{\"code\":\"$PCODE\"}" >/dev/null
DELIV=$(post "/driver/shipments/$SHIP/deliver" "{\"otp\":\"$DOTP\"}")
echo "$DELIV" | python3 -c 'import sys,json;s=json.load(sys.stdin)["settlement"]["split"]
g,f,d,m=s["gross"],s["farmer_payout"],s["driver_earning"],s["kanni_margin"]
assert abs(g-(f+d+m))<0.01, ("books do not balance",s)
print("   split: gross ₹%s = farmer ₹%s + driver ₹%s + kanni ₹%s"%(g,f,d,m))'
ok "delivered; per-order settlement recorded + books balance"

line "B4. Buyer rates seller (5★) and driver (4★)"
login "$BUYER_PHONE"
SELLER_ID=$(post /ratings "{\"orderId\":\"$ORDER_B\",\"target\":\"seller\",\"score\":5,\"comment\":\"fresh\"}" | jget to_user)
post /ratings "{\"orderId\":\"$ORDER_B\",\"target\":\"driver\",\"score\":4}" | jget score | grep -q 4 && ok "seller + driver rated"

# Duplicate rating must be rejected.
post /ratings "{\"orderId\":\"$ORDER_B\",\"target\":\"seller\",\"score\":1}" | grep -qi "already rated" && ok "duplicate rating rejected"

line "B5. Seller reputation reflects the 5★"
get "/ratings/user/$SELLER_ID" | python3 -c 'import sys,json;r=json.load(sys.stdin)
print("   seller: %s★ over %d rating(s), reliability %d/100, delivered %d/%d"%(
  r["avg_stars"],r["ratings_count"],r["reliability_score"],r["delivered_orders"],r["total_orders"]))
assert float(r["avg_stars"])==5.0, r'
ok "reputation computed"

line "B6. Notifications fired across the lifecycle"
login "$DRIVER_PHONE"
get /notifications | python3 -c 'import sys,json
t=[n["type"] for n in json.load(sys.stdin)]
assert "driver_earning" in t, t
print("   driver:", ",".join(sorted(set(t))))'

# Payout went through the gateway: paid + has a gateway reference.
get /driver/earnings | python3 -c 'import sys,json
p=json.load(sys.stdin)["recent"][0]
assert p["status"]=="paid" and p["gateway_ref"], p
print("   payout %s via %s ref %s"%(p["status"],p["gateway"],p["gateway_ref"][:16]))'
ok "driver payout settled through payment provider"
login "$BUYER_PHONE"
get /notifications | python3 -c 'import sys,json
t=[n["type"] for n in json.load(sys.stdin)]
assert "delivered" in t and "picked_up" in t and "pickup_assigned" in t, t
print("   buyer:", ",".join(sorted(set(t))))'
ok "buyer + driver notifications complete"

printf '\n\033[1;32mTRUST SMOKE PASSED ✅  notifications + ratings + refunds + settlement work.\033[0m\n'
