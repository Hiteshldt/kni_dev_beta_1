import React, { useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { Api } from '../api';
import { useSession, Role } from '../store';
import { LANGS, tr } from '../i18n';
import { Btn, Field, Screen, Txt } from '../ui';
import { C, S } from '../theme';
import type { ScreenProps } from '../nav';

export default function Login(_: ScreenProps) {
  const { lang, setLang, signIn } = useSession();
  const [phone, setPhone] = useState('+91');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showApi, setShowApi] = useState(false);
  const [apiBase, setApiBase] = useState(Api.baseUrl());

  const sendOtp = async () => {
    setBusy(true);
    try {
      const r = await Api.post<{ sent: boolean; devCode?: string }>('/auth/otp/request', { phone });
      setSent(true);
      if (r.devCode) setCode(r.devCode); // dev convenience: code returned by API
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setBusy(true);
    try {
      const r = await Api.post<{ token: string; role: Role }>('/auth/otp/verify', { phone, code });
      await signIn(r.token, r.role);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setBusy(false);
    }
  };

  const saveApi = async () => {
    await Api.setBaseUrl(apiBase.trim());
    setApiBase(Api.baseUrl());
    setShowApi(false);
    Alert.alert('Saved', 'API set to ' + Api.baseUrl());
  };

  return (
    <Screen title="KANNI 🌾" scroll>
      <View style={{ gap: S.lg, paddingTop: S.xl }}>
        <Txt.H1>KANNI 🌾</Txt.H1>
        <Txt.Muted style={{ textAlign: 'left' }}>{tr(lang, 'appTagline')}</Txt.Muted>

        {/* Prominent language picker on first screen */}
        <View style={{ flexDirection: 'row', gap: S.sm }}>
          {LANGS.map((l) => (
            <TouchableOpacity
              key={l.code}
              onPress={() => setLang(l.code)}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: S.radius,
                borderWidth: 2,
                alignItems: 'center',
                borderColor: lang === l.code ? C.green : C.line,
                backgroundColor: lang === l.code ? C.greenL : C.white,
              }}
            >
              <Text style={{ fontWeight: '700', color: lang === l.code ? C.greenD : C.muted }}>
                {l.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: S.md }} />

        <Field
          label={tr(lang, 'phone')}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="+9198XXXXXXXX"
          editable={!sent}
        />

        {sent ? (
          <Field
            label={tr(lang, 'enterOtp')}
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            placeholder="••••••"
            maxLength={6}
          />
        ) : null}

        {!sent ? (
          <Btn title={tr(lang, 'sendOtp')} onPress={sendOtp} loading={busy} />
        ) : (
          <>
            <Btn title={tr(lang, 'verify')} onPress={verify} loading={busy} />
            <Btn title={tr(lang, 'sendOtp')} variant="ghost" onPress={sendOtp} />
          </>
        )}

        {/* API base editor (for testing against laptop / deployed server) */}
        <TouchableOpacity onPress={() => setShowApi((v) => !v)} style={{ marginTop: S.md }}>
          <Txt.Muted style={{ fontSize: 12 }}>API: {Api.baseUrl()}</Txt.Muted>
        </TouchableOpacity>
        {showApi ? (
          <View style={{ gap: S.sm }}>
            <Field label="API base URL" value={apiBase} onChangeText={setApiBase} autoCapitalize="none" />
            <Btn title={tr(lang, 'save')} variant="ghost" onPress={saveApi} />
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
