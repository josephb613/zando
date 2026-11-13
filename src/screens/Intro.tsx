import React, { useEffect, useState } from 'react';
import { Animated, Easing, useWindowDimensions, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { C } from '../theme';
import { Icon, IconName } from '../icons';
import { Logo, reduceMotion } from '../ui';
import { useNav } from '../nav';
import { useAuth } from '../store';

/*
 * Animation de lancement (à chaque ouverture de l'app), sur le orange de l'icône :
 * 1. la tuile du logo apparaît, grandit en se redressant et pivote sur elle-même comme une pièce ;
 * 2. vingt produits (photos Unsplash/Pexels et catalogue Zandu) et des pictogrammes jaillissent du centre et remplissent l'écran ;
 * 3. tout dérive doucement un instant ;
 * 4. tout est aspiré vers le centre, la tuile rétrécit ;
 * 5. ouverture de l'accueil (compte connecté) ou de la page d'identification.
 */

/** x, y = centre en fraction de l'écran ; s = largeur en fraction de l'écran ; r = rotation finale (°). */
interface Piece { img?: number; doodle?: IconName; x: number; y: number; s: number; r: number }

const PIECES: Piece[] = [
  { img: require('../../assets/onboarding/headphones.png'), x: 0.15, y: 0.1, s: 0.4, r: -12 },
  { img: require('../../assets/intro/sneaker-green.png'), x: 0.5, y: 0.07, s: 0.34, r: 8 },
  { img: require('../../assets/onboarding/denim.png'), x: 0.86, y: 0.11, s: 0.42, r: 10 },
  { img: require('../../assets/intro/earbuds.png'), x: 0.12, y: 0.27, s: 0.2, r: -8 },
  { img: require('../../assets/onboarding/camera.png'), x: 0.38, y: 0.24, s: 0.2, r: 8 },
  { img: require('../../assets/intro/intercom.png'), x: 0.64, y: 0.25, s: 0.26, r: -6 },
  { img: require('../../assets/intro/hoodie.png'), x: 0.9, y: 0.3, s: 0.3, r: 12 },
  { img: require('../../assets/onboarding/perfume.png'), x: 0.06, y: 0.4, s: 0.14, r: -10 },
  { img: require('../../assets/intro/messenger.png'), x: 0.17, y: 0.5, s: 0.3, r: -6 },
  { img: require('../../assets/onboarding/handbag.png'), x: 0.86, y: 0.47, s: 0.28, r: 10 },
  { img: require('../../assets/intro/belt.png'), x: 0.93, y: 0.61, s: 0.24, r: -14 },
  { img: require('../../assets/onboarding/cap.png'), x: 0.1, y: 0.65, s: 0.28, r: -14 },
  { img: require('../../assets/intro/cocktail.png'), x: 0.36, y: 0.66, s: 0.24, r: 6 },
  { img: require('../../assets/intro/brushes.png'), x: 0.62, y: 0.66, s: 0.24, r: -8 },
  { img: require('../../assets/intro/puffer.png'), x: 0.82, y: 0.74, s: 0.3, r: 8 },
  { img: require('../../assets/onboarding/backpack.png'), x: 0.15, y: 0.87, s: 0.4, r: 8 },
  { img: require('../../assets/intro/compressor.png'), x: 0.42, y: 0.86, s: 0.26, r: -6 },
  { img: require('../../assets/intro/phone-holder.png'), x: 0.6, y: 0.95, s: 0.22, r: 10 },
  { img: require('../../assets/onboarding/sneaker.png'), x: 0.82, y: 0.89, s: 0.46, r: -10 },
  { img: require('../../assets/intro/tshirt.png'), x: 0.38, y: 0.97, s: 0.26, r: -4 },
  { doodle: 'heart', x: 0.3, y: 0.15, s: 0.08, r: -10 },
  { doodle: 'star', x: 0.7, y: 0.39, s: 0.075, r: 8 },
  { doodle: 'bolt', x: 0.3, y: 0.39, s: 0.075, r: 12 },
  { doodle: 'ticket', x: 0.5, y: 0.77, s: 0.08, r: -6 },
  { doodle: 'pin', x: 0.06, y: 0.77, s: 0.075, r: -12 },
  { doodle: 'chat', x: 0.74, y: 0.15, s: 0.08, r: 0 },
];

/** Centre de la tuile du logo (fraction de l'écran) et taille (fraction de la largeur). */
const CENTER = { x: 0.5, y: 0.46 };
const TILE = 0.3;
/** Durées (ms) : apparition du logo, jaillissement, dérive, aspiration, pause finale. */
const T = { pop: 380, burst: 480, hold: 520, implode: 320, rest: 240 };

/**
 * Produit ou pictogramme : il part du centre (petit, invisible), se pose à sa place avec un ressort,
 * dérive vers l'extérieur pendant la pause, puis est aspiré vers le centre.
 */
function Flying({ it, i, W, H, out, back, drift }: {
  it: Piece; i: number; W: number; H: number; out: Animated.Value; back: Animated.Value; drift: Animated.Value;
}) {
  const size = it.s * W;
  const left = it.x * W - size / 2;
  const top = it.y * H - size / 2;
  const dx = CENTER.x * W - it.x * W;
  const dy = CENTER.y * H - it.y * H;
  // Décalage propre à chaque pièce, pour que l'explosion et l'aspiration ne soient pas parfaitement synchrones.
  const lag = (i % 5) * 0.035;
  const o = out.interpolate({ inputRange: [0, lag, 1], outputRange: [0, 0, 1], extrapolateRight: 'extend' });
  const b = back.interpolate({ inputRange: [0, lag, 1], outputRange: [0, 0, 1], extrapolate: 'clamp' });
  return (
    <Animated.View pointerEvents="none" style={{
      position: 'absolute', left, top, width: size, height: size,
      opacity: o.interpolate({ inputRange: [0, 0.12, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' }),
      transform: [
        { translateX: o.interpolate({ inputRange: [0, 1], outputRange: [dx, 0] }) },
        { translateY: o.interpolate({ inputRange: [0, 1], outputRange: [dy, 0] }) },
        { scale: o.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) },
        { rotate: o.interpolate({ inputRange: [0, 1], outputRange: [`${it.r - 35}deg`, `${it.r}deg`] }) },
      ],
    }}>
      <Animated.View style={{
        flex: 1,
        opacity: b.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 1, 0] }),
        transform: [
          // Dérive : légère poussée vers l'extérieur pendant la pause.
          { translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [0, -dx * 0.05] }) },
          { translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [0, -dy * 0.05] }) },
          // Aspiration vers le centre.
          { translateX: b.interpolate({ inputRange: [0, 1], outputRange: [0, dx * 1.05] }) },
          { translateY: b.interpolate({ inputRange: [0, 1], outputRange: [0, dy * 1.05] }) },
          { scale: b.interpolate({ inputRange: [0, 1], outputRange: [1, 0.15] }) },
          { scale: drift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) },
        ],
      }}>
        {it.img ? <Image source={it.img} style={{ flex: 1 }} contentFit="contain" /> : <Icon name={it.doodle!} size={size} color={C.white} />}
      </Animated.View>
    </Animated.View>
  );
}

export default function Intro() {
  const nav = useNav();
  const { authReady, connected } = useAuth();
  const { width: W, height: H } = useWindowDimensions();
  const still = reduceMotion();
  const [done, setDone] = useState(false);

  const pop = useState(() => new Animated.Value(still ? 1 : 0))[0];
  const flip = useState(() => new Animated.Value(still ? 1 : 0))[0];
  const out = useState(() => new Animated.Value(0))[0];
  const drift = useState(() => new Animated.Value(0))[0];
  const back = useState(() => new Animated.Value(0))[0];
  const shrink = useState(() => new Animated.Value(0))[0];

  useEffect(() => {
    if (still) {
      const t = setTimeout(() => setDone(true), 700);
      return () => clearTimeout(t);
    }
    const anim = Animated.sequence([
      Animated.delay(120),
      Animated.parallel([
        // Apparition : la tuile grandit en se redressant…
        Animated.timing(pop, { toValue: 1, duration: T.pop, easing: Easing.out(Easing.back(1.6)), useNativeDriver: true }),
        // … et pivote sur elle-même au moment où les produits jaillissent.
        Animated.sequence([
          Animated.delay(T.pop * 0.45),
          Animated.timing(flip, { toValue: 1, duration: 360, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.delay(T.pop * 0.6),
          // Durée fixe avec léger dépassement (comme un ressort, sans la longue fin d'oscillation).
          Animated.timing(out, { toValue: 1, duration: T.burst, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }),
        ]),
      ]),
      Animated.timing(drift, { toValue: 1, duration: T.hold, easing: Easing.linear, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(back, { toValue: 1, duration: T.implode, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(shrink, { toValue: 1, duration: T.implode + 80, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.delay(T.rest),
    ]);
    anim.start(({ finished }) => finished && setDone(true));
    return () => anim.stop();
  }, [still, pop, flip, out, drift, back, shrink]);

  // Une fois l'animation finie et la session connue : accueil si connecté, page d'identification sinon.
  useEffect(() => {
    if (!done || !authReady) return;
    nav.reset({ index: 0, routes: [{ name: connected ? 'Tabs' : 'Connexion' }] });
  }, [done, authReady, connected, nav]);

  const tile = TILE * W;
  return (
    <View style={{ flex: 1, backgroundColor: C.red }}>
      <StatusBar style="light" />
      {!still && PIECES.map((it, i) => <Flying key={i} it={it} i={i} W={W} H={H} out={out} back={back} drift={drift} />)}
      <Animated.View pointerEvents="none" style={{
        position: 'absolute', left: CENTER.x * W - tile / 2, top: CENTER.y * H - tile / 2, width: tile, height: tile,
        transform: [
          { scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.25, 1] }) },
          { rotate: pop.interpolate({ inputRange: [0, 1], outputRange: ['-24deg', '0deg'] }) },
          // Rotation « pièce » : la tuile s'amincit jusqu'à la tranche puis revient.
          { scaleX: flip.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.06, 1] }) },
          { scale: drift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) },
          { scale: shrink.interpolate({ inputRange: [0, 1], outputRange: [1, 0.42] }) },
        ],
      }}>
        <View style={{ flex: 1, borderRadius: tile * 0.28, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center', boxShadow: '0px 10px 24px rgba(107, 34, 0, 0.35)' }}>
          <Logo size={tile * 0.78} light />
        </View>
      </Animated.View>
    </View>
  );
}
