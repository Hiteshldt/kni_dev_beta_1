import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Speech from 'expo-speech';
import { C, S, statusColor } from './theme';
import { LANGS, Lang } from './i18n';
import { useSession } from './store';

const LANG_TTS: Record<Lang, string> = { en: 'en-IN', ta: 'ta-IN', ml: 'ml-IN' };

export function speak(text: string, lang: Lang) {
  Speech.stop();
  if (text) Speech.speak(text, { language: LANG_TTS[lang], rate: 0.96 });
}

// ─── Screen shell: header (back + title + language cycle) + body ─────────────
export function Screen({
  title,
  onBack,
  children,
  scroll = true,
  footer,
}: {
  title: string;
  onBack?: () => void;
  children: React.ReactNode;
  scroll?: boolean;
  footer?: React.ReactNode;
}) {
  const { lang, setLang } = useSession();
  const cycleLang = () => {
    const i = LANGS.findIndex((l) => l.code === lang);
    setLang(LANGS[(i + 1) % LANGS.length].code);
  };
  const Body: any = scroll ? ScrollView : View;
  return (
    <SafeAreaView style={st.safe}>
      <View style={st.header}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={st.backBtn} hitSlop={12}>
            <Text style={st.backTxt}>‹</Text>
          </TouchableOpacity>
        ) : (
          <View style={st.backBtn} />
        )}
        <Text style={st.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        <TouchableOpacity onPress={cycleLang} style={st.langBtn} hitSlop={8}>
          <Text style={st.langTxt}>🌐 {LANGS.find((l) => l.code === lang)?.label}</Text>
        </TouchableOpacity>
      </View>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Body
          style={scroll ? { flex: 1 } : [{ flex: 1 }, st.body]}
          contentContainerStyle={scroll ? st.body : undefined}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </Body>
        {footer ? <View style={st.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Button ──────────────────────────────────────────────────────────────────
export function Btn({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
}) {
  const bg =
    variant === 'primary' ? C.green : variant === 'danger' ? C.red : C.white;
  const fg = variant === 'ghost' ? C.greenD : C.white;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={[
        st.btn,
        { backgroundColor: bg, opacity: disabled || loading ? 0.5 : 1 },
        variant === 'ghost' && { borderWidth: 1, borderColor: C.line },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={[st.btnTxt, { color: fg }]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

// ─── Labeled input ───────────────────────────────────────────────────────────
export function Field({
  label,
  ...rest
}: { label: string } & TextInputProps) {
  return (
    <View style={{ marginBottom: S.md }}>
      <Text style={st.label}>{label}</Text>
      <TextInput
        style={st.input}
        placeholderTextColor={C.muted}
        {...rest}
      />
    </View>
  );
}

// ─── Status pill ─────────────────────────────────────────────────────────────
export function Pill({ label, status }: { label?: string; status?: string }) {
  const c = statusColor(status ?? label);
  return (
    <View style={[st.pill, { backgroundColor: c.bg }]}>
      <Text style={[st.pillTxt, { color: c.fg }]}>{label ?? status ?? '—'}</Text>
    </View>
  );
}

// ─── Card ────────────────────────────────────────────────────────────────────
export function Card({
  children,
  onPress,
}: {
  children: React.ReactNode;
  onPress?: () => void;
}) {
  const inner = <View style={st.card}>{children}</View>;
  return onPress ? (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      {inner}
    </TouchableOpacity>
  ) : (
    inner
  );
}

// ─── 🔊 read-aloud button (vernacular TTS) ───────────────────────────────────
export function SpeakBtn({ text }: { text: string }) {
  const { lang } = useSession();
  return (
    <TouchableOpacity onPress={() => speak(text, lang)} hitSlop={10} style={st.speak}>
      <Text style={{ fontSize: 18 }}>🔊</Text>
    </TouchableOpacity>
  );
}

export function Loading({ label }: { label?: string }) {
  return (
    <View style={st.center}>
      <ActivityIndicator color={C.green} size="large" />
      {label ? <Text style={st.muted}>{label}</Text> : null}
    </View>
  );
}

export function EmptyState({ label }: { label: string }) {
  return (
    <View style={st.center}>
      <Text style={{ fontSize: 40, marginBottom: S.sm }}>🌾</Text>
      <Text style={st.muted}>{label}</Text>
    </View>
  );
}

export const Txt = {
  H1: (p: any) => <Text style={[st.h1, p.style]}>{p.children}</Text>,
  H2: (p: any) => <Text style={[st.h2, p.style]}>{p.children}</Text>,
  P: (p: any) => <Text style={[st.p, p.style]}>{p.children}</Text>,
  Muted: (p: any) => <Text style={[st.muted, p.style]}>{p.children}</Text>,
};

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: S.md,
    paddingVertical: S.sm,
    backgroundColor: C.green,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backTxt: { color: C.white, fontSize: 30, lineHeight: 32, marginTop: -4 },
  headerTitle: { flex: 1, color: C.white, fontSize: 18, fontWeight: '700' },
  langBtn: { paddingHorizontal: S.sm, paddingVertical: 4, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)' },
  langTxt: { color: C.white, fontSize: 13, fontWeight: '600' },
  body: { padding: S.lg, gap: S.sm },
  footer: { padding: S.lg, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.card },
  btn: { borderRadius: S.radius, paddingVertical: 15, alignItems: 'center', justifyContent: 'center' },
  btnTxt: { fontSize: 17, fontWeight: '700' },
  label: { fontSize: 13, color: C.muted, marginBottom: 6, fontWeight: '600' },
  input: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: S.radius,
    paddingHorizontal: S.md,
    paddingVertical: 13,
    fontSize: 17,
    color: C.ink,
  },
  pill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, alignSelf: 'flex-start' },
  pillTxt: { fontSize: 12, fontWeight: '700' },
  card: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: S.radius,
    padding: S.lg,
    marginBottom: S.sm,
  },
  speak: { padding: 6, borderRadius: 999, backgroundColor: C.greenL },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: S.xl, gap: 6, minHeight: 240 },
  h1: { fontSize: 26, fontWeight: '800', color: C.ink },
  h2: { fontSize: 19, fontWeight: '700', color: C.ink },
  p: { fontSize: 16, color: C.ink },
  muted: { fontSize: 15, color: C.muted, textAlign: 'center' },
});
