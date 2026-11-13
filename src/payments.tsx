/** Moyens de paiement côté affichage : libellés, détails et pastilles de logo. */
import React from 'react';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { Image } from 'expo-image';
import { airtelLogo, orangeMoneyLogo } from './payLogos';
import { C, T } from './theme';
import { CASH, PAY_METHODS, PayMethod } from './shared/orders';

export { CASH };
export type { PayMethod };

/** `mobile` : paiement mobile money, avec le numéro à débiter. */
export interface PayOpt { label: PayMethod; detail: string; mobile: boolean }
const DETAILS: Record<PayMethod, string> = {
  'M-Pesa': 'Vodacom',
  'Orange Money': 'Orange RDC',
  'Airtel Money': 'Airtel RDC',
  'Paiement à la livraison': 'Espèces, USD ou CDF',
};
export const PAYS: PayOpt[] = PAY_METHODS.map(label => ({ label, detail: DETAILS[label], mobile: label !== CASH }));

// M-Pesa RDC (Vodacom Congo) : mot « m-pesa » recadré depuis l'icône officielle de l'app « M-Pesa DRC », posé sur son rouge.
const MPESA_DRC = require('../assets/img/mpesa-drc.png');
const LOGOS: Partial<Record<PayMethod, { xml: string; w: number; h: number }>> = {
  'Orange Money': { xml: orangeMoneyLogo, w: 50, h: 14 },
  'Airtel Money': { xml: airtelLogo, w: 30, h: 30 },
};

const tile = { width: 58, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' } as const;

/** Pastille du moyen de paiement : logo officiel, ou « $ » pour le paiement en espèces. */
export function PayTag({ method }: { method: PayMethod }) {
  if (method === 'M-Pesa') {
    return (
      <View style={[tile, { backgroundColor: '#EE0000' }]}>
        <Image source={MPESA_DRC} style={{ width: 56, height: 15 }} contentFit="contain" />
      </View>
    );
  }
  const logo = LOGOS[method];
  if (logo) {
    return (
      <View style={[tile, { borderWidth: 1, borderColor: C.line2, backgroundColor: C.white }]}>
        <SvgXml xml={logo.xml} width={logo.w} height={logo.h} />
      </View>
    );
  }
  return (
    <View style={[tile, { backgroundColor: C.greenPale }]}>
      <T w={700} style={{ fontSize: 15, color: C.green2 }}>$</T>
    </View>
  );
}
