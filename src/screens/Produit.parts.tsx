import React, { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { C, T } from '../theme';
import { Tap } from '../ui';
import type { OpenLot } from '../store';
import { money, plural, timeLeft } from '../format';
import { LOT_HOURS } from '../shared/lots';

/**
 * Lot groupé de la fiche produit : avancement du lot ouvert (pièces réservées, échéance), ou invitation à en ouvrir un.
 * `target` / `unit` : taille et prix du lot ouvert, sinon du premier palier de gros.
 */
export function LotBlock({ lot, target, unit, retail, now, onReserve, onLeave }: {
  lot?: OpenLot; target: number; unit: number; retail: number; now: number;
  onReserve: () => void; onLeave: (lotId: string) => Promise<unknown>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const taken = lot?.taken ?? 0;
  const leave = async () => {
    if (!lot) return;
    setBusy(true);
    setError('');
    try {
      await onLeave(lot.id);
    } catch (e) {
      setError((e as Error).message || 'Échec, réessayez.');
    }
    setBusy(false);
  };

  return (
    <View style={{ backgroundColor: C.white, paddingVertical: 12, paddingHorizontal: 14, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
        <T w={600} style={{ fontSize: 15 }}>{`Lot groupé de ${target}`}</T>
        <T w={600} style={{ marginLeft: 'auto', fontSize: 15, color: C.green }}>{money(unit)}</T>
        <T style={{ fontSize: 13, color: C.grey4, textDecorationLine: 'line-through' }}>{money(retail)}</T>
      </View>

      {lot ? (
        <View style={{ gap: 6 }}>
          <View style={{ height: 8, borderRadius: 999, backgroundColor: C.line, overflow: 'hidden' }}>
            <View style={{ height: 8, borderRadius: 999, backgroundColor: C.green, width: `${Math.round((taken / target) * 100)}%` }} />
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <T w={500} style={{ fontSize: 13 }}>{`${plural(target - taken, 'pièce')} à réserver`}</T>
            <T style={{ marginLeft: 'auto', fontSize: 13, color: C.grey }}>{`Expire dans ${timeLeft(lot.expiresAt, now)}`}</T>
          </View>
        </View>
      ) : (
        <T style={{ fontSize: 13, lineHeight: 18, color: C.grey }}>
          {`Réservez quelques pièces sans payer : d’autres acheteurs complètent le lot sous ${LOT_HOURS} h et chacun paie le prix de gros.`}
        </T>
      )}

      {lot && lot.mine > 0 ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 }}>
          <T w={600} style={{ flex: 1, fontSize: 14, color: C.green }}>{`${plural(lot.mine, 'pièce')} réservée${lot.mine > 1 ? 's' : ''} pour vous`}</T>
          <Tap onPress={leave} disabled={busy} accessibilityState={{ disabled: busy, busy }} style={{ minHeight: 44, paddingHorizontal: 16, justifyContent: 'center', borderRadius: 999, borderWidth: 1.5, borderColor: C.grey6 }}>
            {busy ? <ActivityIndicator color={C.grey} /> : <T w={600} style={{ fontSize: 14 }}>Annuler</T>}
          </Tap>
        </View>
      ) : (
        <Tap onPress={onReserve} style={{ height: 46, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: C.green }}>
          <T w={600} style={{ fontSize: 15, color: C.white }}>{lot ? 'Rejoindre le lot' : 'Ouvrir un lot'}</T>
        </Tap>
      )}
      {!!error && <T w={500} accessibilityLiveRegion="polite" style={{ fontSize: 13, color: C.red }}>{error}</T>}
    </View>
  );
}
