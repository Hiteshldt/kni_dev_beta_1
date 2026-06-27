import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Api } from '../../api';
import { useSession } from '../../store';
import { tr } from '../../i18n';
import { useNav } from '../../nav';
import { Card, EmptyState, Loading, Pill, Screen, Txt } from '../../ui';
import { C, S } from '../../theme';

export default function Earnings() {
  const { lang } = useSession();
  const nav = useNav();
  const [data, setData] = useState<any | null>(null);

  useEffect(() => {
    Api.get('/driver/earnings').then(setData).catch(() => setData({ total: 0, trips: 0, recent: [] }));
  }, []);

  if (!data) return <Screen title={tr(lang, 'earnings')} onBack={nav.goBack}><Loading /></Screen>;

  return (
    <Screen title={tr(lang, 'earnings')} onBack={nav.goBack} scroll={false}>
      <ScrollView contentContainerStyle={{ paddingBottom: S.xl }}>
        <View
          style={{
            backgroundColor: C.green,
            borderRadius: S.radius,
            padding: S.xl,
            alignItems: 'center',
            marginBottom: S.lg,
          }}
        >
          <Txt.H1 style={{ color: C.white }}>₹{Number(data.total)}</Txt.H1>
          <Txt.P style={{ color: C.white, opacity: 0.9 }}>{Number(data.trips)} trips</Txt.P>
        </View>

        {(data.recent || []).length === 0 ? (
          <EmptyState label={tr(lang, 'empty')} />
        ) : (
          data.recent.map((p: any, i: number) => (
            <Card key={i}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Txt.H2>₹{Number(p.amount)}</Txt.H2>
                  <Txt.Muted style={{ textAlign: 'left', fontSize: 12 }}>
                    #{String(p.order_id).slice(0, 8)} · {new Date(p.created_at).toLocaleDateString()}
                  </Txt.Muted>
                </View>
                <Pill status={p.status} label={p.status} />
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
