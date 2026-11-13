import { NavigatorScreenParams, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { VISITOR_FREE } from './env';
import type { OrderGroup } from './orderStatus';
import { useAuth } from './store';

/** Onglets du bas ; Categories n'a pas de bouton dans la barre (ouvert depuis l'accueil et la recherche). */
export type TabParams = {
  Accueil: undefined;
  Promos: undefined;
  Gros: undefined;
  Panier: undefined;
  Compte: undefined;
  Categories: { rayon?: string } | undefined;
};
export type TabName = keyof TabParams;

/** Écran à ouvrir une fois la connexion terminée : paiement, onglet Prix de gros ou Compte, ou fiche d'un article (`Produit:<id>`). */
export type AfterLogin = 'Paiement' | 'Gros' | 'Compte' | `Produit:${string}`;

/** Tri des résultats de recherche. */
export type Sort = 'rel' | 'sales' | 'asc' | 'desc';

export type RootParams = {
  Intro: undefined;
  Connexion: { next?: AfterLogin } | undefined;
  CodeSMS: { next?: AfterLogin } | undefined;
  /** `signup` : 2e étape de l'inscription ; sinon, changement de zone depuis le compte ou le panier. */
  Commune: { next?: AfterLogin; signup?: boolean } | undefined;
  Tabs: NavigatorScreenParams<TabParams> | undefined;
  Recherche: undefined;
  Resultats: { q?: string; sort?: Sort } | undefined;
  Produit: { id: string };
  /** `buy` : achat immédiat (ouvre le paiement) ; sinon ajout au panier. */
  Variantes: { id: string; buy?: boolean };
  /** `pick` : choisir l'adresse de la prochaine livraison (depuis Paiement) ; sinon gérer le carnet. */
  Adresses: { pick?: boolean } | undefined;
  Adresse: { id?: string } | undefined;
  Paiement: undefined;
  Confirmation: undefined;
  Commandes: { tab?: OrderGroup } | undefined;
  Commande: { ref: string };
};

export const useNav = () => useNavigation<NativeStackNavigationProp<RootParams>>();

/**
 * En production, les visiteurs parcourent les listes d'articles, mais ouvrir un article ou le prix de gros demande
 * un compte : sans connexion, on passe par l'écran Connexion, qui ramène ensuite à `next`.
 * Hors production (`VISITOR_FREE`), l'action s'exécute directement.
 */
export function useRequireAuth() {
  const nav = useNav();
  const { connected } = useAuth();
  return (next: AfterLogin, action: () => void) => {
    if (connected || VISITOR_FREE) action();
    else nav.navigate('Connexion', { next });
  };
}

/** Ouvre la fiche d'un article (connexion demandée aux visiteurs en production). */
export function useOpenProduct() {
  const nav = useNav();
  const requireAuth = useRequireAuth();
  return (id: string) => requireAuth(`Produit:${id}`, () => nav.push('Produit', { id }));
}

/** Fin de la connexion : reprend là où le visiteur voulait aller (`next`), sinon l'accueil. */
export function useFinishLogin() {
  const nav = useNav();
  return (next?: AfterLogin) => {
    const produit = next?.startsWith('Produit:') ? next.slice('Produit:'.length) : null;
    if (next === 'Paiement') nav.reset({ index: 1, routes: [{ name: 'Tabs', params: { screen: 'Panier' } }, { name: 'Paiement' }] });
    else if (next === 'Gros' || next === 'Compte') nav.reset({ index: 0, routes: [{ name: 'Tabs', params: { screen: next } }] });
    else if (produit) nav.reset({ index: 1, routes: [{ name: 'Tabs' }, { name: 'Produit', params: { id: produit } }] });
    else nav.reset({ index: 0, routes: [{ name: 'Tabs' }] });
  };
}
