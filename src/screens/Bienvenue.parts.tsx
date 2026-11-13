import React, { useEffect, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import { Image } from 'expo-image';
import { C } from '../theme';
import { reduceMotion } from '../ui';

/*
 * Scène de bienvenue, en haut de l'écran Connexion :
 * 1. un téléphone affichant l'accueil de Zandu monte ; une cliente entre par la droite, souriante, son iPhone en main ;
 * 2. des photos de produits détourées jaillissent du centre (ressort) et se dispersent autour ;
 * 3. tout flotte doucement en boucle.
 * Photos : assets/onboarding/ (Unsplash et Pexels, voir CREDITS.md), ombre portée intégrée au PNG.
 */

/** x, y = centre en fraction de la zone ; s = largeur en fraction de l'écran ; r = rotation finale (°). */
interface Product { img: number; x: number; y: number; s: number; r: number }

const PRODUCTS: Product[] = [
  { img: require('../../assets/onboarding/sneaker.png'), x: 0.76, y: 0.2, s: 0.3, r: 12 },
  { img: require('../../assets/onboarding/headphones.png'), x: 0.63, y: 0.12, s: 0.18, r: -8 },
  { img: require('../../assets/onboarding/cap.png'), x: 0.08, y: 0.06, s: 0.2, r: -14 },
  { img: require('../../assets/onboarding/handbag.png'), x: 0.09, y: 0.63, s: 0.2, r: -10 },
  { img: require('../../assets/onboarding/perfume.png'), x: 0.45, y: 0.08, s: 0.12, r: 8 },
  { img: require('../../assets/onboarding/backpack.png'), x: 0.12, y: 0.9, s: 0.24, r: -6 },
];

/** Téléphone (accueil de Zandu) et cliente : hauteurs en fraction de la zone, centre horizontal en fraction de l'écran. */
const PHONE = { x: 0.3, top: 0.06, h: 0.74, r: -6 };
const PERSON = { right: -0.02, h: 0.74 };
const APP_SCREEN = require('../../assets/onboarding/app-screen.jpg');
/** Proportions de la capture d'écran (écran complet du téléphone, 1080 × 2424) : l'écran du mockup a exactement ce format. */
const SCREEN_RATIO = 1080 / 2424;
const PERSON_IMG = require('../../assets/onboarding/person.png');
/** Proportions de la photo détourée de la cliente (largeur / hauteur). */
const PERSON_RATIO = 655 / 1100;

// Flottement : une seule boucle partagée, chaque produit la lit avec un décalage de phase.
const WAVE = [0, -1, 0, 1, 0];
const phase = (k: number) => [...WAVE.slice(k, 4), ...WAVE.slice(0, k + 1)];

function Floating({ idle, i, amp, children }: { idle: Animated.Value; i: number; amp: number; children: React.ReactNode }) {
  const y = phase(i % 4).map(v => v * amp);
  const r = phase((i + 1) % 4).map(v => `${v * 3}deg`);
  return (
    <Animated.View style={{ flex: 1, transform: [
      { translateY: idle.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: y }) },
      { rotate: idle.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: r }) },
    ] }}>
      {children}
    </Animated.View>
  );
}

/** Photo détourée qui part du centre de la zone, se pose à sa place puis flotte. `k` réduit les produits quand la scène est basse. */
function ProductSticker({ it, i, W, H, k, idle }: { it: Product; i: number; W: number; H: number; k: number; idle: Animated.Value }) {
  const p = useState(() => new Animated.Value(reduceMotion() ? 1 : 0))[0];
  const size = it.s * W * k;
  const left = it.x * W - size / 2;
  const top = it.y * H - size / 2;

  useEffect(() => {
    if (reduceMotion()) return;
    const anim = Animated.spring(p, { toValue: 1, delay: 450 + i * 80, friction: 6, tension: 60, useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [p, i]);

  const dx = 0.5 * W - it.x * W;
  const dy = 0.5 * H - it.y * H;
  return (
    <Animated.View pointerEvents="none" style={{
      position: 'absolute', left, top, width: size, height: size,
      opacity: p.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' }),
      transform: [
        { translateX: p.interpolate({ inputRange: [0, 1], outputRange: [dx, 0] }) },
        { translateY: p.interpolate({ inputRange: [0, 1], outputRange: [dy, 0] }) },
        { scale: p.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
        { rotate: p.interpolate({ inputRange: [0, 1], outputRange: [`${it.r - 30}deg`, `${it.r}deg`] }) },
      ],
    }}>
      <Floating idle={idle} i={i} amp={Math.max(2, size * 0.04)}>
        <Image source={it.img} style={{ flex: 1 }} contentFit="contain" />
      </Floating>
    </Animated.View>
  );
}

/** Animation d'entrée commune (ressort), ignorée si « Réduire les animations » est actif. */
function useEntrance(delay: number) {
  const p = useState(() => new Animated.Value(reduceMotion() ? 1 : 0))[0];
  useEffect(() => {
    if (reduceMotion()) return;
    const a = Animated.spring(p, { toValue: 1, delay, friction: 7, tension: 45, useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [p, delay]);
  return p;
}

/** Téléphone incliné qui affiche l'écran d'accueil réel de l'app ; il monte depuis le bas puis flotte. */
function PhoneMockup({ W, H, idle }: { W: number; H: number; idle: Animated.Value }) {
  const p = useEntrance(0);
  const h = PHONE.h * H;
  // Bordure noire régulière autour de l'écran ; l'écran garde le format exact de la capture, sans recadrage.
  const bezel = h * 0.018;
  const screenH = h - bezel * 2;
  const screenW = screenH * SCREEN_RATIO;
  const w = screenW + bezel * 2;
  const r = w * 0.17;
  return (
    <Animated.View pointerEvents="none" style={{
      position: 'absolute', left: PHONE.x * W - w / 2, top: PHONE.top * H, width: w, height: h,
      opacity: p, transform: [{ translateY: p.interpolate({ inputRange: [0, 1], outputRange: [H * 0.4, 0] }) }, { rotate: `${PHONE.r}deg` }],
    }}>
      <Animated.View style={{
        width: w, height: h, padding: bezel, borderRadius: r, backgroundColor: C.ink,
        boxShadow: '0px 18px 30px rgba(107, 34, 0, 0.45)',
        transform: [{ translateY: idle.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -5, 0] }) }],
      }}>
        <View style={{ width: screenW, height: screenH, borderRadius: r - bezel, overflow: 'hidden', backgroundColor: C.white }}>
          <Image source={APP_SCREEN} style={{ width: screenW, height: screenH }} contentFit="fill" />
        </View>
        {/* Îlot de la caméra, posé sur la barre d'état de la capture. */}
        <View style={{ position: 'absolute', top: bezel + screenH * 0.008, alignSelf: 'center', width: screenW * 0.26, height: screenH * 0.024, borderRadius: 99, backgroundColor: C.ink }} />
      </Animated.View>
    </Animated.View>
  );
}

/** Cliente détourée (bas de la photo fondu en transparence dans le PNG), en bas à droite devant le téléphone, tournée vers lui ; elle glisse depuis la droite. */
function Person({ W, H }: { W: number; H: number }) {
  const p = useEntrance(250);
  const h = PERSON.h * H;
  const w = h * PERSON_RATIO;
  return (
    <Animated.View pointerEvents="none" style={{
      position: 'absolute', right: PERSON.right * W, bottom: 0, width: w, height: h,
      opacity: p, transform: [{ translateX: p.interpolate({ inputRange: [0, 1], outputRange: [w * 0.6, 0] }) }],
    }}>
      <Image source={PERSON_IMG} style={{ flex: 1 }} contentFit="contain" contentPosition="bottom" />
    </Animated.View>
  );
}

/** Dégradé du fond de l'écran : orange clair en haut, orange au 7/10, orange foncé en bas. */
const BG_STOPS: [number, string][] = [[0, C.brandLight], [0.7, C.red], [1, C.redDark]];
export const WELCOME_BG = `linear-gradient(180deg, ${BG_STOPS.map(([t, c]) => `${c} ${t * 100}%`).join(', ')})`;


/** Fondu + montée, déclenché après `delay` ms. */
export function Rise({ delay, children }: { delay: number; children: React.ReactNode }) {
  const v = useState(() => new Animated.Value(reduceMotion() ? 1 : 0))[0];
  useEffect(() => {
    if (reduceMotion()) return;
    const a = Animated.timing(v, { toValue: 1, duration: 420, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [v, delay]);
  return (
    <Animated.View style={{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
      {children}
    </Animated.View>
  );
}

/**
 * Scène complète (téléphone, cliente, produits) dans une zone de W × H ; à poser en haut de l'écran.
 * Les tailles suivent la hauteur : sur un petit écran, la scène se resserre au lieu de déborder.
 */
export function WelcomeScene({ W, H }: { W: number; H: number }) {
  const idle = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    if (reduceMotion()) return;
    const loop = Animated.loop(Animated.timing(idle, { toValue: 1, duration: 4200, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [idle]);
  const k = Math.min(1, Math.max(0.7, H / 470));
  return (
    <View style={{ width: W, height: H }}>
      <PhoneMockup W={W} H={H} idle={idle} />
      <Person W={W} H={H} />
      {PRODUCTS.map((it, i) => <ProductSticker key={i} it={it} i={i} W={W} H={H} k={k} idle={idle} />)}
    </View>
  );
}
