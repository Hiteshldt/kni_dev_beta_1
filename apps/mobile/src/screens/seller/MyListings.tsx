import React, { useCallback, useEffect, useState } from 'react';
import { Image, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Api } from '../../api';
import { useSession } from '../../store';
import { produceName, tr } from '../../i18n';
import { produceEmoji } from '../../produce';
import { useNav } from '../../nav';
import { Card, EmptyState, Loading, Pill, Screen, SpeakBtn, Txt } from '../../ui';
import { C, S } from '../../theme';

export default function MyListings() {
  const { lang } = useSession();
  const nav = useNav();
  const [rows, setRows] = useState<any[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setRows(await Api.get('/seller/listings'));
    } catch {
      setRows([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (!rows) return <Screen title={tr(lang, 'myListings')} onBack={nav.goBack}><Loading /></Screen>;

  return (
    <Screen title={tr(lang, 'myListings')} onBack={nav.goBack} scroll={false}>
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
              <Card key={l.id}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
                  {l.photos?.[0] ? (
                    <Image
                      source={{ uri: Api.imageUrl(l.photos[0]) }}
                      style={{ width: 48, height: 48, borderRadius: 10, backgroundColor: C.line }}
                    />
                  ) : (
                    <Text style={{ fontSize: 34 }}>{produceEmoji(l.produce_slug)}</Text>
                  )}
                  <View style={{ flex: 1 }}>
                    <Txt.H2>{name}</Txt.H2>
                    <Txt.Muted style={{ textAlign: 'left' }}>
                      {Number(l.qty_remaining)}/{Number(l.qty)} {l.unit} · ₹{Number(l.payout_price)}
                      {tr(lang, 'perUnit')} · {l.grade ?? '—'}
                    </Txt.Muted>
                    {l.buyer_price != null ? (
                      <Text style={{ color: C.greenD, fontWeight: '700', marginTop: 2 }}>
                        Buyer price ₹{Number(l.buyer_price)}{tr(lang, 'perUnit')}
                      </Text>
                    ) : null}
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <Pill status={l.status} label={l.status} />
                    <SpeakBtn text={`${name}, ${Number(l.qty_remaining)} ${l.unit}, ₹${Number(l.payout_price)}`} />
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
