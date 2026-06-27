import React, { useCallback, useEffect, useState } from 'react';
import { Api } from '../../api';
import { useSession } from '../../store';
import { tr } from '../../i18n';
import { useNav } from '../../nav';
import { Loading, Screen } from '../../ui';
import { Hub } from '../Hub';
import DriverProfile from './DriverProfile';

export default function DriverHome() {
  const { lang } = useSession();
  const nav = useNav();
  const [profile, setProfile] = useState<any | undefined>(undefined);

  const check = useCallback(() => {
    Api.get('/driver/profile').then(setProfile).catch(() => setProfile(null));
  }, []);
  useEffect(check, [check]);

  if (profile === undefined) return <Screen title="KANNI 🌾"><Loading /></Screen>;
  if (!profile || !profile.vehicle_type) return <DriverProfile onboarding onDone={check} />;

  return (
    <Hub
      title={'KANNI 🌾'}
      greeting={tr(lang, 'welcome')}
      onBell={() => nav.navigate('notif')}
      items={[
        { emoji: '🚚', label: tr(lang, 'jobs'), onPress: () => nav.navigate('driver.jobs') },
        { emoji: '💰', label: tr(lang, 'earnings'), onPress: () => nav.navigate('driver.earnings') },
        { emoji: '👤', label: tr(lang, 'profile'), onPress: () => nav.navigate('driver.profile') },
      ]}
    />
  );
}
