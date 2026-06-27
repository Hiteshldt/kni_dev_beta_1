import React, { useCallback, useEffect, useState } from 'react';
import { Api } from '../../api';
import { useSession } from '../../store';
import { tr } from '../../i18n';
import { useNav } from '../../nav';
import { Loading, Screen } from '../../ui';
import { Hub } from '../Hub';
import BuyerProfile from './BuyerProfile';

export default function BuyerHome() {
  const { lang } = useSession();
  const nav = useNav();
  const [profile, setProfile] = useState<any | undefined>(undefined);

  const check = useCallback(() => {
    Api.get('/buyer/profile').then(setProfile).catch(() => setProfile(null));
  }, []);
  useEffect(check, [check]);

  if (profile === undefined) return <Screen title="KANNI 🌾"><Loading /></Screen>;
  if (!profile || !profile.business_name) return <BuyerProfile onboarding onDone={check} />;

  return (
    <Hub
      title={'KANNI 🌾'}
      greeting={`${tr(lang, 'welcome')} ${profile.business_name}`}
      onBell={() => nav.navigate('notif')}
      items={[
        { emoji: '🛒', label: tr(lang, 'browse'), onPress: () => nav.navigate('buyer.browse') },
        { emoji: '📦', label: tr(lang, 'orders'), onPress: () => nav.navigate('buyer.orders') },
        { emoji: '🏪', label: tr(lang, 'profile'), onPress: () => nav.navigate('buyer.profile') },
      ]}
    />
  );
}
