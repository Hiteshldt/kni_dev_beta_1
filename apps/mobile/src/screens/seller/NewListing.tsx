import React, { useEffect, useState } from 'react';
import { Alert, Image, Text, TouchableOpacity, View } from 'react-native';
import { Api } from '../../api';
import { pickAndUpload } from '../../images';
import { useSession } from '../../store';
import { produceName, tr } from '../../i18n';
import { produceEmoji } from '../../produce';
import { useNav } from '../../nav';
import { Btn, Field, Loading, Screen, speak, Txt } from '../../ui';
import { C, S } from '../../theme';

type Cat = {
  id: string;
  slug: string;
  names: any;
  default_unit: string;
  default_moq: string | number;
};

// Big +/- stepper — near-zero typing for quantity.
function Stepper({ value, onChange, step }: { value: number; onChange: (n: number) => void; step: number }) {
  const btn = (label: string, delta: number) => (
    <TouchableOpacity
      onPress={() => onChange(Math.max(0, value + delta))}
      style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: C.greenL, alignItems: 'center', justifyContent: 'center' }}
    >
      <Text style={{ fontSize: 28, fontWeight: '800', color: C.greenD }}>{label}</Text>
    </TouchableOpacity>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      {btn('−', -step)}
      <Text style={{ fontSize: 30, fontWeight: '800', color: C.ink }}>{value}</Text>
      {btn('+', step)}
    </View>
  );
}

export default function NewListing() {
  const { lang } = useSession();
  const nav = useNav();
  const [cats, setCats] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<Cat | null>(null);
  const [qty, setQty] = useState(100);
  const [price, setPrice] = useState('');
  const [moq, setMoq] = useState('');
  const [grade, setGrade] = useState<'A' | 'B' | 'C'>('A');
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);

  const addPhoto = () => {
    const run = async (fromCamera: boolean) => {
      setUploading(true);
      try {
        const path = await pickAndUpload(fromCamera);
        if (path) setPhotos((p) => [...p, path]);
      } catch (e: any) {
        Alert.alert('Photo', e.message);
      } finally {
        setUploading(false);
      }
    };
    Alert.alert('Add photo', undefined, [
      { text: '📷 Camera', onPress: () => run(true) },
      { text: '🖼️ Gallery', onPress: () => run(false) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  useEffect(() => {
    Api.get<Cat[]>(`/catalog?lang=${lang}`)
      .then(setCats)
      .catch((e) => Alert.alert('Error', e.message))
      .finally(() => setLoading(false));
  }, [lang]);

  const choose = (c: Cat) => {
    setSel(c);
    setMoq(String(c.default_moq ?? 10));
    speak(produceName(c.names, lang), lang); // read produce name aloud
  };

  const readBack = () => {
    if (!sel) return;
    const name = produceName(sel.names, lang);
    speak(`${name}, ${qty} ${sel.default_unit}, ₹${price || 0} ${tr(lang, 'perUnit')}`, lang);
  };

  const submit = async () => {
    if (!sel) return;
    const p = Number(price);
    const m = Number(moq);
    if (!p) return Alert.alert(tr(lang, 'price'), 'Enter a price.');
    if (!m || m > qty) return Alert.alert(tr(lang, 'moq'), 'MOQ must be set and ≤ quantity.');
    setBusy(true);
    try {
      await Api.post('/seller/listings', {
        catalogId: sel.id,
        qty,
        unit: sel.default_unit,
        payoutPrice: p,
        moq: m,
        grade,
        photos,
      });
      Alert.alert('✓', 'Listed! Pending admin review.');
      nav.replace('seller.listings');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Screen title={tr(lang, 'newListing')} onBack={nav.goBack}><Loading /></Screen>;

  // Step 1 — pick produce from the visual grid.
  if (!sel) {
    return (
      <Screen title={tr(lang, 'pickProduce')} onBack={nav.goBack}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.md, paddingTop: S.sm }}>
          {cats.map((c) => (
            <TouchableOpacity
              key={c.id}
              onPress={() => choose(c)}
              style={{
                width: '30%',
                aspectRatio: 1,
                backgroundColor: C.card,
                borderWidth: 1,
                borderColor: C.line,
                borderRadius: S.radius,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
              }}
            >
              <Text style={{ fontSize: 40 }}>{produceEmoji(c.slug)}</Text>
              <Text style={{ fontSize: 13, fontWeight: '600', color: C.ink, textAlign: 'center' }} numberOfLines={1}>
                {produceName(c.names, lang)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Screen>
    );
  }

  // Step 2 — quantity / price / MOQ / grade + voice read-back.
  return (
    <Screen
      title={produceName(sel.names, lang)}
      onBack={() => setSel(null)}
      footer={<Btn title={tr(lang, 'submit')} onPress={submit} loading={busy} />}
    >
      <View style={{ gap: S.lg, paddingTop: S.sm }}>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 64 }}>{produceEmoji(sel.slug)}</Text>
        </View>

        <View>
          <Txt.Muted style={{ textAlign: 'left', marginBottom: S.sm }}>
            {tr(lang, 'quantity')} ({sel.default_unit})
          </Txt.Muted>
          <Stepper value={qty} onChange={setQty} step={10} />
        </View>

        <Field
          label={tr(lang, 'price')}
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
          placeholder="20"
        />
        <Field
          label={tr(lang, 'moq')}
          value={moq}
          onChangeText={setMoq}
          keyboardType="numeric"
        />

        <View>
          <Txt.Muted style={{ textAlign: 'left', marginBottom: S.sm }}>{tr(lang, 'grade')}</Txt.Muted>
          <View style={{ flexDirection: 'row', gap: S.sm }}>
            {(['A', 'B', 'C'] as const).map((g) => (
              <TouchableOpacity
                key={g}
                onPress={() => setGrade(g)}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: S.radius,
                  borderWidth: 2,
                  alignItems: 'center',
                  borderColor: grade === g ? C.green : C.line,
                  backgroundColor: grade === g ? C.greenL : C.white,
                }}
              >
                <Text style={{ fontSize: 18, fontWeight: '800', color: grade === g ? C.greenD : C.muted }}>{g}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View>
          <Txt.Muted style={{ textAlign: 'left', marginBottom: S.sm }}>Photos</Txt.Muted>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }}>
            {photos.map((p) => (
              <Image
                key={p}
                source={{ uri: Api.imageUrl(p) }}
                style={{ width: 72, height: 72, borderRadius: 10, backgroundColor: C.line }}
              />
            ))}
            <TouchableOpacity
              onPress={addPhoto}
              disabled={uploading}
              style={{
                width: 72,
                height: 72,
                borderRadius: 10,
                borderWidth: 2,
                borderColor: C.line,
                borderStyle: 'dashed',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 26, color: C.muted }}>{uploading ? '…' : '＋'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Btn title="🔊 Read back" variant="ghost" onPress={readBack} />
      </View>
    </Screen>
  );
}
