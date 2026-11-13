import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { C, T } from './theme';
import { Icon } from './icons';
import { BottomSheet } from './ui';

/** Indicatifs proposés : RDC d'abord, puis voisins et pays de la diaspora. `len` = chiffres attendus après l'indicatif. */
export const COUNTRIES = [
  { name: 'RD Congo', dial: '+243', flag: 'cd', len: 9 },
  { name: 'Congo-Brazzaville', dial: '+242', flag: '🇨🇬', len: 9 },
  { name: 'Angola', dial: '+244', flag: '🇦🇴', len: 9 },
  { name: 'Ouganda', dial: '+256', flag: '🇺🇬', len: 9 },
  { name: 'Rwanda', dial: '+250', flag: '🇷🇼', len: 9 },
  { name: 'Zambie', dial: '+260', flag: '🇿🇲', len: 9 },
  { name: 'Afrique du Sud', dial: '+27', flag: '🇿🇦', len: 9 },
  { name: 'Belgique', dial: '+32', flag: '🇧🇪', len: 9 },
  { name: 'France', dial: '+33', flag: '🇫🇷', len: 9 },
  { name: 'Royaume-Uni', dial: '+44', flag: '🇬🇧', len: 10 },
  { name: 'Canada / États-Unis', dial: '+1', flag: '🇨🇦', len: 10 },
  { name: 'Chine', dial: '+86', flag: '🇨🇳', len: 11 },
] as const;
export type Country = (typeof COUNTRIES)[number];
export const countryOf = (dial: string) => COUNTRIES.find(c => c.dial === dial) ?? COUNTRIES[0];

/** 970000000 → « 97 000 0000 » (format RDC) ; autres pays : groupes de 3. */
export function formatNum(digits: string, dial: string) {
  if (dial === '+243') return [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 9)].filter(Boolean).join(' ');
  return digits.replace(/(\d{3})(?=\d)/g, '$1 ');
}

/** Drapeau RDC dessiné (les émojis de drapeau ne s'affichent pas partout). */
export function FlagCD({ w = 22 }: { w?: number }) {
  return (
    <Svg width={w} height={(w * 14) / 20} viewBox="0 0 20 14">
      <Rect width={20} height={14} rx={2} fill="#007FFF" />
      <Path d="M-1 13 L21 1" stroke="#F7D618" strokeWidth={5} />
      <Path d="M-1 13 L21 1" stroke="#CE1021" strokeWidth={2.5} />
      <Path d="M4 2.2 l0.7 1.5 1.6 0.1 -1.2 1 0.4 1.6 -1.5 -0.9 -1.5 0.9 0.4 -1.6 -1.2 -1 1.6 -0.1z" fill="#F7D618" />
    </Svg>
  );
}
export function Flag({ c, w = 22 }: { c: Country; w?: number }) {
  return c.flag === 'cd' ? <FlagCD w={w} /> : <T style={{ fontSize: w, lineHeight: w + 4 }}>{c.flag}</T>;
}

export function CountrySheet({ open, onClose, value, onPick }: { open: boolean; onClose: () => void; value: string; onPick: (c: Country) => void }) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Indicatif du pays">
      <ScrollView>
        {COUNTRIES.map(c => {
          const on = c.dial === value;
          return (
            <Pressable key={c.dial} onPress={() => { onPick(c); onClose(); }} accessibilityState={{ selected: on }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingHorizontal: 20, backgroundColor: on ? C.redSoft2 : C.white }}>
              <View style={{ width: 26, alignItems: 'center' }}><Flag c={c} /></View>
              <T w={on ? 600 : 400} style={{ flex: 1, fontSize: 16 }}>{c.name}</T>
              <T w={600} style={{ fontSize: 15, color: on ? C.red : C.grey }}>{c.dial}</T>
              {on && <Icon name="check" size={18} color={C.red} weight={1.25} />}
            </Pressable>
          );
        })}
      </ScrollView>
    </BottomSheet>
  );
}

const FAQ = [
  { q: 'Je ne reçois pas le code', a: 'Vérifiez l’indicatif et le numéro. Le SMS peut prendre jusqu’à une minute ; passé ce délai, demandez un nouveau code.' },
  { q: 'Mon téléphone n’a plus de réseau', a: 'Le code arrive par SMS : il faut du réseau mobile. En attendant, vous pouvez visiter Zandu sans compte.' },
  { q: 'J’ai changé de numéro', a: 'Un numéro correspond à un compte. Avec le nouveau numéro, vous ouvrez un nouveau compte : les commandes passées restent sur l’ancien.' },
];

export function HelpSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [opened, setOpened] = useState(0);
  return (
    <BottomSheet open={open} onClose={onClose} title="Problème de connexion">
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8, gap: 8 }}>
        {FAQ.map((f, i) => {
          const on = opened === i;
          return (
            <Pressable key={f.q} onPress={() => setOpened(on ? -1 : i)} accessibilityState={{ expanded: on }}
              style={{ padding: 14, borderRadius: 12, backgroundColor: on ? C.redSoft2 : C.bg }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <T w={600} style={{ flex: 1, fontSize: 15 }}>{f.q}</T>
                <View style={{ transform: [{ rotate: on ? '180deg' : '0deg' }] }}>
                  <Icon name="chevronDown" size={16} color={C.ink} weight={1.15} />
                </View>
              </View>
              {on && <T style={{ marginTop: 8, fontSize: 14, lineHeight: 20, color: C.grey }}>{f.a}</T>}
            </Pressable>
          );
        })}
      </ScrollView>
    </BottomSheet>
  );
}

/** Bouton « ? » rond, posé sur un fond sombre ou rouge. */
export function HelpButton({ onPress, dark = true }: { onPress: () => void; dark?: boolean }) {
  return (
    <Pressable accessibilityLabel="Aide à la connexion" onPress={onPress} hitSlop={6}
      style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: dark ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.18)' }}>
      <Icon name="help" size={22} color={C.white} />
    </Pressable>
  );
}
