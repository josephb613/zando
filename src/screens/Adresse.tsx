import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, ScrollView, TextInput, TextInputProps, View } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, T } from '../theme';
import { BottomSheet, Header, Radio, Tap as Pressable } from '../ui';
import { RootParams, useNav } from '../nav';
import { useAddresses, useAuth } from '../store';
import { COMMUNES, isKnownCommune, zoneFee } from '../delivery';
import { deleteAddress, saveAddress } from '../firebase';
import { Chevron, PinIcon } from '../icons';

/** Cadre commun aux champs et au sélecteur de commune. */
const BOX = { minHeight: 46, paddingHorizontal: 12, borderWidth: 1.5, borderColor: C.grey6, borderRadius: 10, backgroundColor: C.white } as const;
const INPUT = { ...BOX, fontSize: 15, color: C.ink, fontFamily: 'InstrumentSans_400Regular' } as const;

function Label({ children }: { children: React.ReactNode }) {
  return <T w={500} style={{ fontSize: 12, color: C.grey }}>{children}</T>;
}

function Field({ label, grow = true, ...rest }: { label: string; grow?: boolean } & TextInputProps) {
  return (
    <View style={[grow && { flex: 1, minWidth: 0 }, { gap: 5 }]}>
      <Label>{label}</Label>
      <TextInput accessibilityLabel={label} placeholderTextColor={C.grey4} style={INPUT} {...rest} />
    </View>
  );
}

const SECTION = { backgroundColor: C.white, paddingTop: 12, paddingHorizontal: 16, paddingBottom: 14, gap: 12 } as const;
const TYPES = ['Maison', 'Boutique', 'Bureau'];

export default function Adresse() {
  const route = useRoute<RouteProp<RootParams, 'Adresse'>>();
  const nav = useNav();
  const insets = useSafeAreaInsets();
  const { user, commune: zone } = useAuth();
  const { addresses, address: picked, pickAddress } = useAddresses();
  const existing = addresses.find(a => a.id === route.params?.id);

  const [tag, setTag] = useState(existing?.tag || 'Maison');
  const [name, setName] = useState(existing?.name ?? '');
  const [phone, setPhone] = useState(existing?.phone ?? user?.phoneNumber ?? '');
  const [commune, setCommune] = useState(existing ? existing.commune : zone);
  const [line, setLine] = useState(existing?.line ?? '');
  const [landmark, setLandmark] = useState(existing?.landmark ?? '');
  // La première adresse du carnet est l'adresse par défaut.
  const first = !existing && addresses.length === 0;
  const [def, setDef] = useState(existing?.isDefault ?? first);
  const [sheet, setSheet] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');
  const knob = useState(() => new Animated.Value(def ? 18 : 0))[0];

  useEffect(() => {
    Animated.timing(knob, { toValue: def ? 18 : 0, duration: 150, useNativeDriver: true }).start();
  }, [def, knob]);

  const save = async () => {
    if (!user) { setError('Connectez-vous pour enregistrer une adresse.'); return; }
    if (!name.trim() || !phone.trim() || !line.trim()) { setError('Renseignez le destinataire, le téléphone et l’adresse.'); return; }
    if (!isKnownCommune(commune)) { setError('Choisissez la commune de livraison.'); return; }
    setBusy(true);
    setError('');
    try {
      await saveAddress(user.uid, {
        id: existing?.id, tag, name: name.trim(), phone: phone.trim(), line: line.trim(), commune, landmark: landmark.trim(),
        isDefault: def || first, order: existing?.order ?? Date.now(),
      });
      nav.goBack();
    } catch {
      setError('Enregistrement impossible. Vérifiez votre connexion et réessayez.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!user || !existing) return;
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setBusy(true);
    try {
      await deleteAddress(user.uid, existing.id);
      if (picked?.id === existing.id) pickAddress(null);
      nav.goBack();
    } catch {
      setError('Suppression impossible. Vérifiez votre connexion et réessayez.');
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title={existing ? 'Modifier l’adresse' : 'Nouvelle adresse'} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 8, paddingVertical: 8 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={SECTION}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Field label="Destinataire" value={name} onChangeText={setName} placeholder="Nom et prénom" />
            <Field label="Téléphone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+243 …" />
          </View>
        </View>

        <View style={SECTION}>
          <View style={{ gap: 5 }}>
            <Label>Commune</Label>
            <Pressable onPress={() => setSheet(true)} accessibilityLabel={'Commune : ' + (commune || 'à choisir')} style={[BOX, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
              <T style={{ flex: 1, fontSize: 15, color: isKnownCommune(commune) ? C.ink : C.grey4 }}>{isKnownCommune(commune) ? commune : 'Choisir la commune'}</T>
              <View style={{ transform: [{ rotate: '90deg' }] }}><Chevron size={14} color={C.grey4} /></View>
            </Pressable>
          </View>
          <Field grow={false} label="Adresse" value={line} onChangeText={setLine} placeholder="Ex. : 12, avenue Kasa-Vubu, quartier Matonge" />
          <View style={{ gap: 5 }}>
            <Label>Point de repère</Label>
            <TextInput accessibilityLabel="Point de repère" multiline numberOfLines={2} textAlignVertical="top"
              value={landmark} onChangeText={setLandmark}
              placeholder="Ex. : en face de l’école, portail bleu" placeholderTextColor={C.grey4}
              style={[INPUT, { minHeight: 63, paddingVertical: 10, lineHeight: 20 }]} />
          </View>
          {isKnownCommune(commune) && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <PinIcon color={C.green} size={13} />
              <T w={500} style={{ flex: 1, fontSize: 12, color: C.green }}>{`${commune} : livraison standard ${zoneFee(commune)}`}</T>
            </View>
          )}
        </View>

        <View style={SECTION}>
          <View style={{ gap: 8 }}>
            <Label>Type d’adresse</Label>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {TYPES.map(l => {
                const a = l === tag;
                return (
                  <Pressable key={l} onPress={() => setTag(l)} accessibilityRole="radio" accessibilityState={{ checked: a }}
                    style={{ flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 2, borderColor: a ? C.red : C.line2, backgroundColor: a ? C.redSoft2 : C.white }}>
                    <T w={500} style={{ fontSize: 14, color: a ? C.redDark : C.ink }}>{l}</T>
                  </Pressable>
                );
              })}
            </View>
          </View>
          {!first && (
            <Pressable onPress={() => setDef(d => !d)} accessibilityRole="switch" accessibilityState={{ checked: def }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 }}>
              <T style={{ flex: 1, fontSize: 14 }}>Adresse par défaut</T>
              <View style={{ width: 46, height: 28, borderRadius: 999, backgroundColor: def ? C.red : C.grey7 }}>
                <Animated.View style={{ position: 'absolute', top: 3, left: 3, width: 22, height: 22, borderRadius: 11, backgroundColor: C.white, transform: [{ translateX: knob }] }} />
              </View>
            </Pressable>
          )}
        </View>

        {existing && (
          <Pressable disabled={busy} onPress={remove} style={{ minHeight: 50, alignItems: 'center', justifyContent: 'center', backgroundColor: C.white }}>
            <T w={600} style={{ fontSize: 15, color: C.red }}>{confirmDelete ? 'Confirmer la suppression' : 'Supprimer l’adresse'}</T>
          </Pressable>
        )}
      </ScrollView>

      <View style={{ paddingTop: 10, paddingHorizontal: 14, paddingBottom: 16 + insets.bottom, backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.line }}>
        {!!error && <T w={500} accessibilityRole="alert" style={{ marginBottom: 8, fontSize: 13, color: C.red, textAlign: 'center' }}>{error}</T>}
        <Pressable disabled={busy} onPress={save} accessibilityState={{ disabled: busy }}
          style={{ height: 52, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 999, backgroundColor: busy ? C.redDisabled : C.red }}>
          {busy && <ActivityIndicator color={C.white} />}
          <T w={600} style={{ fontSize: 16, color: C.white }}>{busy ? 'Enregistrement…' : 'Enregistrer'}</T>
        </Pressable>
      </View>

      <BottomSheet open={sheet} onClose={() => setSheet(false)} title="Commune">
        <ScrollView>
          {COMMUNES.map(([c]) => {
            const a = c === commune;
            return (
              <Pressable key={c} onPress={() => { setCommune(c); setSheet(false); }} accessibilityRole="radio" accessibilityState={{ checked: a }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 50, paddingHorizontal: 20, backgroundColor: a ? C.redSoft2 : C.white }}>
                <Radio on={a} />
                <T w={a ? 600 : 400} style={{ flex: 1, fontSize: 15 }}>{c}</T>
                <T style={{ fontSize: 12, color: C.grey }}>{zoneFee(c)}</T>
              </Pressable>
            );
          })}
        </ScrollView>
      </BottomSheet>
    </View>
  );
}
