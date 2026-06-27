import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Api } from '../api';
import { useSession } from '../store';
import { tr } from '../i18n';
import { useNav } from '../nav';
import { Card, EmptyState, Loading, Screen, SpeakBtn, Txt } from '../ui';
import { C, S } from '../theme';

export default function Notifications() {
  const { lang } = useSession();
  const nav = useNav();
  const [rows, setRows] = useState<any[] | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setRows(await Api.get('/notifications'));
        await Api.post('/notifications/read-all', {}); // clears the bell badge
      } catch {
        setRows([]);
      }
    })();
  }, []);

  if (!rows) return <Screen title={tr(lang, 'notifications')} onBack={nav.goBack}><Loading /></Screen>;

  return (
    <Screen title={tr(lang, 'notifications')} onBack={nav.goBack} scroll={false}>
      <ScrollView contentContainerStyle={{ paddingBottom: S.xl }}>
        {rows.length === 0 ? (
          <EmptyState label={tr(lang, 'empty')} />
        ) : (
          rows.map((n) => (
            <Card key={n.id}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: S.md }}>
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    marginTop: 6,
                    backgroundColor: n.read_at ? C.line : C.green,
                  }}
                />
                <View style={{ flex: 1 }}>
                  <Txt.H2>{n.title}</Txt.H2>
                  <Txt.Muted style={{ textAlign: 'left' }}>{n.body}</Txt.Muted>
                  <Txt.Muted style={{ textAlign: 'left', fontSize: 11, marginTop: 2 }}>
                    {new Date(n.created_at).toLocaleString()}
                  </Txt.Muted>
                </View>
                <SpeakBtn text={`${n.title}. ${n.body}`} />
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
