import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import {
  InstrumentSans_400Regular, InstrumentSans_500Medium, InstrumentSans_600SemiBold, InstrumentSans_700Bold,
  InstrumentSans_400Regular_Italic, InstrumentSans_500Medium_Italic, InstrumentSans_600SemiBold_Italic, InstrumentSans_700Bold_Italic,
} from '@expo-google-fonts/instrument-sans';
import { BowlbyOne_400Regular } from '@expo-google-fonts/bowlby-one';

import { C } from './src/theme';
import { AppProvider } from './src/store';
import TabBar from './src/TabBar';
import { RootParams, TabParams } from './src/nav';
import * as S from './src/screens';

const Stack = createNativeStackNavigator<RootParams>();
const Tabs = createBottomTabNavigator<TabParams>();
const navigationRef = createNavigationContainerRef<RootParams>();

// Le splash natif (même orange que l'animation de lancement) reste affiché le temps que React la monte.
SplashScreen.preventAutoHideAsync().catch(() => {});

function MainTabs() {
  return (
    <Tabs.Navigator tabBar={p => <TabBar {...p} />} screenOptions={{ headerShown: false, animation: 'none' }}>
      <Tabs.Screen name="Accueil" component={S.Accueil} />
      <Tabs.Screen name="Promos" component={S.Promos} />
      <Tabs.Screen name="Gros" component={S.Gros} />
      <Tabs.Screen name="Panier" component={S.Panier} />
      <Tabs.Screen name="Compte" component={S.Compte} />
      <Tabs.Screen name="Categories" component={S.Categories} />
    </Tabs.Navigator>
  );
}

export default function App() {
  // Les polices se chargent en arrière-plan : l'animation d'accueil s'affiche
  // immédiatement, puis le texte passe à Instrument Sans dès qu'elle est prête.
  useFonts({
    InstrumentSans_400Regular, InstrumentSans_500Medium, InstrumentSans_600SemiBold, InstrumentSans_700Bold,
    InstrumentSans_400Regular_Italic, InstrumentSans_500Medium_Italic, InstrumentSans_600SemiBold_Italic, InstrumentSans_700Bold_Italic,
    BowlbyOne_400Regular,
  });

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <SafeAreaProvider>
      <AppProvider>
        <Root />
      </AppProvider>
    </SafeAreaProvider>
  );
}

/**
 * L'animation de lancement (Intro) est la première route : à la fin, elle ouvre l'accueil si une session
 * Firebase existe, la page d'identification sinon.
 */
function Root() {
  return (
    <NavigationContainer ref={navigationRef}>
      <StatusBar style="dark" />
      <Stack.Navigator initialRouteName="Intro" screenOptions={{ headerShown: false, animation: 'ios_from_right', contentStyle: { backgroundColor: C.bg } }}>
        <Stack.Screen name="Intro" component={S.Intro} options={{ animation: 'none', contentStyle: { backgroundColor: C.red } }} />
        <Stack.Screen name="Connexion" component={S.Connexion} options={{ animation: 'fade' }} />
        <Stack.Screen name="CodeSMS" component={S.CodeSMS} />
        <Stack.Screen name="Commune" component={S.Commune} />
        <Stack.Screen name="Tabs" component={MainTabs} />
        <Stack.Screen name="Recherche" component={S.Recherche} />
        <Stack.Screen name="Resultats" component={S.Resultats} />
        <Stack.Screen name="Produit" component={S.Produit} />
        <Stack.Screen name="Variantes" component={S.Variantes} options={{ presentation: 'transparentModal', animation: 'fade' }} />
        <Stack.Screen name="Adresses" component={S.Adresses} />
        <Stack.Screen name="Adresse" component={S.Adresse} />
        <Stack.Screen name="Paiement" component={S.Paiement} />
        <Stack.Screen name="Confirmation" component={S.Confirmation} options={{ gestureEnabled: false }} />
        <Stack.Screen name="Commandes" component={S.Commandes} />
        <Stack.Screen name="Commande" component={S.Commande} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
