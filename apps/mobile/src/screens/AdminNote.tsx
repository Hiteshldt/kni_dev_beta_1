import React from 'react';
import { View } from 'react-native';
import { useSession } from '../store';
import { tr } from '../i18n';
import { Btn, Screen, Txt } from '../ui';
import { S } from '../theme';

export default function AdminNote() {
  const { lang, signOut } = useSession();
  return (
    <Screen title="KANNI 🌾">
      <View style={{ gap: S.lg, paddingTop: S.xxl, alignItems: 'center' }}>
        <Txt.H1>🖥️</Txt.H1>
        <Txt.H2>Admins use the web console</Txt.H2>
        <Txt.Muted>
          Listing review, driver verification, refunds and the dashboard live in the
          KANNI admin web console (services/admin-web).
        </Txt.Muted>
        <View style={{ height: S.lg }} />
        <Btn title={tr(lang, 'logout')} variant="ghost" onPress={signOut} />
      </View>
    </Screen>
  );
}
