/** Éléments de structure d'écran : en-tête, feuille du bas, bouton radio. */
import React from 'react';
import { Modal, Pressable, StyleProp, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, T } from '../theme';
import { BackIcon, CloseIcon } from '../icons';
import { useNav } from '../nav';
import { Tap } from './motion';

/** En-tête blanc standard : retour + titre + zone droite. Gère la zone sûre du haut. */
export function Header({ title, right, onBack, border = true, style }: {
  title?: string; right?: React.ReactNode; onBack?: () => void; border?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const nav = useNav();
  const insets = useSafeAreaInsets();
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, paddingTop: insets.top + 8, paddingBottom: 8, paddingLeft: 4, paddingRight: 12, backgroundColor: C.white, borderBottomWidth: border ? 1 : 0, borderBottomColor: C.line }, style]}>
      <Tap accessibilityLabel="Retour" onPress={onBack ?? (() => nav.goBack())} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
        <BackIcon />
      </Tap>
      {!!title && <T w={500} style={{ fontSize: 18 }} numberOfLines={1}>{title}</T>}
      {right && <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center' }}>{right}</View>}
    </View>
  );
}

/** Feuille du bas modale : titre, bouton Fermer, contenu ; se ferme aussi en touchant le fond. */
export function BottomSheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable accessibilityLabel="Fermer" onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }} />
      <View style={{ maxHeight: '78%', borderTopLeftRadius: 20, borderTopRightRadius: 20, backgroundColor: C.white, paddingBottom: insets.bottom + 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 20, paddingRight: 8, paddingTop: 8, minHeight: 56 }}>
          <T w={700} accessibilityRole="header" style={{ fontSize: 18 }}>{title}</T>
          <CloseButton onPress={onClose} />
        </View>
        {children}
      </View>
    </Modal>
  );
}

/** Bouton « × » de 44 px, calé à droite de sa ligne. */
function CloseButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable accessibilityLabel="Fermer" onPress={onPress} style={{ marginLeft: 'auto', width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
      <CloseIcon />
    </Pressable>
  );
}

export function Radio({ on, size = 20 }: { on: boolean; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: on ? C.red : C.grey5, alignItems: 'center', justifyContent: 'center' }}>
      {on && <View style={{ width: size / 2, height: size / 2, borderRadius: size / 4, backgroundColor: C.red }} />}
    </View>
  );
}
