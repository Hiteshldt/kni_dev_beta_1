import React, { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { Api } from '../../api';
import { getCoords } from '../../location';
import { useSession } from '../../store';
import { tr } from '../../i18n';
import { useNav } from '../../nav';
import { Btn, Field, Screen, Txt } from '../../ui';
import { S } from '../../theme';

export default function BuyerProfile({
  onboarding,
  onDone,
}: {
  params?: any;
  onboarding?: boolean;
  onDone?: () => void;
} = {}) {
  const { lang } = useSession();
  const nav = useNav();
  const [name, setName] = useState('');
  const [gst, setGst] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Api.get('/buyer/profile')
      .then((p) => {
        if (!p) return;
        setName(p.business_name ?? '');
        setGst(p.gst ?? '');
        setLat(p.delivery_lat ?? null);
        setLng(p.delivery_lng ?? null);
      })
      .catch(() => {});
  }, []);

  const useLocation = async () => {
    const c = await getCoords();
    if (!c) return Alert.alert('Location', 'Could not get your location. Enable GPS permission.');
    setLat(c.lat);
    setLng(c.lng);
  };

  const save = async () => {
    if (!name.trim()) return Alert.alert('Name', 'Enter your business name.');
    setBusy(true);
    try {
      await Api.post('/buyer/profile', {
        businessName: name.trim(),
        gst: gst.trim() || undefined,
        deliveryLat: lat ?? undefined,
        deliveryLng: lng ?? undefined,
      });
      Alert.alert('Saved ✓');
      if (onDone) onDone();
      else nav.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setBusy(false);
    }
  };

  const title = onboarding ? tr(lang, 'welcome') : tr(lang, 'profile');
  const back = onboarding ? undefined : nav.goBack;

  return (
    <Screen title={title} onBack={back}>
      <View style={{ gap: S.sm, paddingTop: S.sm }}>
        {onboarding ? (
          <Txt.Muted style={{ textAlign: 'left', marginBottom: S.sm }}>{tr(lang, 'setupProfile')}</Txt.Muted>
        ) : null}
        <Field label="Business name" value={name} onChangeText={setName} placeholder="Suresh Traders" />
        <Field label="GST (optional)" value={gst} onChangeText={setGst} autoCapitalize="characters" />
        <Txt.Muted style={{ textAlign: 'left' }}>
          Delivery location: {lat != null ? `${lat.toFixed(4)}, ${lng?.toFixed(4)}` : 'not set'}
        </Txt.Muted>
        <Btn title="📍 Use my location" variant="ghost" onPress={useLocation} />
        <View style={{ height: S.sm }} />
        <Btn title={tr(lang, 'save')} onPress={save} loading={busy} />
      </View>
    </Screen>
  );
}
