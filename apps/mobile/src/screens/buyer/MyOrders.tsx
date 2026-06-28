import React, { useCallback, useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, View } from 'react-native';
import { Api } from '../../api';
import { useSession } from '../../store';
import { tr } from '../../i18n';
import { useNav } from '../../nav';
import { Btn, Card, EmptyState, Loading, Pill, Screen, Txt } from '../../ui';
import { S } from '../../theme';

const CANCELLABLE = ['created', 'paid', 'pickup_assigned'];

export default function MyOrders() {
  const { lang } = useSession();
  const nav = useNav();
  const [rows, setRows] = useState<any[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setRows(await Api.get('/buyer/orders'));
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

  const cancel = (id: string) => {
    Alert.alert(tr(lang, 'cancel'), 'Cancel this order?', [
      { text: 'No' },
      {
        text: 'Yes',
        style: 'destructive',
        onPress: async () => {
          try {
            await Api.post(`/buyer/orders/${id}/cancel`, { reason: 'Cancelled by buyer' });
            load();
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  if (!rows) return <Screen title={tr(lang, 'orders')} onBack={nav.goBack}><Loading /></Screen>;

  return (
    <Screen title={tr(lang, 'orders')} onBack={nav.goBack} scroll={false}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: S.xl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {rows.length === 0 ? (
          <EmptyState label={tr(lang, 'empty')} />
        ) : (
          rows.map((o) => {
            const items = (o.items || []).map((i: any) => `${i.produce} ×${Number(i.qty)}`).join(', ');
            return (
              <Card key={o.id}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Txt.H2>₹{Number(o.total)}</Txt.H2>
                    <Txt.Muted style={{ textAlign: 'left' }}>{items}</Txt.Muted>
                    <Txt.Muted style={{ textAlign: 'left', fontSize: 12 }}>
                      #{String(o.id).slice(0, 8)} · {new Date(o.created_at).toLocaleDateString()}
                    </Txt.Muted>
                  </View>
                  <Pill status={o.status} label={o.status} />
                </View>
                {CANCELLABLE.includes(o.status) ? (
                  <View style={{ marginTop: S.md }}>
                    <Btn title={tr(lang, 'cancel')} variant="danger" onPress={() => cancel(o.id)} />
                  </View>
                ) : o.status === 'delivered' ? (
                  <View style={{ marginTop: S.md }}>
                    <Btn title={`★ ${tr(lang, 'rate')}`} variant="ghost" onPress={() => nav.navigate('buyer.rate', { orderId: o.id, hasDriver: true })} />
                  </View>
                ) : null}
              </Card>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}
