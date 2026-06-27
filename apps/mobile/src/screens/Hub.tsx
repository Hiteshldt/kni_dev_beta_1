import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Api } from '../api';
import { Screen, Txt } from '../ui';
import { useSession } from '../store';
import { tr } from '../i18n';
import { C, S } from '../theme';

export type HubItem = { emoji: string; label: string; onPress: () => void; badge?: number };

// Big-tile menu used by every role's home. Large touch targets, minimal text.
// `greeting` shows the user's name; `onBell` adds a notifications tile + badge.
export function Hub({
  title,
  greeting,
  items,
  onBell,
}: {
  title: string;
  greeting?: string;
  items: HubItem[];
  onBell?: () => void;
}) {
  const { lang, signOut } = useSession();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!onBell) return;
    Api.get<{ count: number }>('/notifications/unread-count')
      .then((r) => setUnread(r.count || 0))
      .catch(() => {});
  }, [onBell]);

  const all: HubItem[] = onBell
    ? [{ emoji: '🔔', label: tr(lang, 'notifications'), onPress: onBell, badge: unread }, ...items]
    : items;

  return (
    <Screen title={title}>
      <View style={{ gap: S.md, paddingTop: S.sm }}>
        {greeting ? <Txt.H2 style={{ marginBottom: S.xs }}>{greeting}</Txt.H2> : null}
        {all.map((it) => (
          <TouchableOpacity
            key={it.label}
            onPress={it.onPress}
            activeOpacity={0.85}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: S.lg,
              backgroundColor: C.card,
              borderWidth: 1,
              borderColor: C.line,
              borderRadius: S.radius,
              padding: S.xl,
            }}
          >
            <Text style={{ fontSize: 38 }}>{it.emoji}</Text>
            <Text style={{ fontSize: 20, fontWeight: '700', color: C.ink, flex: 1 }}>{it.label}</Text>
            {it.badge ? (
              <View
                style={{
                  minWidth: 26,
                  height: 26,
                  paddingHorizontal: 7,
                  borderRadius: 13,
                  backgroundColor: C.red,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: C.white, fontWeight: '800', fontSize: 13 }}>{it.badge}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        ))}
        <TouchableOpacity onPress={signOut} style={{ padding: S.lg, alignItems: 'center' }}>
          <Txt.Muted>{tr(lang, 'logout')}</Txt.Muted>
        </TouchableOpacity>
      </View>
    </Screen>
  );
}
