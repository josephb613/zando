import React from 'react';
import { ScrollView, View } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, T } from '../theme';
import { PinIcon } from '../icons';
import { Header, Radio, Tap as Pressable } from '../ui';
import { RootParams, useFinishLogin, useNav } from '../nav';
import { useAuth } from '../store';
import { COMMUNES, zoneFee } from '../delivery';

/**
 * Zone de livraison : 2e étape de l'inscription (`signup`), ou changement de zone depuis le compte ou le panier.
 * La zone fixe les frais de livraison tant qu'aucune adresse n'est choisie.
 */
export default function Commune() {
  const route = useRoute<RouteProp<RootParams, 'Commune'>>();
  const nav = useNav();
  const finishLogin = useFinishLogin();
  const insets = useSafeAreaInsets();
  const { commune, setCommune } = useAuth();
  const signup = route.params?.signup === true;
  // Inscription : le compte est déjà créé ; « retour » comme « Commencer » enregistrent la zone affichée
  // (même si elle n'a pas été touchée) pour que l'étape ne soit plus demandée à la reconnexion.
  const done = () => {
    if (!signup) return nav.goBack();
    setCommune(commune);
    finishLogin(route.params?.next);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header
        title="Zone de livraison"
        onBack={done}
        right={signup ? <T w={500} style={{ fontSize: 13, color: C.grey }}>Étape 2 sur 2</T> : undefined}
      />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
        <T w={600} accessibilityRole="header" style={{ paddingTop: 16, paddingHorizontal: 16, paddingBottom: 8, fontSize: 16 }}>Où devons-nous livrer à Kinshasa ?</T>
        <View style={{ backgroundColor: C.white, paddingVertical: 4, paddingHorizontal: 16 }}>
          {COMMUNES.map(([name, zone]) => {
            const a = name === commune;
            return (
              <Pressable key={name} onPress={() => setCommune(name)} accessibilityRole="radio" accessibilityState={{ checked: a }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, borderBottomWidth: 1, borderBottomColor: C.bg2 }}>
                <Radio on={a} />
                <T w={a ? 600 : 400} style={{ flex: 1, minWidth: 0, fontSize: 15 }}>{name}</T>
                <T w={500} style={{ fontSize: 13, color: zone === 0 ? C.green : C.ink }}>{zoneFee(name, true)}</T>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={{ paddingTop: 10, paddingHorizontal: 14, paddingBottom: 16 + insets.bottom, backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.line, gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <PinIcon size={14} color={C.green} />
          <T style={{ flexShrink: 1, fontSize: 13, color: C.green }}>{`${commune} : livraison standard ${zoneFee(commune)}`}</T>
        </View>
        <Pressable onPress={done} style={{ height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 999, backgroundColor: C.red }}>
          <T w={600} style={{ fontSize: 16, color: C.white }}>{signup ? 'Commencer mes achats' : 'Valider'}</T>
        </Pressable>
      </View>
    </View>
  );
}
