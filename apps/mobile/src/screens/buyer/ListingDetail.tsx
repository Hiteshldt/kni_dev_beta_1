import React, { useEffect, useState } from 'react';
import { Alert, Image, Text, TouchableOpacity, View } from 'react-native';
import { Api } from '../../api';
import { getCoords } from '../../location';
import { useSession } from '../../store';
import { produceName, tr } from '../../i18n';
import { produceEmoji } from '../../produce';
import { useNav, ScreenProps } from '../../nav';
import { Btn, Loading, Screen, SpeakBtn, Txt } from '../../ui';
import { C, S } from '../../theme';

export default function ListingDetail({ params }: ScreenProps) {
  const { lang } = useSession();
  const nav = useNav();
  const id = params?.id as string;
  const [l, setL] = useState<any | null>(null);
  const [qty, setQty] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Api.get(`/buyer/listings/${id}?lang=${lang}`)
      .then((d) => {
        setL(d);
        setQty(Number(d.moq));
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

  const step = (delta: number) => setQty((q) => Math.min(stock, Math.max(moq, q + delta)));

  const buy = async () => {
    setBusy(true);
    try {
      const c = await getCoords();
      const order = await Api.post('/buyer/orders', {
        items: [{ listingId: id, qty }],
        deliveryLat: c?.lat,
        deliveryLng: c?.lng,
      });
      await Api.post(`/payments/order/${order.id}/pay`, {}); // escrow hold (mock provider in dev)
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
      <View style={{ gap: S.lg, paddingTop: S.sm, alignItems: 'center' }}>
        {l.photos?.[0] ? (
          <Image
            source={{ uri: Api.imageUrl(l.photos[0]) }}
            style={{ width: '100%', height: 200, borderRadius: S.radius, backgroundColor: C.line }}
            resizeMode="cover"
          />
        ) : (
          <Text style={{ fontSize: 72 }}>{produceEmoji(l.produce_slug)}</Text>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
          <Txt.H1>₹{price}{tr(lang, 'perUnit')}</Txt.H1>
          <SpeakBtn text={`${name}, ₹${price} ${tr(lang, 'perUnit')}`} />
        </View>
        <Txt.Muted>
          {l.seller_name ?? '—'} · grade {l.grade ?? '—'} · {stock} {l.unit} available
        </Txt.Muted>

        <Txt.Muted style={{ marginTop: S.md }}>{tr(lang, 'quantity')} (min {moq})</Txt.Muted>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.xl }}>
          <TouchableOpacity onPress={() => step(-10)} style={stepBtn}>
            <Text style={stepTxt}>−</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 34, fontWeight: '800', color: C.ink, minWidth: 90, textAlign: 'center' }}>
            {qty}
          </Text>
          <TouchableOpacity onPress={() => step(10)} style={stepBtn}>
            <Text style={stepTxt}>+</Text>
          </TouchableOpacity>
        </View>
        <Text style={{ color: C.muted }}>{l.unit}</Text>
      </View>
    </Screen>
  );
}

const stepBtn = {
  width: 64,
  height: 64,
  borderRadius: 14,
  backgroundColor: C.greenL,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};
const stepTxt = { fontSize: 32, fontWeight: '800' as const, color: C.greenD };
