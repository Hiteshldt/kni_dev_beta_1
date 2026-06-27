import React, { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { Api } from '../../api';
import { useSession } from '../../store';
import { tr } from '../../i18n';
import { produceEmoji } from '../../produce';
import { useNav, ScreenProps } from '../../nav';
import { Btn, Field, Screen, Txt } from '../../ui';
import { S } from '../../theme';

// Driver enters the 4-digit pickup code (shown by the seller) then the drop OTP
// (shown by the buyer). The codes are never sent to the driver's device.
export default function ActiveJob({ params }: ScreenProps) {
  const { lang } = useSession();
  const nav = useNav();
  const s = params?.shipment;
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  if (!s) {
    nav.goBack();
    return null;
  }
  const needsPickup = s.status === 'assigned';

  const act = async () => {
    if (code.length !== 4) return Alert.alert('Code', 'Enter the 4-digit code.');
    setBusy(true);
    try {
      if (needsPickup) {
        await Api.post(`/driver/shipments/${s.shipment_id}/pickup`, { code });
        Alert.alert('✓', 'Picked up. Now deliver to the buyer.');
      } else {
        await Api.post(`/driver/shipments/${s.shipment_id}/deliver`, { otp: code });
        Alert.alert('✓', 'Delivered! Earnings credited.');
      }
      nav.replace('driver.jobs');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title={s.produce_slug} onBack={nav.goBack}>
      <View style={{ gap: S.lg, paddingTop: S.md, alignItems: 'center' }}>
        <Text style={{ fontSize: 64 }}>{produceEmoji(s.produce_slug)}</Text>
        <Txt.H2>{needsPickup ? 'Pickup from farmer' : 'Deliver to buyer'}</Txt.H2>
        <Txt.Muted>
          {s.seller_name ?? '—'} · {Number(s.weight_kg)} kg
        </Txt.Muted>
        <View style={{ width: '100%', marginTop: S.md }}>
          <Field
            label={needsPickup ? 'Pickup code (from farmer)' : 'Drop OTP (from buyer)'}
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={4}
            placeholder="••••"
          />
          <Btn
            title={needsPickup ? 'Picked up ✓' : 'Delivered ✓'}
            onPress={act}
            loading={busy}
          />
        </View>
      </View>
    </Screen>
  );
}
