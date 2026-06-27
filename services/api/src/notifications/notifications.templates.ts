/**
 * Notification templates in the three launch languages. Each renderer takes
 * a small `vars` bag and returns { title, body }. Keep these short — they're
 * read aloud (TTS) to low-literacy users, so plain words and numbers only.
 */
export type NotifType =
  | 'order_paid'
  | 'new_pickup' // to seller: a buyer paid, prepare produce
  | 'pickup_assigned'
  | 'picked_up'
  | 'delivered'
  | 'payout_released'
  | 'driver_earning'
  | 'order_cancelled'
  | 'refund_issued'
  | 'listing_live' // to seller: admin approved (or auto-approved) the listing
  | 'listing_rejected';

type Vars = Record<string, string | number>;
type Rendered = { title: string; body: string };
type Lang = 'en' | 'ta' | 'ml';

const T: Record<NotifType, Record<Lang, (v: Vars) => Rendered>> = {
  order_paid: {
    en: (v) => ({ title: 'Order confirmed', body: `Your order of ₹${v.amount} is confirmed. We are arranging pickup.` }),
    ta: (v) => ({ title: 'ஆர்டர் உறுதியானது', body: `₹${v.amount} ஆர்டர் உறுதியானது. பிக்கப் ஏற்பாடு செய்கிறோம்.` }),
    ml: (v) => ({ title: 'ഓർഡർ ഉറപ്പായി', body: `₹${v.amount} ഓർഡർ ഉറപ്പായി. പിക്കപ്പ് ക്രമീകരിക്കുന്നു.` }),
  },
  new_pickup: {
    en: (v) => ({ title: 'New order to pack', body: `${v.qty} ${v.produce} sold. Keep it ready. Pickup code: ${v.code}.` }),
    ta: (v) => ({ title: 'புதிய ஆர்டர்', body: `${v.qty} ${v.produce} விற்பனையானது. தயாராக வைக்கவும். பிக்கப் குறியீடு: ${v.code}.` }),
    ml: (v) => ({ title: 'പുതിയ ഓർഡർ', body: `${v.qty} ${v.produce} വിറ്റു. തയ്യാറാക്കി വെക്കൂ. പിക്കപ്പ് കോഡ്: ${v.code}.` }),
  },
  pickup_assigned: {
    en: (v) => ({ title: 'Driver assigned', body: `A driver is coming to collect order ${v.orderShort}.` }),
    ta: (v) => ({ title: 'ஓட்டுநர் நியமிக்கப்பட்டார்', body: `ஆர்டர் ${v.orderShort} எடுக்க ஓட்டுநர் வருகிறார்.` }),
    ml: (v) => ({ title: 'ഡ്രൈവറെ നിയോഗിച്ചു', body: `ഓർഡർ ${v.orderShort} എടുക്കാൻ ഡ്രൈവർ വരുന്നു.` }),
  },
  picked_up: {
    en: (v) => ({ title: 'Picked up', body: `Order ${v.orderShort} is on the way. Share OTP ${v.otp} at delivery.` }),
    ta: (v) => ({ title: 'எடுக்கப்பட்டது', body: `ஆர்டர் ${v.orderShort} வழியில் உள்ளது. டெலிவரியில் OTP ${v.otp} கொடுக்கவும்.` }),
    ml: (v) => ({ title: 'പിക്കപ്പ് ചെയ്തു', body: `ഓർഡർ ${v.orderShort} വഴിയിലാണ്. ഡെലിവറിയിൽ OTP ${v.otp} നൽകൂ.` }),
  },
  delivered: {
    en: (v) => ({ title: 'Delivered', body: `Order ${v.orderShort} was delivered. Thank you!` }),
    ta: (v) => ({ title: 'டெலிவரி ஆனது', body: `ஆர்டர் ${v.orderShort} டெலிவரி ஆனது. நன்றி!` }),
    ml: (v) => ({ title: 'ഡെലിവർ ചെയ്തു', body: `ഓർഡർ ${v.orderShort} ഡെലിവർ ചെയ്തു. നന്ദി!` }),
  },
  payout_released: {
    en: (v) => ({ title: 'Payment released', body: `₹${v.amount} for your produce is being paid to you.` }),
    ta: (v) => ({ title: 'பணம் வழங்கப்பட்டது', body: `உங்கள் விளைபொருளுக்கு ₹${v.amount} உங்களுக்கு வழங்கப்படுகிறது.` }),
    ml: (v) => ({ title: 'പണം നൽകി', body: `നിങ്ങളുടെ വിളവിന് ₹${v.amount} നൽകുന്നു.` }),
  },
  driver_earning: {
    en: (v) => ({ title: 'Trip paid', body: `You earned ₹${v.amount} for this delivery.` }),
    ta: (v) => ({ title: 'பயணம் முடிந்தது', body: `இந்த டெலிவரிக்கு ₹${v.amount} சம்பாதித்தீர்கள்.` }),
    ml: (v) => ({ title: 'ട്രിപ്പ് പൂർത്തിയായി', body: `ഈ ഡെലിവറിക്ക് ₹${v.amount} നേടി.` }),
  },
  order_cancelled: {
    en: (v) => ({ title: 'Order cancelled', body: `Order ${v.orderShort} was cancelled.` }),
    ta: (v) => ({ title: 'ஆர்டர் ரத்து', body: `ஆர்டர் ${v.orderShort} ரத்து செய்யப்பட்டது.` }),
    ml: (v) => ({ title: 'ഓർഡർ റദ്ദാക്കി', body: `ഓർഡർ ${v.orderShort} റദ്ദാക്കി.` }),
  },
  refund_issued: {
    en: (v) => ({ title: 'Refund issued', body: `₹${v.amount} for order ${v.orderShort} will be refunded.` }),
    ta: (v) => ({ title: 'பணம் திரும்பப்பெறப்படும்', body: `ஆர்டர் ${v.orderShort} க்கு ₹${v.amount} திரும்ப வழங்கப்படும்.` }),
    ml: (v) => ({ title: 'റീഫണ്ട്', body: `ഓർഡർ ${v.orderShort} ന് ₹${v.amount} തിരികെ നൽകും.` }),
  },
  listing_live: {
    en: (v) => ({ title: 'Listing live', body: `Your ${v.produce} is now live for buyers at ₹${v.price}.` }),
    ta: (v) => ({ title: 'பட்டியல் நேரலை', body: `உங்கள் ${v.produce} இப்போது ₹${v.price} விலையில் வாங்குபவர்களுக்கு கிடைக்கிறது.` }),
    ml: (v) => ({ title: 'ലിസ്റ്റിംഗ് ലൈവ്', body: `നിങ്ങളുടെ ${v.produce} ഇപ്പോൾ ₹${v.price}-ന് വാങ്ങുന്നവർക്ക് ലഭ്യമാണ്.` }),
  },
  listing_rejected: {
    en: (v) => ({ title: 'Listing not approved', body: `Your ${v.produce} listing was not approved. ${v.reason}` }),
    ta: (v) => ({ title: 'பட்டியல் அங்கீகரிக்கப்படவில்லை', body: `உங்கள் ${v.produce} பட்டியல் அங்கீகரிக்கப்படவில்லை. ${v.reason}` }),
    ml: (v) => ({ title: 'ലിസ്റ്റിംഗ് അംഗീകരിച്ചില്ല', body: `നിങ്ങളുടെ ${v.produce} ലിസ്റ്റിംഗ് അംഗീകരിച്ചില്ല. ${v.reason}` }),
  },
};

export function render(type: NotifType, lang: string, vars: Vars): Rendered {
  const byLang = T[type];
  if (!byLang) return { title: type, body: JSON.stringify(vars) };
  const fn = byLang[(lang as Lang)] ?? byLang.en;
  return fn(vars);
}
