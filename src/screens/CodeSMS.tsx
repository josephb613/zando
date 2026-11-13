import React, { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { RouteProp, useIsFocused, useRoute } from '@react-navigation/native';
import { ActivityIndicator, Animated, View } from 'react-native';
import { authMessage, confirmCode, sendCode } from '../firebase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, T } from '../theme';
import { BackIcon, Logo, Tap as Pressable } from '../ui';
import { RootParams, useFinishLogin, useNav } from '../nav';
import { useAuth } from '../store';
import { HelpButton, HelpSheet, formatNum } from '../auth';

const LABELS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

/** Curseur clignotant (animation blink 1s step-end). */
function Caret({ h }: { h: number }) {
  const op = useState(() => new Animated.Value(1))[0];
  useEffect(() => {
    const anim = Animated.loop(Animated.sequence([
      Animated.timing(op, { toValue: 0, duration: 0, delay: 500, useNativeDriver: true }),
      Animated.timing(op, { toValue: 1, duration: 0, delay: 500, useNativeDriver: true }),
    ]));
    anim.start();
    return () => anim.stop();
  }, [op]);
  return <Animated.View style={{ width: 2, height: h, backgroundColor: C.red, opacity: op }} />;
}

function Key({ label, onPress }: { label: string; onPress: () => void }) {
  const blank = label === '' || label === '⌫';
  return (
    <View style={{ flex: 1, height: 50 }}>
      {!blank && <View style={{ position: 'absolute', left: 0, right: 0, top: 1, height: 50, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.18)' }} />}
      <Pressable
        onPress={onPress}
        disabled={label === ''}
        accessibilityLabel={label === '⌫' ? 'Effacer' : label}
        style={{ height: 50, borderRadius: 8, backgroundColor: blank ? 'transparent' : C.white, alignItems: 'center', justifyContent: 'center' }}
      >
        <T style={{ fontSize: 22 }}>{label}</T>
      </Pressable>
    </View>
  );
}

export default function CodeSMS() {
  const route = useRoute<RouteProp<RootParams, 'CodeSMS'>>();
  const nav = useNav();
  const finishLogin = useFinishLogin();
  const insets = useSafeAreaInsets();
  const { phone, confirmationRef } = useAuth();
  const next = route.params?.next;
  const focused = useIsFocused();
  const [help, setHelp] = useState(false);
  const [code, setCode] = useState('');
  const [left, setLeft] = useState(60);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const id = setInterval(() => setLeft(s => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);

  const press = (l: string) => {
    if (l === '' || busy) return;
    setError('');
    if (l === '⌫') setCode(c => c.slice(0, -1));
    else setCode(c => (c.length < 6 ? c + l : c));
  };
  const ready = code.length === 6 && !busy;
  const timer = '0:' + (left < 10 ? '0' : '') + left;
  const back = () => (nav.canGoBack() ? nav.goBack() : nav.navigate('Connexion', { next }));

  // Verrou synchrone : `busy` (état React) n'est à jour qu'au rendu suivant, donc deux appuis rapides
  // enverraient deux requêtes. Un code SMS ne sert qu'une fois : la 2e confirmation échouerait.
  const lockRef = useRef(false);

  const verify = async () => {
    if (lockRef.current) return;
    if (!confirmationRef.current) return back();
    lockRef.current = true;
    setBusy(true);
    setError('');
    try {
      const { hasCommune } = await confirmCode(confirmationRef.current, code);
      confirmationRef.current = null;
      // Reconnexion d'un compte qui a déjà sa zone : pas besoin de repasser par l'étape Commune.
      if (hasCommune) finishLogin(next);
      else nav.navigate('Commune', { next, signup: true });
    } catch (e) {
      setError(authMessage(e));
      setCode('');
    } finally {
      lockRef.current = false;
      setBusy(false);
    }
  };

  const resend = async () => {
    if (lockRef.current) return;
    lockRef.current = true;
    setBusy(true);
    setError('');
    try {
      confirmationRef.current = await sendCode(phone.dial + phone.num);
      setLeft(60);
      setCode('');
    } catch (e) {
      setError(authMessage(e));
    } finally {
      lockRef.current = false;
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.white }}>
      {focused && <StatusBar style="light" />}
      {/* Même bandeau orange que l'écran Connexion */}
      <View style={{ backgroundColor: C.red, paddingTop: insets.top + 6, paddingBottom: 12, paddingLeft: 4, paddingRight: 12, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Pressable accessibilityLabel="Retour" onPress={back} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <BackIcon color={C.white} />
        </Pressable>
        <Logo size={34} />
        <T w={700} style={{ marginLeft: 4, fontSize: 20, color: C.white }}>Zandu</T>
        <T w={500} style={{ marginLeft: 'auto', marginRight: 6, fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>Étape 1 sur 2</T>
        <HelpButton dark={false} onPress={() => setHelp(true)} />
      </View>

      <View style={{ flex: 1, paddingTop: 26, paddingHorizontal: 24, paddingBottom: 14 }}>
        <T w={500} accessibilityRole="header" style={{ fontSize: 22, lineHeight: 29 }}>{'Entrez le code\nreçu par SMS'}</T>
        <T style={{ marginTop: 8, fontSize: 14, lineHeight: 20, color: C.grey }}>
          Envoyé au <T w={700} style={{ fontSize: 14, lineHeight: 20 }}>{phone.dial + ' ' + formatNum(phone.num, phone.dial)}</T> ·{' '}
          <T w={500} onPress={back} style={{ fontSize: 14, lineHeight: 20, color: C.red }}>Modifier</T>
        </T>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 22 }}>
          {Array.from({ length: 6 }, (_, i) => {
            const filled = i < code.length, active = i === code.length;
            return (
              <View key={i} style={{ flex: 1, minWidth: 0, height: 56, borderRadius: 12, borderWidth: 2, borderColor: filled || active ? C.red : C.line2, backgroundColor: filled ? C.redSoft2 : C.white, alignItems: 'center', justifyContent: 'center' }}>
                {filled ? <T w={600} style={{ fontSize: 22 }}>{code[i]}</T> : active ? <Caret h={24} /> : null}
              </View>
            );
          })}
        </View>

        {error ? <T w={500} accessibilityRole="alert" style={{ marginTop: 12, fontSize: 13, color: C.red }}>{error}</T> : null}
        {left > 0 ? (
          <T style={{ marginTop: 14, fontSize: 13, color: C.grey }}>
            Renvoyer le code dans <T w={700} style={{ fontSize: 13, fontVariant: ['tabular-nums'] }}>{timer}</T>
          </T>
        ) : (
          <Pressable disabled={busy} onPress={resend} style={{ marginTop: 6, minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}>
            <T w={600} style={{ fontSize: 14, color: C.red }}>Renvoyer le code</T>
          </Pressable>
        )}

        <Pressable
          disabled={!ready}
          accessibilityState={{ disabled: !ready }}
          onPress={verify}
          style={{ marginTop: 'auto', height: 52, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 999, backgroundColor: ready ? C.red : C.redDisabled }}
        >
          {busy && <ActivityIndicator color={C.white} />}
          <T w={600} style={{ fontSize: 16, color: C.white }}>{busy ? 'Vérification…' : 'Valider le code'}</T>
        </Pressable>
      </View>

      <View style={{ gap: 6, paddingTop: 8, paddingHorizontal: 8, paddingBottom: 18 + insets.bottom, backgroundColor: '#EAEAEA' }}>
        {[0, 1, 2, 3].map(r => (
          <View key={r} style={{ flexDirection: 'row', gap: 6 }}>
            {LABELS.slice(r * 3, r * 3 + 3).map(l => <Key key={l || 'vide'} label={l} onPress={() => press(l)} />)}
          </View>
        ))}
      </View>
      <HelpSheet open={help} onClose={() => setHelp(false)} />
    </View>
  );
}
