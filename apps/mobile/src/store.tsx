import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Api } from './api';
import type { Lang } from './i18n';

export type Role = 'seller' | 'buyer' | 'driver' | 'admin' | null;

type Session = {
  ready: boolean;
  token: string | null;
  role: Role;
  lang: Lang;
  setLang: (l: Lang) => void;
  signIn: (token: string, role: Role) => Promise<void>;
  setRole: (role: Role) => void;
  signOut: () => Promise<void>;
};

const LANG_KEY = 'kanni_lang';
const ROLE_KEY = 'kanni_role';

const Ctx = createContext<Session>(null as any);
export const useSession = () => useContext(Ctx);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [role, setRoleState] = useState<Role>(null);
  const [lang, setLangState] = useState<Lang>('ta');

  useEffect(() => {
    (async () => {
      await Api.init();
      setToken(Api.getToken());
      const savedRole = (await SecureStore.getItemAsync(ROLE_KEY)) as Role;
      if (savedRole) setRoleState(savedRole);
      const savedLang = (await SecureStore.getItemAsync(LANG_KEY)) as Lang | null;
      if (savedLang) setLangState(savedLang);
      setReady(true);
    })();
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    SecureStore.setItemAsync(LANG_KEY, l);
  };

  const persistRole = (r: Role) => {
    setRoleState(r);
    if (r) SecureStore.setItemAsync(ROLE_KEY, r);
    else SecureStore.deleteItemAsync(ROLE_KEY);
  };

  const signIn = async (t: string, r: Role) => {
    await Api.setToken(t);
    setToken(t);
    persistRole(r);
  };

  const signOut = async () => {
    await Api.setToken(null);
    setToken(null);
    persistRole(null);
  };

  return (
    <Ctx.Provider
      value={{ ready, token, role, lang, setLang, signIn, setRole: persistRole, signOut }}
    >
      {children}
    </Ctx.Provider>
  );
}
