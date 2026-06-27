import React, { useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { Api } from '../api';
import { useSession, Role } from '../store';
import { tr } from '../i18n';
import { Screen, Txt } from '../ui';
import { C, S } from '../theme';
import type { ScreenProps } from '../nav';

const ROLES: { role: Exclude<Role, null | 'admin'>; emoji: string; key: 'seller' | 'buyer' | 'driver' }[] = [
  { role: 'seller', emoji: '🧑‍🌾', key: 'seller' },
  { role: 'buyer', emoji: '🛒', key: 'buyer' },
  { role: 'driver', emoji: '🚚', key: 'driver' },
];

export default function RoleSelect(_: ScreenProps) {
  const { lang, signIn, signOut } = useSession();
  const [busy, setBusy] = useState<string | null>(null);

  const pick = async (role: Exclude<Role, null>) => {
    setBusy(role);
    try {
      const r = await Api.post<{ token: string; role: Role }>('/auth/role', { role });
      await signIn(r.token, r.role);
    } catch (e: any) {
      Alert.alert('Error', e.message);
      setBusy(null);
    }
  };

  return (
    <Screen title="KANNI 🌾" onBack={signOut}>
      <View style={{ paddingTop: S.xl, gap: S.lg }}>
        <Txt.H1>{tr(lang, 'chooseRole')}</Txt.H1>
        {ROLES.map((r) => (
          <TouchableOpacity
            key={r.role}
            onPress={() => pick(r.role)}
            disabled={!!busy}
            activeOpacity={0.85}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: S.lg,
              backgroundColor: C.card,
              borderWidth: 2,
              borderColor: busy === r.role ? C.green : C.line,
              borderRadius: S.radius,
              padding: S.xl,
              opacity: busy && busy !== r.role ? 0.4 : 1,
            }}
          >
            <Text style={{ fontSize: 44 }}>{r.emoji}</Text>
            <Text style={{ fontSize: 24, fontWeight: '800', color: C.ink }}>
              {tr(lang, r.key)}
            </Text>
          </TouchableOpacity>
        ))}
        <Txt.Muted style={{ fontSize: 12, marginTop: S.md }}>
          Admins sign in on the web console.
        </Txt.Muted>
      </View>
    </Screen>
  );
}
