import React, { useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { Api } from '../../api';
import { useSession } from '../../store';
import { tr } from '../../i18n';
import { useNav, ScreenProps } from '../../nav';
import { Btn, Field, Screen, Txt } from '../../ui';
import { C, S } from '../../theme';

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: S.xs }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <TouchableOpacity key={n} onPress={() => onChange(n)} hitSlop={6}>
          <Text style={{ fontSize: 38, color: n <= value ? '#f5a623' : C.line }}>★</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function RateOrder({ params }: ScreenProps) {
  const { lang } = useSession();
  const nav = useNav();
  const orderId = params?.orderId as string;
  const hasDriver = !!params?.hasDriver;
  const [sellerStars, setSellerStars] = useState(5);
  const [comment, setComment] = useState('');
  const [driverStars, setDriverStars] = useState(5);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await Api.post('/ratings', { orderId, target: 'seller', score: sellerStars, comment: comment.trim() || undefined });
      if (hasDriver) {
        try {
          await Api.post('/ratings', { orderId, target: 'driver', score: driverStars });
        } catch {
          /* driver may already be rated — ignore */
        }
      }
      Alert.alert('★', 'Thanks for your review!');
      nav.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title={tr(lang, 'rate')} onBack={nav.goBack} footer={<Btn title={tr(lang, 'submitReview')} onPress={submit} loading={busy} />}>
      <View style={{ gap: S.xl, paddingTop: S.md }}>
        <View style={{ gap: S.sm }}>
          <Txt.H2>{tr(lang, 'rateSeller')}</Txt.H2>
          <StarPicker value={sellerStars} onChange={setSellerStars} />
        </View>
        <Field
          label={tr(lang, 'writeComment')}
          value={comment}
          onChangeText={setComment}
          placeholder="Fresh, good quality…"
          multiline
        />
        {hasDriver ? (
          <View style={{ gap: S.sm }}>
            <Txt.H2>{tr(lang, 'rateDriver')}</Txt.H2>
            <StarPicker value={driverStars} onChange={setDriverStars} />
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
