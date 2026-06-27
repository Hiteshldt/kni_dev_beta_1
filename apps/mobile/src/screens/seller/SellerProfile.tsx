import React, { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { Api } from '../../api';
import { getCoords } from '../../location';
import { useSession } from '../../store';
import { tr } from '../../i18n';
import { useNav } from '../../nav';
import { Btn, Field, Loading, Screen, Txt } from '../../ui';
import { S } from '../../theme';

export default function SellerProfile({
  onboarding,
  onDone,
}: {
  params?: any;
  onboarding?: boolean;
  onDone?: () => void;
} = {}) {
  const { lang } = useSession();
  const nav = useNav();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [upi, setUpi] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const p = await Api.get('/seller/profile');
        setName(p.name ?? '');
        setUpi(p.upi_id ?? '');
        setLat(p.farm_lat ?? null);
        setLng(p.farm_lng ?? null);
      } catch {
        // no profile yet — first-time setup
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const useLocation = async () => {
    const c = await getCoords();
    if (!c) return Alert.alert('Location', 'Could not get your location. Enable GPS permission.');
    setLat(c.lat);
    setLng(c.lng);
  };

  const save = async () => {
    if (!name.trim()) return Alert.alert('Name', 'Please enter your name.');
    setBusy(true);
    try {
      await Api.post('/seller/profile', {
        name: name.trim(),
        upiId: upi.trim() || undefined,
        farmLat: lat ?? undefined,
        farmLng: lng ?? undefined,
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

  if (loading) return <Screen title={title} onBack={back}><Loading /></Screen>;

  return (
    <Screen title={title} onBack={back}>
      <View style={{ gap: S.sm, paddingTop: S.sm }}>
        {onboarding ? (
          <Txt.Muted style={{ textAlign: 'left', marginBottom: S.sm }}>{tr(lang, 'setupProfile')}</Txt.Muted>
        ) : null}
        <Field label="Name" value={name} onChangeText={setName} placeholder="Ravi" />
        <Field label="UPI ID (for payout)" value={upi} onChangeText={setUpi} autoCapitalize="none" placeholder="ravi@upi" />
        <Txt.Muted style={{ textAlign: 'left' }}>
          Farm location: {lat != null ? `${lat.toFixed(4)}, ${lng?.toFixed(4)}` : 'not set'}
        </Txt.Muted>
        <Btn title="📍 Use my location" variant="ghost" onPress={useLocation} />
        <View style={{ height: S.sm }} />
        <Btn title={tr(lang, 'save')} onPress={save} loading={busy} />
      </View>
    </Screen>
  );
}
