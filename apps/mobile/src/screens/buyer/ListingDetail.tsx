import React, { useEffect, useState } from 'react';
import { Alert, Image, Linking, Platform, Text, TouchableOpacity, View } from 'react-native';
import { Api } from '../../api';
import { getCoords, distanceKm, Coords } from '../../location';
import { useSession } from '../../store';
import { produceName, tr } from '../../i18n';
import { produceEmoji } from '../../produce';
import { useNav, ScreenProps } from '../../nav';
import { Btn, Loading, Screen, SpeakBtn, Txt } from '../../ui';
import { C, S } from '../../theme';

function Stars({ value, size = 16 }: { value: number; size?: number }) {
  const full = Math.round(value);
  return (
    <Text style={{ fontSize: size, color: '#f5a623', letterSpacing: 1 }}>
      {'★'.repeat(full)}
      <Text style={{ color: C.line }}>{'★'.repeat(5 - full)}</Text>
    </Text>
  );
}

export default function ListingDetail({ params }: ScreenProps) {
  const { lang } = useSession();
  const nav = useNav();
  const id = params?.id as string;
  const [l, setL] = useState<any | null>(null);
  const [qty, setQty] = useState(0);
  const [dist, setDist] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Api.get(`/buyer/listings/${id}?lang=${lang}`)
      .then(async (d) => {
        setL(d);
        setQty(Number(d.moq));
        if (d.pickup_lat != null && d.pickup_lng != null) {
          const c = await getCoords();
          if (c) setDist(distanceKm(c, { lat: d.pickup_lat, lng: d.pickup_lng }));
        }
      })
      .catch((e) => {
        Alert.alert('Error', e.message);
        nav.goBack();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!l) return <Screen title="…" onBack={nav.goBack}><Loading /></Screen>;

  const name = produceName(l.produce_names, lang);
  const price = Number(l.buyer_price);
  const moq = Number(l.moq);
  const stock = Number(l.qty_remaining);
  const total = Math.round(price * qty * 100) / 100;
  const rep = l.reputation || {};
  const reviews: any[] = l.reviews || [];
  const photo = l.photos?.[0];

  const step = (d: number) => setQty((q) => Math.min(stock, Math.max(moq, q + d)));

  const call = () => {
    if (!l.seller_phone) return Alert.alert(tr(lang, 'call'), 'No contact number available.');
    Linking.openURL('tel:' + l.seller_phone);
  };
  const openMap = () => {
    if (l.pickup_lat == null) return;
    const ll = `${l.pickup_lat},${l.pickup_lng}`;
    const url = Platform.select({
      ios: `http://maps.apple.com/?q=${encodeURIComponent(name)}&ll=${ll}`,
      default: `https://www.google.com/maps/search/?api=1&query=${ll}`,
    })!;
    Linking.openURL(url);
  };

  const buy = async () => {
    setBusy(true);
    try {
      const c = await getCoords();
      const order = await Api.post('/buyer/orders', {
        items: [{ listingId: id, qty }],
        deliveryLat: c?.lat,
        deliveryLng: c?.lng,
      });
      await Api.post(`/payments/order/${order.id}/pay`, {});
      Alert.alert('✓', `Paid ₹${Number(order.total)}. Pickup will be assigned.`);
      nav.replace('buyer.orders');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      title={name}
      onBack={nav.goBack}
      footer={<Btn title={`${tr(lang, 'payNow')}  ₹${total}`} onPress={buy} loading={busy} />}
    >
      <View style={{ gap: S.lg, paddingTop: S.xs }}>
        {/* Hero — seller's own photo */}
        <View style={{ alignItems: 'center' }}>
          {photo ? (
            <Image
              source={{ uri: Api.imageUrl(photo) }}
              style={{ width: '100%', height: 210, borderRadius: S.radius, backgroundColor: C.line }}
              resizeMode="cover"
            />
          ) : (
            <Text style={{ fontSize: 80 }}>{produceEmoji(l.produce_slug)}</Text>
          )}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
          <Txt.H1>₹{price}{tr(lang, 'perUnit')}</Txt.H1>
          <Text style={{ color: C.muted }}>· grade {l.grade ?? '—'}</Text>
          <View style={{ flex: 1 }} />
          <SpeakBtn text={`${name}, ₹${price} ${tr(lang, 'perUnit')}`} />
        </View>

        {/* Seller card */}
        <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: S.radius, padding: S.lg, gap: S.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
            {l.seller_photo ? (
              <Image source={{ uri: Api.imageUrl(l.seller_photo) }} style={{ width: 46, height: 46, borderRadius: 23 }} />
            ) : (
              <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 18 }}>{(l.seller_name?.[0] || '?').toUpperCase()}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.muted, fontSize: 12 }}>{tr(lang, 'soldBy')}</Text>
              <Txt.H2>{l.seller_name ?? '—'}</Txt.H2>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <Stars value={Number(rep.avg_stars) || 0} />
                <Text style={{ color: C.muted, fontSize: 12 }}>
                  {Number(rep.ratings_count) ? `${rep.avg_stars} (${rep.ratings_count})` : 'New'} · {Number(rep.delivered) || 0} {tr(lang, 'delivered')}
                </Text>
              </View>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: S.sm }}>
            <View style={{ flex: 1 }}>
              <Btn title={`📞 ${tr(lang, 'call')}`} variant="ghost" onPress={call} />
            </View>
            {l.pickup_lat != null ? (
              <View style={{ flex: 1 }}>
                <Btn title={`📍 ${dist != null ? `${dist} km` : tr(lang, 'directions')}`} variant="ghost" onPress={openMap} />
              </View>
            ) : null}
          </View>
        </View>

        {/* Quantity */}
        <View style={{ alignItems: 'center', gap: S.sm }}>
          <Txt.Muted>{tr(lang, 'quantity')} (min {moq})</Txt.Muted>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.xl }}>
            <TouchableOpacity onPress={() => step(-10)} style={stepBtn}><Text style={stepTxt}>−</Text></TouchableOpacity>
            <Text style={{ fontSize: 32, fontWeight: '800', color: C.ink, minWidth: 90, textAlign: 'center' }}>{qty}</Text>
            <TouchableOpacity onPress={() => step(10)} style={stepBtn}><Text style={stepTxt}>+</Text></TouchableOpacity>
          </View>
          <Text style={{ color: C.muted }}>{l.unit} · {stock} available</Text>
        </View>

        {/* Reviews */}
        <View style={{ gap: S.sm }}>
          <Txt.H2>{tr(lang, 'reviews')}</Txt.H2>
          {reviews.length === 0 ? (
            <Txt.Muted style={{ textAlign: 'left' }}>{tr(lang, 'noReviews')}</Txt.Muted>
          ) : (
            reviews.map((r, i) => (
              <View key={i} style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: S.radius, padding: S.md }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Stars value={r.score} size={14} />
                  <Text style={{ color: C.muted, fontSize: 11 }}>{new Date(r.created_at).toLocaleDateString()}</Text>
                </View>
                <Text style={{ color: C.ink, marginTop: 4 }}>{r.comment}</Text>
                {r.reviewer ? <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>— {r.reviewer}</Text> : null}
              </View>
            ))
          )}
        </View>
      </View>
    </Screen>
  );
}

const stepBtn = { width: 60, height: 60, borderRadius: 14, backgroundColor: C.greenL, alignItems: 'center' as const, justifyContent: 'center' as const };
const stepTxt = { fontSize: 30, fontWeight: '800' as const, color: C.greenD };
