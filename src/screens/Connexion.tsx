import React, { useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { RouteProp, useIsFocused, useRoute } from '@react-navigation/native';
import { ActivityIndicator, ScrollView, TextInput, useWindowDimensions, View } from 'react-native';
import { authMessage, sendCode } from '../firebase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, T } from '../theme';
import { Chevron, Icon, IconName } from '../icons';
import { Tap as Pressable } from '../ui';
import { RootParams, useNav } from '../nav';
import { useAuth } from '../store';
import { CountrySheet, Flag, HelpButton, HelpSheet, countryOf, formatNum } from '../auth';
import { Rise, WELCOME_BG, WelcomeScene } from './Bienvenue.parts';

/*
 * Page d'identification, ouverte après l'animation de lancement (visiteur) ou quand une action demande un compte.
 * En haut, la scène de bienvenue (téléphone, cliente, produits) ; en bas, le titre et le formulaire du numéro.
 */

/** Hauteur réservée sous la scène : titre, numéro, bouton d'envoi et « Visiter sans compte ». */
const FORM_H = 390;

/**
 * Illustration de fond sous la scène, comme le reste de la page : pictogrammes au trait blanc dans les marges,
 * `top` (px depuis le haut de la zone) ou `bottom` (px depuis le bas).
 */
const DOODLES: { name: IconName; x: number; top?: number; bottom?: number; s: number; r: number }[] = [
  { name: 'heart', x: 0.08, top: 18, s: 26, r: -12 },
  { name: 'star', x: 0.91, top: 12, s: 26, r: 10 },
  { name: 'bolt', x: 0.11, top: 74, s: 24, r: 14 },
  { name: 'ticket', x: 0.88, top: 70, s: 26, r: -8 },
  { name: 'basket', x: 0.08, bottom: 74, s: 24, r: -6 },
  { name: 'plane', x: 0.92, bottom: 76, s: 24, r: 18 },
];

function Backdrop({ W, bottomInset }: { W: number; bottomInset: number }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}>
      {DOODLES.map(d => (
        <View key={d.name} style={{
          position: 'absolute', left: d.x * W - d.s / 2, width: d.s, height: d.s, opacity: 0.4,
          ...(d.top != null ? { top: d.top } : { bottom: (d.bottom ?? 0) + bottomInset }),
          transform: [{ rotate: `${d.r}deg` }],
        }}>
          <Icon name={d.name} size={d.s} color={C.white} />
        </View>
      ))}
    </View>
  );
}

export default function Connexion() {
  const route = useRoute<RouteProp<RootParams, 'Connexion'>>();
  const nav = useNav();
  const insets = useSafeAreaInsets();
  const { width: W, height } = useWindowDimensions();
  // La scène prend la place laissée par le formulaire, sans descendre sous 240 px ni dépasser 520 px.
  const sceneH = Math.min(520, Math.max(240, height - insets.top - insets.bottom - FORM_H));
  const next = route.params?.next;
  const { phone, setPhone, confirmationRef } = useAuth();
  const focused = useIsFocused();
  const [focus, setFocus] = useState(false);
  const [sheet, setSheet] = useState<'pays' | 'aide' | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const country = countryOf(phone.dial);
  const digits = phone.num;
  const ready = digits.length === country.len && !sending;
  // Verrou synchrone contre le double appui : chaque envoi consomme un SMS (quota quotidien).
  const lockRef = useRef(false);
  const send = async () => {
    if (lockRef.current) return;
    lockRef.current = true;
    setSending(true);
    setError('');
    try {
      confirmationRef.current = await sendCode(phone.dial + digits);
      nav.navigate('CodeSMS', { next });
    } catch (e) {
      setError(authMessage(e));
    } finally {
      lockRef.current = false;
      setSending(false);
    }
  };
  const setDigits = (t: string) => setPhone({ dial: phone.dial, num: t.replace(/\D/g, '').replace(/^0+/, '').slice(0, country.len) });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.red, backgroundImage: WELCOME_BG }}
      contentContainerStyle={{ flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      {focused && <StatusBar style="light" />}
      <View style={{ marginTop: insets.top }}>
        <WelcomeScene W={W} H={sceneH} />
        <View style={{ position: 'absolute', top: 10, right: 14 }}>
          <HelpButton onPress={() => setSheet('aide')} />
        </View>
      </View>

      <View style={{ flex: 1 }}>
        <Backdrop W={W} bottomInset={insets.bottom} />

        {/* Titre : la promesse en blanc, la chute sur une étiquette jaune inclinée, ombre décalée façon affiche. */}
        <Rise delay={500}>
          <View accessible accessibilityRole="header" accessibilityLabel="Toute la Chine. Dans votre poche." style={{ alignItems: 'center', marginTop: 2 }}>
            <T w={700} style={{ fontSize: 32, lineHeight: 37, letterSpacing: -0.8, color: C.white }}>Toute la Chine.</T>
            <View style={{ marginTop: 6, transform: [{ rotate: '-2deg' }] }}>
              <View style={{ position: 'absolute', left: 4, top: 5, right: -4, bottom: -5, borderRadius: 12, backgroundColor: C.redShadow }} />
              <View style={{ paddingHorizontal: 14, paddingTop: 2, paddingBottom: 5, borderRadius: 12, backgroundColor: C.yellow }}>
                <T w={700} style={{ fontSize: 30, lineHeight: 36, letterSpacing: -0.6, color: C.ink }}>Dans votre poche.</T>
              </View>
            </View>
          </View>
        </Rise>

        {/* Numéro : posé directement sur le fond orange, sans carte. */}
        <Rise delay={620}>
          <View style={{ marginTop: 24, marginHorizontal: 20 }}>
            <T w={700} style={{ fontSize: 18, lineHeight: 22, color: C.white }}>Votre numéro</T>

            <View style={{
              flexDirection: 'row', alignItems: 'center', marginTop: 10, height: 50, borderRadius: 14, borderWidth: 2,
              backgroundColor: C.white, borderColor: focus ? C.ink : C.white,
            }}>
              <Pressable onPress={() => setSheet('pays')} accessibilityLabel={'Indicatif ' + country.dial + ', changer de pays'}
                style={{ height: '100%', flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 14, paddingRight: 10 }}>
                <Flag c={country} />
                <T w={600} style={{ fontSize: 15 }}>{country.dial}</T>
                <Icon name="chevronDown" size={12} color={C.ink} weight={1.4} />
              </Pressable>
              <View style={{ width: 1.5, height: 26, backgroundColor: C.line2 }} />
              <TextInput
                value={formatNum(digits, country.dial)}
                onChangeText={setDigits}
                onFocus={() => setFocus(true)}
                onBlur={() => setFocus(false)}
                keyboardType="phone-pad"
                inputMode="numeric"
                placeholder={country.dial === '+243' ? '97 000 0000' : '0'.repeat(country.len).replace(/(\d{3})(?=\d)/g, '$1 ')}
                placeholderTextColor={C.grey5}
                accessibilityLabel="Votre numéro de téléphone"
                style={{ flex: 1, minWidth: 0, height: '100%', paddingHorizontal: 12, fontSize: 16, letterSpacing: 0.3, color: C.ink, fontFamily: 'InstrumentSans_600SemiBold', outlineStyle: 'none' } as never}
              />
            </View>

            <Pressable
              disabled={!ready}
              accessibilityState={{ disabled: !ready }}
              onPress={send}
              style={{
                marginTop: 10, height: 50, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                backgroundColor: ready || sending ? C.ink : 'rgba(27, 27, 27, 0.35)',
              }}
            >
              {sending && <ActivityIndicator color={C.white} />}
              <T w={700} style={{ fontSize: 15, color: ready || sending ? C.white : 'rgba(255, 255, 255, 0.75)' }}>{sending ? 'Envoi…' : ready || digits.length === 0 ? 'Recevoir le code SMS' : 'Encore ' + (country.len - digits.length) + ' chiffre' + (country.len - digits.length > 1 ? 's' : '')}</T>
              {ready && <Icon name="arrowRight" size={18} color={C.white} weight={1.15} />}
            </Pressable>

            {!!error && <T w={600} accessibilityRole="alert" style={{ marginTop: 12, fontSize: 13, lineHeight: 18, color: C.yellow, textAlign: 'center' }}>{error}</T>}
          </View>
        </Rise>

        <Pressable onPress={() => (nav.canGoBack() ? nav.goBack() : nav.reset({ index: 0, routes: [{ name: 'Tabs' }] }))} style={{ marginTop: 'auto', marginBottom: 14 + insets.bottom, paddingTop: 14, alignSelf: 'center', minHeight: 44, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <T w={600} style={{ fontSize: 16, color: C.white }}>Visiter sans compte</T>
          <Chevron size={16} color={C.white} width={2.6} />
        </Pressable>
      </View>
      <CountrySheet open={sheet === 'pays'} onClose={() => setSheet(null)} value={country.dial} onPick={c => setPhone({ dial: c.dial, num: digits.slice(0, c.len) })} />
      <HelpSheet open={sheet === 'aide'} onClose={() => setSheet(null)} />
    </ScrollView>
  );
}
