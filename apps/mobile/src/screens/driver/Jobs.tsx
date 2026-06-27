import React, { useCallback, useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Api } from '../../api';
import { getCoords } from '../../location';
import { useSession } from '../../store';
import { tr } from '../../i18n';
import { produceEmoji } from '../../produce';
import { useNav } from '../../nav';
import { Btn, Card, EmptyState, Loading, Pill, Screen, Txt } from '../../ui';
import { C, S } from '../../theme';

export default function Jobs() {
  const { lang } = useSession();
  const nav = useNav();
  const [active, setActive] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setNotice(null);
    try {
      setActive(await Api.get('/driver/shipments'));
    } catch {
      setActive([]);
    }
    try {
      const c = await getCoords();
      const geo = c ? `?lat=${c.lat}&lng=${c.lng}` : '';
      setJobs(await Api.get(`/driver/jobs${geo}`));
    } catch (e: any) {
      setJobs([]);
      setNotice(e.message); // e.g. "awaiting verification"
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const accept = async (id: string) => {
    try {
      await Api.post(`/driver/jobs/${id}/accept`, {});
      await load();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  if (loading) return <Screen title={tr(lang, 'jobs')} onBack={nav.goBack}><Loading /></Screen>;

  return (
    <Screen title={tr(lang, 'jobs')} onBack={nav.goBack} scroll={false}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: S.xl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {notice ? (
          <View style={{ backgroundColor: C.amberL, borderRadius: S.radius, padding: S.md, marginBottom: S.md }}>
            <Text style={{ color: C.amber, fontWeight: '600' }}>{notice}</Text>
          </View>
        ) : null}

        {active.length > 0 ? (
          <>
            <Txt.H2 style={{ marginBottom: S.sm }}>In progress</Txt.H2>
            {active.map((s) => (
              <Card key={s.shipment_id} onPress={() => nav.navigate('driver.job', { shipment: s })}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
                  <Text style={{ fontSize: 32 }}>{produceEmoji(s.produce_slug)}</Text>
                  <View style={{ flex: 1 }}>
                    <Txt.H2>{s.produce_slug}</Txt.H2>
                    <Txt.Muted style={{ textAlign: 'left' }}>
                      {s.seller_name ?? '—'} · {Number(s.weight_kg)} kg
                    </Txt.Muted>
                  </View>
                  <Pill status={s.status} label={s.status === 'assigned' ? 'pickup' : 'deliver'} />
                </View>
              </Card>
            ))}
            <View style={{ height: S.lg }} />
          </>
        ) : null}

        <Txt.H2 style={{ marginBottom: S.sm }}>{tr(lang, 'near')}</Txt.H2>
        {jobs.length === 0 ? (
          <EmptyState label={tr(lang, 'empty')} />
        ) : (
          jobs.map((j) => (
            <Card key={j.shipment_id}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
                <Text style={{ fontSize: 32 }}>{produceEmoji(j.produce_slug)}</Text>
                <View style={{ flex: 1 }}>
                  <Txt.H2>{j.produce_slug}</Txt.H2>
                  <Txt.Muted style={{ textAlign: 'left' }}>
                    {Number(j.weight_kg)} kg
                    {j.pickup_distance_km != null ? ` · ${j.pickup_distance_km} km` : ''}
                    {j.est_earnings != null ? ` · ₹${j.est_earnings}` : ''}
                  </Txt.Muted>
                </View>
              </View>
              <View style={{ marginTop: S.md }}>
                <Btn title={tr(lang, 'accept')} onPress={() => accept(j.shipment_id)} />
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
