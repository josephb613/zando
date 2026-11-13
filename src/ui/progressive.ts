/** Affichage progressif des longues listes dans une ScrollView (le catalogue compte plus de 1 000 articles). */
import { useState } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

/**
 * Renvoie le nombre d'éléments à afficher et le gestionnaire `onScroll` à poser sur la ScrollView :
 * `step` éléments de plus chaque fois que le bas de la liste approche. Revient à `step` quand `resetKey` change.
 */
export function useProgressive(resetKey: unknown, step = 30) {
  const [state, setState] = useState({ key: resetKey, limit: step });
  // Changement de filtre ou d'onglet : on repart du premier lot pendant le rendu (pas d'effet en cascade).
  if (state.key !== resetKey) setState({ key: resetKey, limit: step });
  const onScroll = ({ nativeEvent: e }: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (e.layoutMeasurement.height + e.contentOffset.y >= e.contentSize.height - 1200) setState(s => ({ ...s, limit: s.limit + step }));
  };
  return { limit: state.key === resetKey ? state.limit : step, onScroll, scrollEventThrottle: 200 };
}
