import React, { useEffect, useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { Api } from '../../api';
import { useSession } from '../../store';
import { tr } from '../../i18n';
import { useNav } from '../../nav';
import { Btn, Field, Screen, Txt } from '../../ui';
import { C, S } from '../../theme';

const VEHICLES: { v: 'tempo' | 'mini_truck' | 'truck'; emoji: string; label: string }[] = [
  { v: 'tempo', emoji: '🛺', label: 'Tempo' },
  { v: 'mini_truck', emoji: '🚐', label: 'Mini truck' },
  { v: 'truck', emoji: '🚚', label: 'Truck' },
];

export default function DriverProfile({
  onboarding,
  onDone,
}: {
  params?: any;
  onboarding?: boolean;
  onDone?: () => void;
} = {}) {
  const { lang } = useSession();
  const nav = useNav();
  const [vehicle, setVehicle] = useState<'tempo' | 'mini_truck' | 'truck'>('tempo');
  const [capacity, setCapacity] = useState('1000');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Api.get('/driver/profile')
      .then((p) => {
        if (!p) return;
        if (p.vehicle_type) setVehicle(p.vehicle_type);
        if (p.capacity_kg) setCapacity(String(Number(p.capacity_kg)));
      })
      .catch(() => {});
  }, []);

  const save = async () => {
    const cap = Number(capacity);
    if (!cap || cap < 1) return Alert.alert('Capacity', 'Enter vehicle capacity in kg.');
    setBusy(true);
    try {
      await Api.post('/driver/profile', { vehicleType: vehicle, capacityKg: cap });
      Alert.alert('Saved ✓', 'Awaiting admin verification before you can take jobs.');
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
      <View style={{ gap: S.lg, paddingTop: S.sm }}>
        {onboarding ? (
          <Txt.Muted style={{ textAlign: 'left' }}>{tr(lang, 'setupProfile')}</Txt.Muted>
        ) : null}
        <Txt.Muted style={{ textAlign: 'left' }}>Vehicle</Txt.Muted>
        <View style={{ flexDirection: 'row', gap: S.sm }}>
          {VEHICLES.map((x) => (
            <TouchableOpacity
              key={x.v}
              onPress={() => setVehicle(x.v)}
              style={{
                flex: 1,
                paddingVertical: S.lg,
                borderRadius: S.radius,
                borderWidth: 2,
                alignItems: 'center',
                gap: 4,
                borderColor: vehicle === x.v ? C.green : C.line,
                backgroundColor: vehicle === x.v ? C.greenL : C.white,
              }}
            >
              <Text style={{ fontSize: 30 }}>{x.emoji}</Text>
              <Text style={{ fontWeight: '700', color: vehicle === x.v ? C.greenD : C.muted }}>{x.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Field label="Capacity (kg)" value={capacity} onChangeText={setCapacity} keyboardType="numeric" />
        <Btn title={tr(lang, 'save')} onPress={save} loading={busy} />
      </View>
    </Screen>
  );
}
