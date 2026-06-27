import React, { useCallback, useEffect, useState } from 'react';
import { Api } from '../../api';
import { useSession } from '../../store';
import { tr } from '../../i18n';
import { useNav } from '../../nav';
import { Loading, Screen } from '../../ui';
import { Hub } from '../Hub';
import SellerProfile from './SellerProfile';

export default function SellerHome() {
  const { lang } = useSession();
  const nav = useNav();
  const [profile, setProfile] = useState<any | undefined>(undefined); // undefined = loading

  const check = useCallback(() => {
    Api.get('/seller/profile').then(setProfile).catch(() => setProfile(null));
  }, []);
  useEffect(check, [check]);

  if (profile === undefined) return <Screen title="KANNI 🌾"><Loading /></Screen>;
  if (!profile || !profile.name) return <SellerProfile onboarding onDone={check} />;

  return (
    <Hub
      title={'KANNI 🌾'}
      greeting={`${tr(lang, 'welcome')} ${profile.name}`}
      onBell={() => nav.navigate('notif')}
      items={[
        { emoji: '🍅', label: tr(lang, 'newListing'), onPress: () => nav.navigate('seller.new') },
        { emoji: '📦', label: tr(lang, 'myListings'), onPress: () => nav.navigate('seller.listings') },
        { emoji: '👤', label: tr(lang, 'profile'), onPress: () => nav.navigate('seller.profile') },
      ]}
    />
  );
}
