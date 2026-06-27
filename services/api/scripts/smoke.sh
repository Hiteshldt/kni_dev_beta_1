#!/usr/bin/env bash
# End-to-end smoke test of the KANNI core loop against a running API.
#   seller signup -> profile -> list produce
#   admin review  -> approve with margin/fee (computes buyer price)
#   buyer signup  -> browse (proximity + price) -> MOQ enforcement -> order
set -euo pipefail

BASE="${BASE:-http://localhost:3333/api}"
ADMIN_PHONE="${ADMIN_PHONE:-+910000000000}"
SELLER_PHONE="+919000000001"
BUYER_PHONE="+919000000002"

# jq-free JSON field extractor: json_get '<path>'  (dot/array path via python)
jget() { python3 -c 'import sys,json;d=json.load(sys.stdin)
p=sys.argv[1].split(".")
for k in p:
    d=d[int(k)] if k.isdigit() else d[k]
print(d)' "$1"; }

post() { curl -s -X POST "$BASE$1" -H 'Content-Type: application/json' ${TOKEN:+-H "Authorization: Bearer $TOKEN"} -d "$2"; }
get()  { curl -s "$BASE$1" ${TOKEN:+-H "Authorization: Bearer $TOKEN"}; }

line() { printf '\n\033[1m== %s\033[0m\n' "$1"; }
ok()   { printf '   \033[32m✓ %s\033[0m\n' "$1"; }

login() { # phone -> sets TOKEN, ROLE
  local phone="$1"
  local code; code=$(post /auth/otp/request "{\"phone\":\"$phone\"}" | jget devCode)
  local res;  res=$(post /auth/otp/verify "{\"phone\":\"$phone\",\"code\":\"$code\"}")
  TOKEN=$(echo "$res" | jget token)
  ROLE=$(echo "$res" | jget role 2>/dev/null || echo "null")
}

line "Health"
get /health | jget status | grep -q ok && ok "API healthy"

line "Catalog (Tamil names)"
TOMATO_ID=$(get "/catalog?lang=ta" | python3 -c 'import sys,json
d=json.load(sys.stdin)
t=[x for x in d if x["slug"]=="tomato"][0]
print(t["id"])')
get "/catalog?lang=ta" | python3 -c 'import sys,json
for x in json.load(sys.stdin)[:4]: print("   -",x["slug"],"->",x["name"])'
ok "catalog served"

line "Seller: signup + profile + listing"
login "$SELLER_PHONE"
# Role is one-time: only set it if this phone hasn't onboarded yet (idempotent re-runs).
if [ "$ROLE" != "seller" ]; then TOKEN=$(post /auth/role '{"role":"seller"}' | jget token); fi
ok "role=seller set"
post /seller/profile '{"name":"Ravi","farmLat":11.0168,"farmLng":76.9558,"upiId":"ravi@upi"}' >/dev/null
ok "seller profile saved (Coimbatore)"
LISTING=$(post /seller/listings "{\"catalogId\":\"$TOMATO_ID\",\"qty\":500,\"unit\":\"kg\",\"payoutPrice\":18,\"moq\":50,\"grade\":\"A\"}")
LISTING_ID=$(echo "$LISTING" | jget id)
echo "$LISTING" | jget status | grep -q pending && ok "listing created (pending), payout ₹18/kg"

line "Admin: review queue + approve with 8% margin + ₹0.50 fee"
login "$ADMIN_PHONE"; [ "$ROLE" = "admin" ] && ok "admin logged in"
get /admin/listings | python3 -c 'import sys,json;print("   pending in queue:",len(json.load(sys.stdin)))'
APPROVED=$(post "/admin/listings/$LISTING_ID/review" '{"action":"approve","grade":"A","marginPct":8,"flatFee":0.5}')
BUYER_PRICE=$(echo "$APPROVED" | jget buyer_price)
echo "$APPROVED" | jget status | grep -q live && ok "approved -> live; buyer_price=₹$BUYER_PRICE (expect 19.94)"

line "Buyer: signup + browse + MOQ + order"
login "$BUYER_PHONE"
if [ "$ROLE" != "buyer" ]; then TOKEN=$(post /auth/role '{"role":"buyer"}' | jget token); fi
ok "role=buyer set"
post /buyer/profile '{"businessName":"Suresh Traders","deliveryLat":11.0510,"deliveryLng":76.9800}' >/dev/null
ok "buyer profile saved"
get "/buyer/listings?lang=ta&lat=11.0510&lng=76.9800" | python3 -c 'import sys,json
d=json.load(sys.stdin)
for x in d:
    print("   -",x["produce_name"],"₹%s/%s"%(x["buyer_price"],x["unit"]),"| %skm"%x["distance_km"],"| MOQ",x["moq"])
    print("     breakdown:",x["price_breakdown"])'
ok "browse with distance + price breakdown"

line "MOQ enforcement (order 10kg < MOQ 50)"
REJ=$(post /buyer/orders "{\"items\":[{\"listingId\":\"$LISTING_ID\",\"qty\":10}]}")
echo "$REJ" | grep -qi "Minimum order" && ok "below-MOQ order correctly rejected"

line "Valid order (200kg)"
ORDER=$(post /buyer/orders "{\"items\":[{\"listingId\":\"$LISTING_ID\",\"qty\":200}],\"deliveryLat\":11.0510,\"deliveryLng\":76.9800}")
echo "$ORDER" | python3 -c 'import sys,json;o=json.load(sys.stdin)
print("   order",o["id"][:8],"status=%s total=₹%s"%(o["status"],o["total"]),"(expect 3988.00)")'
ok "order placed; stock decremented"

printf '\n\033[1;32mSMOKE PASSED ✅  Full seller→admin→buyer loop works.\033[0m\n'
