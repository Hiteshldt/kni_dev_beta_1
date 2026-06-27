import React, { useEffect, useState } from 'react';
import { Image, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Api } from '../../api';
import { getCoords } from '../../location';
import { useSession } from '../../store';
import { produceName, tr } from '../../i18n';
import { produceEmoji } from '../../produce';
import { useNav } from '../../nav';
import { Card, EmptyState, Loading, Pill, Screen, SpeakBtn, Txt } from '../../ui';
import { C, S } from '../../theme';

export default function Browse() {
  const { lang } = useSession();
  const nav = useNav();
  const [rows, setRows] = useState<any[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const c = await getCoords();
    const geo = c ? `&lat=${c.lat}&lng=${c.lng}` : '';
    try {
      setRows(await Api.get(`/buyer/listings?lang=${lang}${geo}`));
    } catch {
      setRows([]);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (!rows) return <Screen title={tr(lang, 'browse')} onBack={nav.goBack}><Loading /></Screen>;

  return (
    <Screen title={tr(lang, 'browse')} onBack={nav.goBack} scroll={false}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: S.xl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {rows.length === 0 ? (
          <EmptyState label={tr(lang, 'empty')} />
        ) : (
          rows.map((l) => {
            const name = produceName(l.produce_names, lang);
            return (
              <Card key={l.id} onPress={() => nav.navigate('buyer.detail', { id: l.id })}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
                  {l.photos?.[0] ? (
                    <Image
                      source={{ uri: Api.imageUrl(l.photos[0]) }}
                      style={{ width: 52, height: 52, borderRadius: 10, backgroundColor: C.line }}
                    />
                  ) : (
                    <Text style={{ fontSize: 36 }}>{produceEmoji(l.produce_slug)}</Text>
                  )}
                  <View style={{ flex: 1 }}>
                    <Txt.H2>{name}</Txt.H2>
                    <Text style={{ color: C.greenD, fontWeight: '800', fontSize: 18 }}>
                      ₹{Number(l.buyer_price)}{tr(lang, 'perUnit')}
                    </Text>
                    <Txt.Muted style={{ textAlign: 'left' }}>
                      {l.seller_name ?? '—'} · MOQ {Number(l.moq)} {l.unit}
                      {l.distance_km != null ? ` · ${l.distance_km} km ${tr(lang, 'away')}` : ''}
                    </Txt.Muted>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <Pill label={`${l.grade ?? '—'}`} />
                    <SpeakBtn text={`${name}, ₹${Number(l.buyer_price)} ${tr(lang, 'perUnit')}`} />
                  </View>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}
