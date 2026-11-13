import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { C, T } from './theme';
import { Icon, IconName } from './icons';
import { useAuth, useCart } from './store';
import { Bump, Tap as Pressable } from './ui';
import { useRequireAuth } from './nav';

type TabIcon = (p: { c: string; on: boolean }) => React.ReactElement;
const tabIcon = (name: IconName): TabIcon => function TabGlyph({ c, on }) {
  return <Icon name={name} size={25} color={c} active={on} />;
};
const Home = tabIcon('home');
const Promo = tabIcon('ticket');
const CartIc = tabIcon('basket');
const UserIc = tabIcon('user');

/** Bouton central « Prix de gros » : pastille dégradée fixe. */
function GrosButton({ on }: { on: boolean }) {
  // Identifiant de dégradé unique : sur le web, deux dégradés de même identifiant se gênent.
  const gid = 'gros' + React.useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <View style={{ position: 'absolute', top: -27, left: '50%', marginLeft: -25 }}>
      <View style={{ width: 50, height: 50, borderRadius: 25, borderWidth: 2.5, borderColor: on ? C.yellow2 : C.white, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', elevation: 6 }}>
        <Svg width={50} height={50} style={{ position: 'absolute' }}>
          <Defs>
            <LinearGradient id={gid} x1="0.3" y1="0" x2="0.7" y2="1">
              <Stop offset="0" stopColor="#FFC24A" />
              <Stop offset="0.42" stopColor="#FF7A00" />
              <Stop offset="1" stopColor={C.red} />
            </LinearGradient>
          </Defs>
          <Rect width={50} height={50} fill={`url(#${gid})`} />
        </Svg>
        {/* Vue (position relative) : sur le web, sans elle le dégradé en position absolue passe par-dessus l'icône. */}
        <View><Icon name="shop" size={29} color={C.white} active knockout="#FF7A00" /></View>
      </View>
    </View>
  );
}

const ITEMS = [
  { name: 'Accueil', label: 'Accueil', Icon: Home },
  { name: 'Promos', label: 'Promos', Icon: Promo },
  { name: 'Gros', label: 'Prix de gros', Icon: null },
  { name: 'Panier', label: 'Panier', Icon: CartIc },
  { name: 'Compte', label: 'Compte', Icon: UserIc },
] as const;

/** Onglets construits en arrière-plan après l'arrivée sur l'accueil, pour que le premier clic les affiche aussitôt. */
const PRELOAD = ['Promos', 'Gros', 'Panier', 'Compte', 'Categories'];
const PRELOAD_START = 800; // ms : laisse l'accueil s'afficher d'abord
const PRELOAD_GAP = 300; // ms entre deux onglets, pour ne pas bloquer un clic de l'utilisateur

export default function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { connected } = useAuth();
  const { itemCount } = useCart();
  const requireAuth = useRequireAuth();
  const current = state.routes[state.index].name;

  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => {
    const timers = PRELOAD.map((name, n) => setTimeout(() => {
      const s = stateRef.current;
      const route = s.routes.find(r => r.name === name);
      if (!route || s.routes[s.index].key === route.key || s.preloadedRouteKeys.includes(route.key)) return;
      navigation.preload(name);
    }, PRELOAD_START + n * PRELOAD_GAP));
    return () => timers.forEach(clearTimeout);
  }, [navigation]);
  const login = () => navigation.navigate('Connexion' as never);
  // Visiteur : l'onglet Compte a son propre bouton de connexion, le bandeau n'y est pas répété ;
  // en production, Prix de gros passe par la connexion puis s'ouvre automatiquement.
  const press = (name: (typeof ITEMS)[number]['name']) => {
    if (name === 'Gros') return requireAuth('Gros', () => navigation.navigate('Gros'));
    navigation.navigate(name);
  };
  return (
    <View>
    {!connected && current !== 'Compte' && (
      // Bande flottante au-dessus des onglets ; l'espace en dessous laisse la place au bouton central qui dépasse.
      <View style={{ paddingHorizontal: 8, paddingTop: 6, paddingBottom: 26, backgroundColor: C.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingLeft: 14, paddingRight: 8, borderRadius: 12, backgroundColor: C.ink }}>
        <T w={600} numberOfLines={1} style={{ flex: 1, minWidth: 0, fontSize: 13, color: C.white }}>Pour commander</T>
        <Pressable onPress={login} style={{ height: 36, paddingHorizontal: 14, borderRadius: 8, backgroundColor: C.yellow, alignItems: 'center', justifyContent: 'center' }}>
          <T w={700} style={{ fontSize: 14, color: C.ink }}>Se connecter</T>
        </Pressable>
      </View>
      </View>
    )}
    <View style={{ flexDirection: 'row', backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 6, paddingBottom: 10 + insets.bottom }}>
      {ITEMS.map(it => {
        const on = current === it.name;
        const color = on ? C.red : C.grey;
        return (
          <Pressable key={it.name} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => press(it.name)}
            style={{ flex: 1, minHeight: 44, alignItems: 'center', justifyContent: it.Icon ? 'center' : 'flex-end', gap: 3 }}>
            {it.Icon ? (
              <View>
                <Bump trigger={on} skip={!on}><it.Icon c={color} on={on} /></Bump>
                {it.name === 'Panier' && itemCount > 0 && (
                  <Bump trigger={itemCount} style={{ position: 'absolute', top: -7, left: 15, minWidth: 19, height: 19, paddingHorizontal: 5, borderRadius: 999, backgroundColor: C.red, borderWidth: 2, borderColor: C.white, alignItems: 'center', justifyContent: 'center' }}>
                    <T w={600} style={{ color: C.white, fontSize: 10 }}>{itemCount}</T>
                  </Bump>
                )}
              </View>
            ) : (
              <GrosButton on={on} />
            )}
            <T w={it.Icon ? (on ? 600 : 400) : 700} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ fontSize: 12, color: it.Icon ? color : C.red }}>{it.label}</T>
          </Pressable>
        );
      })}
    </View>
    </View>
  );
}
