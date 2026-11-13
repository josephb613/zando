import React from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, T } from '../theme';
import { Appear, Logo, Tap as Pressable } from '../ui';
import { useNav } from '../nav';

/** Onglet Compte d'un visiteur en production : invite à se connecter avant d'accéder au compte. */
export function AccountGate() {
  const nav = useNav();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingTop: insets.top + 24, paddingHorizontal: 16, paddingBottom: 24 }}>
        <Appear>
          <View style={{ alignItems: 'center', gap: 14, paddingTop: 28, paddingHorizontal: 20, paddingBottom: 20, borderRadius: 20, backgroundColor: C.white }}>
            <Logo size={72} light />
            <View style={{ alignItems: 'center', gap: 6 }}>
              <T w={700} accessibilityRole="header" style={{ fontSize: 24, textAlign: 'center' }}>Votre compte</T>
              <T style={{ fontSize: 15, lineHeight: 21, color: C.grey, textAlign: 'center' }}>Un numéro de téléphone suffit, sans mot de passe.</T>
            </View>
            <Pressable onPress={() => nav.navigate('Connexion', { next: 'Compte' })} style={{ alignSelf: 'stretch', height: 52, marginTop: 6, borderRadius: 999, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' }}>
              <T w={700} style={{ fontSize: 16, color: C.white }}>Se connecter</T>
            </Pressable>
            <Pressable onPress={() => nav.popTo('Tabs', { screen: 'Accueil' })} style={{ alignSelf: 'stretch', height: 48, borderRadius: 999, borderWidth: 1.5, borderColor: C.grey6, alignItems: 'center', justifyContent: 'center' }}>
              <T w={600} style={{ fontSize: 15 }}>Continuer sans compte</T>
            </Pressable>
          </View>
        </Appear>
      </ScrollView>
    </View>
  );
}
