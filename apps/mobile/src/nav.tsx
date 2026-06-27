import React, { createContext, useContext, useMemo, useState } from 'react';

// A tiny stack navigator — no native router dependency, so it just works in
// Expo Go. Screens are looked up by name from a registry passed to NavHost.
export type Route = { name: string; params?: any };
export type ScreenProps = { params?: any };
export type Screens = Record<string, React.ComponentType<ScreenProps>>;

type Nav = {
  navigate: (name: string, params?: any) => void;
  replace: (name: string, params?: any) => void;
  reset: (name: string, params?: any) => void;
  goBack: () => void;
  canGoBack: boolean;
  current: Route;
};

const Ctx = createContext<Nav>(null as any);
export const useNav = () => useContext(Ctx);

export function NavHost({
  screens,
  initial,
  resetKey,
}: {
  screens: Screens;
  initial: Route;
  resetKey: string; // change this to hard-reset the stack (e.g. on login/logout)
}) {
  const [stack, setStack] = useState<Route[]>([initial]);
  const [key, setKey] = useState(resetKey);

  // When the auth context flips, rebuild the stack from the new initial route.
  if (key !== resetKey) {
    setKey(resetKey);
    setStack([initial]);
  }

  const nav = useMemo<Nav>(
    () => ({
      navigate: (name, params) => setStack((s) => [...s, { name, params }]),
      replace: (name, params) => setStack((s) => [...s.slice(0, -1), { name, params }]),
      reset: (name, params) => setStack([{ name, params }]),
      goBack: () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)),
      canGoBack: stack.length > 1,
      current: stack[stack.length - 1],
    }),
    [stack],
  );

  const route = stack[stack.length - 1];
  const Screen = screens[route.name];

  return (
    <Ctx.Provider value={nav}>
      {Screen ? <Screen params={route.params} /> : null}
    </Ctx.Provider>
  );
}
