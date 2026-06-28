// Tiny i18n. UI strings in English / Tamil / Malayalam — KANNI's farmer-first
// USP is vernacular, voice-and-icon UI. Catalog produce names already come
// localised from the API; these are the app-chrome strings.
export type Lang = 'en' | 'ta' | 'ml';

export const LANGS: { code: Lang; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'ml', label: 'മലയാളം' },
];

type Dict = Record<string, { en: string; ta: string; ml: string }>;

const T: Dict = {
  appTagline: {
    en: 'Sell your harvest. Simply.',
    ta: 'உங்கள் விளைச்சலை எளிதாக விற்பனை செய்யுங்கள்.',
    ml: 'നിങ്ങളുടെ വിളവ് എളുപ്പത്തിൽ വിൽക്കൂ.',
  },
  phone: { en: 'Mobile number', ta: 'மொபைல் எண்', ml: 'മൊബൈൽ നമ്പർ' },
  sendOtp: { en: 'Send code', ta: 'குறியீட்டை அனுப்பு', ml: 'കോഡ് അയയ്ക്കുക' },
  enterOtp: { en: 'Enter the code', ta: 'குறியீட்டை உள்ளிடவும்', ml: 'കോഡ് നൽകുക' },
  verify: { en: 'Verify', ta: 'சரிபார்', ml: 'പരിശോധിക്കുക' },
  chooseRole: { en: 'I am a…', ta: 'நான் ஒரு…', ml: 'ഞാൻ ഒരു…' },
  seller: { en: 'Farmer', ta: 'விவசாயி', ml: 'കർഷകൻ' },
  buyer: { en: 'Buyer', ta: 'வாங்குபவர்', ml: 'വാങ്ങുന്നയാൾ' },
  driver: { en: 'Driver', ta: 'ஓட்டுநர்', ml: 'ഡ്രൈവർ' },
  admin: { en: 'Admin', ta: 'நிர்வாகி', ml: 'അഡ്മിൻ' },
  newListing: { en: 'Sell produce', ta: 'விளைபொருள் விற்க', ml: 'ഉൽപ്പന്നം വിൽക്കുക' },
  myListings: { en: 'My produce', ta: 'என் பொருட்கள்', ml: 'എന്റെ ഉൽപ്പന്നങ്ങൾ' },
  pickProduce: { en: 'What are you selling?', ta: 'எதை விற்கிறீர்கள்?', ml: 'എന്താണ് വിൽക്കുന്നത്?' },
  quantity: { en: 'How much? (kg)', ta: 'எவ்வளவு? (கிலோ)', ml: 'എത്ര? (കിലോ)' },
  price: { en: 'Your price (₹/kg)', ta: 'உங்கள் விலை (₹/கிலோ)', ml: 'നിങ്ങളുടെ വില (₹/കിലോ)' },
  moq: { en: 'Min. order (kg)', ta: 'குறைந்தபட்ச ஆர்டர் (கிலோ)', ml: 'കുറഞ്ഞ ഓർഡർ (കിലോ)' },
  grade: { en: 'Quality', ta: 'தரம்', ml: 'ഗുണനിലവാരം' },
  submit: { en: 'List it', ta: 'பட்டியலிடு', ml: 'ലിസ്റ്റ് ചെയ്യുക' },
  browse: { en: 'Buy produce', ta: 'பொருட்களை வாங்கு', ml: 'ഉൽപ്പന്നം വാങ്ങുക' },
  orders: { en: 'My orders', ta: 'என் ஆர்டர்கள்', ml: 'എന്റെ ഓർഡറുകൾ' },
  jobs: { en: 'Pickup jobs', ta: 'பிக்கப் வேலைகள்', ml: 'പിക്കപ്പ് ജോലികൾ' },
  earnings: { en: 'Earnings', ta: 'வருமானம்', ml: 'വരുമാനം' },
  profile: { en: 'Profile', ta: 'சுயவிவரம்', ml: 'പ്രൊഫൈൽ' },
  logout: { en: 'Log out', ta: 'வெளியேறு', ml: 'ലോഗൗട്ട്' },
  save: { en: 'Save', ta: 'சேமி', ml: 'സംരക്ഷിക്കുക' },
  cancel: { en: 'Cancel', ta: 'ரத்து செய்', ml: 'റദ്ദാക്കുക' },
  buyNow: { en: 'Buy now', ta: 'இப்போது வாங்கு', ml: 'ഇപ്പോൾ വാങ്ങുക' },
  payNow: { en: 'Pay now', ta: 'இப்போது செலுத்து', ml: 'ഇപ്പോൾ പണമടയ്ക്കുക' },
  accept: { en: 'Accept', ta: 'ஏற்றுக்கொள்', ml: 'സ്വീകരിക്കുക' },
  loading: { en: 'Loading…', ta: 'ஏற்றுகிறது…', ml: 'ലോഡുചെയ്യുന്നു…' },
  near: { en: 'Near you', ta: 'உங்களுக்கு அருகில்', ml: 'നിങ്ങൾക്കടുത്ത്' },
  away: { en: 'away', ta: 'தொலைவில்', ml: 'അകലെ' },
  perUnit: { en: '/kg', ta: '/கிலோ', ml: '/കിലോ' },
  retry: { en: 'Retry', ta: 'மீண்டும் முயற்சி', ml: 'വീണ്ടും ശ്രമിക്കുക' },
  empty: { en: 'Nothing here yet.', ta: 'இங்கே எதுவும் இல்லை.', ml: 'ഇവിടെ ഒന്നുമില്ല.' },
  notifications: { en: 'Notifications', ta: 'அறிவிப்புகள்', ml: 'അറിയിപ്പുകൾ' },
  soldBy: { en: 'Sold by', ta: 'விற்பவர்', ml: 'വിൽക്കുന്നയാൾ' },
  call: { en: 'Call', ta: 'அழை', ml: 'വിളിക്കൂ' },
  directions: { en: 'Directions', ta: 'வழி', ml: 'വഴി' },
  reviews: { en: 'Reviews', ta: 'மதிப்புரைகள்', ml: 'അവലോകനങ്ങൾ' },
  noReviews: { en: 'No reviews yet', ta: 'இன்னும் மதிப்புரைகள் இல்லை', ml: 'അവലോകനങ്ങൾ ഇല്ല' },
  delivered: { en: 'delivered', ta: 'வழங்கப்பட்டது', ml: 'ഡെലിവർ ചെയ്തു' },
  rate: { en: 'Rate', ta: 'மதிப்பிடு', ml: 'റേറ്റ് ചെയ്യൂ' },
  rateSeller: { en: 'Rate the farmer', ta: 'விவசாயியை மதிப்பிடு', ml: 'കർഷകനെ റേറ്റ് ചെയ്യൂ' },
  rateDriver: { en: 'Rate the driver', ta: 'ஓட்டுநரை மதிப்பிடு', ml: 'ഡ്രൈവറെ റേറ്റ് ചെയ്യൂ' },
  writeComment: { en: 'Add a comment (optional)', ta: 'கருத்து சேர் (விருப்பம்)', ml: 'അഭിപ്രായം ചേർക്കൂ (ഓപ്ഷണൽ)' },
  submitReview: { en: 'Submit', ta: 'சமர்ப்பி', ml: 'സമർപ്പിക്കൂ' },
  welcome: { en: 'Welcome 👋', ta: 'வரவேற்கிறோம் 👋', ml: 'സ്വാഗതം 👋' },
  setupProfile: {
    en: 'Tell us about you to get started.',
    ta: 'தொடங்க உங்களைப் பற்றி சொல்லுங்கள்.',
    ml: 'തുടങ്ങാൻ നിങ്ങളെക്കുറിച്ച് പറയൂ.',
  },
};

export function tr(lang: Lang, key: keyof typeof T): string {
  const e = T[key];
  return e ? e[lang] : (key as string);
}

// Pick the right localised produce name from an API `names` jsonb blob.
export function produceName(names: any, lang: Lang): string {
  if (!names) return '';
  return names[lang] || names.en || Object.values(names)[0] || '';
}
