import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import {
  Address, Confirmation, Line, Order, Profile, User, createOrders, loadProfile, saveCart, saveProfile,
  watchAddresses, watchCart, watchOrders, watchProducts, watchUser,
} from './firebase';
import { CAT, CatItem, currentPrice } from './catalog';
import { SHIPS, isKnownCommune, shipPrice } from './delivery';
import { CASH, PayMethod } from './shared/orders';
import { MAX_QTY, priceForQty } from './shared/pricing';

export type { Line };

/** Ligne du panier avec son article du catalogue ; `p` absent : l'article n'est plus au catalogue. */
export interface CartItem extends Line { p?: CatItem }

/** Quantité cochée d'un même article (toutes tailles confondues) : c'est elle qui fixe le palier de prix. */
export const selectedQty = (items: CartItem[], k: string) =>
  items.reduce((n, x) => (x.k === k && x.selected && x.p ? n + x.qty : n), 0);
/** Prix unitaire d'un article pour une quantité donnée (palier atteint, sinon prix courant). */
export const unitPrice = (p: CatItem, qty: number) => priceForQty(p.t, qty, currentPrice(p));

/** Zone par défaut tant que le visiteur n'en a pas choisi. */
const DEFAULT_COMMUNE = 'Gombe';

/**
 * Contexte React à partir d'un hook d'état : renvoie le fournisseur et le hook d'accès,
 * qui lève une erreur s'il est appelé hors du fournisseur.
 */
function createStore<T>(hookName: string, useValue: () => T) {
  const Ctx = createContext<T | null>(null);
  function Provider({ children }: { children: React.ReactNode }) {
    return <Ctx.Provider value={useValue()}>{children}</Ctx.Provider>;
  }
  function useStore() {
    const v = useContext(Ctx);
    if (!v) throw new Error(`${hookName} hors de son fournisseur (AppProvider)`);
    return v;
  }
  return [Provider, useStore] as const;
}

/* ---------- Authentification et zone de livraison ---------- */

function useAuthState() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  /** Numéro saisi à la connexion (indicatif + chiffres), conservé entre Connexion et CodeSMS. */
  const [phone, setPhone] = useState({ dial: '+243', num: '' });
  /** Zone choisie sur cet appareil (visiteur, ou avant que le profil ne soit chargé). */
  const [picked, setPicked] = useState<string | null>(null);
  /** Envoi SMS en cours, conservé entre les écrans Connexion et CodeSMS. */
  const confirmationRef = useRef<Confirmation | null>(null);
  const connected = user !== null;

  useEffect(() => {
    let cancelled = false;
    const off = watchUser(u => {
      setUser(u);
      setAuthReady(true);
      if (u) loadProfile(u.uid).then(p => { if (!cancelled) setProfile(p); }).catch(() => {});
      else {
        setProfile(null);
        setPhone({ dial: '+243', num: '' });
        confirmationRef.current = null;
      }
    });
    return () => { cancelled = true; off(); };
  }, []);

  /** Zone de livraison préférée : celle de l'appareil, sinon celle du profil ; sert tant qu'aucune adresse n'est choisie. */
  const candidate = picked ?? profile?.commune;
  const commune = candidate && isKnownCommune(candidate) ? candidate : DEFAULT_COMMUNE;
  const setCommune = useCallback((c: string) => {
    setPicked(c);
    if (user) {
      setProfile(p => (p ? { ...p, commune: c } : p));
      saveProfile(user.uid, { commune: c }).catch(() => {});
    }
  }, [user]);

  return useMemo(
    () => ({ user, authReady, connected, profile, phone, setPhone, confirmationRef, commune, setCommune }),
    [user, authReady, connected, profile, phone, commune, setCommune],
  );
}

const [AuthProvider, useAuth] = createStore('useAuth', useAuthState);
export { useAuth };

/* ---------- Catalogue ---------- */

function useCatalogState() {
  /** Catalogue : copie intégrée au démarrage, remplacée par Firestore dès qu'elle arrive (lecture publique, visiteurs compris). */
  const [products, setProducts] = useState<CatItem[]>(CAT);
  const [catalogReady, setCatalogReady] = useState(false);
  useEffect(() => {
    try {
      return watchProducts(items => {
        if (items.length) setProducts(items);
        setCatalogReady(true);
      });
    } catch {
      // Firestore indisponible (web) : on garde le catalogue local et on débloque l'UI au prochain tick.
      const t = setTimeout(() => setCatalogReady(true), 0);
      return () => clearTimeout(t);
    }
  }, []);
  const byKey = useMemo(() => new Map(products.map(p => [p.k, p])), [products]);
  return useMemo(() => ({ products, byKey, catalogReady }), [products, byKey, catalogReady]);
}

const [CatalogProvider, useCatalog] = createStore('useCatalog', useCatalogState);
export { useCatalog };

/* ---------- Historique de la session : recherches et articles consultés ---------- */

function useHistoryState() {
  const [searches, setSearches] = useState<string[]>([]);
  const [viewed, setViewed] = useState<string[]>([]);
  const addSearch = useCallback((q: string) => setSearches(s => [q, ...s.filter(x => x !== q)].slice(0, 8)), []);
  const clearSearches = useCallback(() => setSearches([]), []);
  const addViewed = useCallback((k: string) => setViewed(v => [k, ...v.filter(x => x !== k)].slice(0, 12)), []);
  return useMemo(() => ({ searches, addSearch, clearSearches, viewed, addViewed }), [searches, addSearch, clearSearches, viewed, addViewed]);
}

const [HistoryProvider, useHistory] = createStore('useHistory', useHistoryState);
export { useHistory };

/* ---------- Adresses de livraison ---------- */

function useAddressesState() {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  /** Adresse cochée pour la prochaine livraison ; sinon l'adresse par défaut, sinon la première. */
  const [pickedId, setPickedId] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return undefined;
    const off = watchAddresses(uid, a => {
      setAddresses(a);
      setLoadedFor(uid);
    });
    return () => {
      off();
      setAddresses([]);
      setLoadedFor(null);
      setPickedId(null);
    };
  }, [uid]);

  const address = useMemo(
    () => addresses.find(a => a.id === pickedId) ?? addresses.find(a => a.isDefault) ?? addresses[0] ?? null,
    [addresses, pickedId],
  );
  const addressesReady = !uid || loadedFor === uid;
  return useMemo(() => ({ addresses, address, pickAddress: setPickedId, addressesReady }), [addresses, address, addressesReady]);
}

const [AddressesProvider, useAddresses] = createStore('useAddresses', useAddressesState);
export { useAddresses };

/** Une adresse ne peut servir à livrer que si sa commune est desservie (les anciennes adresses n'en avaient pas). */
export const isDeliverable = (a: Address | null): a is Address => !!a && isKnownCommune(a.commune);

/* ---------- Panier ---------- */

export interface NewLine { k: string; variant: string; qty: number }

function useCartState() {
  const { user, commune: zone } = useAuth();
  const { byKey } = useCatalog();
  const { address } = useAddresses();
  const uid = user?.uid ?? null;
  const [lines, setLines] = useState<Line[]>([]);
  const [payMethod, setPayMethod] = useState<PayMethod>('M-Pesa');
  /** Numéro mobile money saisi dans Paiement ; `null` tant qu'il n'a pas été modifié (numéro du compte par défaut). */
  const [payPhoneInput, setPayPhone] = useState<string | null>(null);
  /** Option de livraison choisie (index dans SHIPS). */
  const [shipChoice, setShipIndex] = useState(0);
  const cartReady = useRef(false); // le panier du compte a été chargé : on peut le sauvegarder
  const fromRemote = useRef(false); // le prochain changement de `lines` vient de Firestore : ne pas le renvoyer
  const linesRef = useRef(lines);

  useEffect(() => { linesRef.current = lines; }, [lines]);

  useEffect(() => {
    if (!uid) return undefined;
    const off = watchCart(uid, remote => {
      const first = !cartReady.current;
      cartReady.current = true;
      // Articles ajoutés avant l'arrivée du panier du compte (visiteur qui se connecte) : fusionnés une seule fois.
      if (first && linesRef.current.length) {
        const merged = (remote ?? []).slice();
        for (const line of linesRef.current) {
          const i = merged.findIndex(x => x.id === line.id);
          if (i >= 0) merged[i] = { ...merged[i], qty: Math.min(MAX_QTY, merged[i].qty + line.qty), selected: merged[i].selected || line.selected };
          else merged.push(line);
        }
        fromRemote.current = false; // le panier fusionné doit être sauvegardé
        setLines(merged);
      } else {
        fromRemote.current = true;
        setLines(remote ?? []);
      }
    });
    // À la déconnexion : on retrouve l'état visiteur (panier vide).
    return () => {
      cartReady.current = false;
      fromRemote.current = false;
      off();
      setLines([]);
    };
  }, [uid]);

  useEffect(() => {
    if (!uid || !cartReady.current) return undefined;
    if (fromRemote.current) { fromRemote.current = false; return undefined; }
    const t = setTimeout(() => { saveCart(uid, lines).catch(() => {}); }, 500);
    return () => clearTimeout(t);
  }, [lines, uid]);

  // Sauvegarde immédiate quand l'app passe en arrière-plan (évite de perdre les 500 ms de debounce).
  useEffect(() => {
    if (!uid) return undefined;
    const sub = AppState.addEventListener('change', s => {
      if (s !== 'active' && cartReady.current) saveCart(uid, linesRef.current).catch(() => {});
    });
    return () => sub.remove();
  }, [uid]);

  const patch = useCallback((ids: string[], fn: (l: Line) => Line) => setLines(ls => ls.map(l => (ids.includes(l.id) ? fn(l) : l))), []);
  const setQty = useCallback((id: string, v: number) => patch([id], l => ({ ...l, qty: Math.max(1, Math.min(v, MAX_QTY)) })), [patch]);
  const setSelected = useCallback((ids: string[], v: boolean) => patch(ids, l => ({ ...l, selected: v })), [patch]);
  const remove = useCallback((ids: string[]) => setLines(ls => ls.filter(l => !ids.includes(l.id))), []);

  /**
   * Ajoute des articles, cochés pour la commande. `buy` (achat immédiat) : seuls ces articles restent cochés,
   * avec exactement la quantité choisie ; sinon la quantité s'ajoute à celle déjà au panier.
   */
  const add = useCallback((news: NewLine[], buy = false) => setLines(ls => {
    const next = buy ? ls.map(l => ({ ...l, selected: false })) : ls.slice();
    for (const n of news) {
      const id = `${n.k}-${n.variant}`;
      const i = next.findIndex(l => l.id === id);
      const qty = Math.min(MAX_QTY, buy || i < 0 ? n.qty : next[i].qty + n.qty);
      if (i >= 0) next[i] = { ...next[i], qty, selected: true };
      else next.push({ id, k: n.k, variant: n.variant, qty, selected: true });
    }
    return next;
  }), []);

  const items = useMemo<CartItem[]>(() => lines.map(l => ({ ...l, p: byKey.get(l.k) })), [lines, byKey]);
  /** Commune de livraison : celle de l'adresse choisie, sinon la zone préférée. */
  const commune = isDeliverable(address) ? address.commune : zone;
  const itemCount = useMemo(() => lines.reduce((n, l) => n + l.qty, 0), [lines]);

  const totals = useMemo(() => {
    let subtotal = 0, retail = 0, count = 0, kin = 0, cn = 0;
    for (const it of items) {
      if (!it.selected || !it.p) continue;
      subtotal += unitPrice(it.p, selectedQty(items, it.k)) * it.qty;
      retail += currentPrice(it.p) * it.qty;
      count += it.qty;
      if (it.p.o === 'kin') kin += it.qty; else cn += it.qty;
    }
    return { subtotal, retail, savings: retail - subtotal, count, kin, cn };
  }, [items]);

  // Choix devenus impossibles (express ou paiement à la livraison avec un article de Chine) : on revient au défaut.
  const shipIndex = SHIPS[shipChoice]?.kinOnly && totals.cn > 0 ? 0 : shipChoice;
  const method: PayMethod = payMethod === CASH && totals.cn > 0 ? 'M-Pesa' : payMethod;
  const ship = shipPrice(shipIndex, commune, totals.subtotal) ?? 0;
  const payPhone = payPhoneInput ?? user?.phoneNumber ?? '';

  return useMemo(() => ({
    lines, items, totals: { ...totals, ship, total: totals.subtotal + ship }, itemCount, commune,
    payMethod: method, setPayMethod, payPhone, setPayPhone, shipIndex, setShipIndex,
    setQty, setSelected, remove, add,
  }), [lines, items, totals, ship, itemCount, commune, method, payPhone, shipIndex, setQty, setSelected, remove, add]);
}

const [CartProvider, useCart] = createStore('useCart', useCartState);
export { useCart };

/* ---------- Commandes ---------- */

/** Commande qui vient d'être passée, affichée par l'écran Confirmation. */
export interface LastOrder {
  refs: string[]; total: number; count: number; savings: number; items: CartItem[];
  address: Address; payMethod: PayMethod; payPhone: string;
}

function useOrdersState() {
  const { user } = useAuth();
  const { address } = useAddresses();
  const { items, totals, shipIndex, payMethod, payPhone, remove } = useCart();
  const uid = user?.uid ?? null;
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [lastOrder, setLastOrder] = useState<LastOrder | null>(null);
  const ordersReady = !uid || loadedFor === uid;

  useEffect(() => {
    if (!uid) return undefined;
    const off = watchOrders(uid, o => {
      setOrders(o);
      setLoadedFor(uid);
    });
    return () => {
      off();
      setOrders([]);
      setLoadedFor(null);
      setLastOrder(null);
    };
  }, [uid]);

  /**
   * Passe commande avec les articles cochés : une commande par provenance (Kinshasa / Chine).
   * Le module de commandes (server/) relit les prix produits et recalcule livraison et totaux.
   */
  const placeOrder = useCallback(async () => {
    const picked = items.filter(it => it.selected && it.p);
    if (!uid || !isDeliverable(address) || !picked.length) throw new Error('Commande incomplète.');
    const groups = (['kin', 'cn'] as const)
      .map(o => ({ kin: o === 'kin', rows: picked.filter(it => it.p?.o === o) }))
      .filter(g => g.rows.length > 0)
      .map(g => ({ kin: g.kin, lines: g.rows.map(it => ({ k: it.k, img: it.p?.b || it.k, qty: it.qty, variant: it.variant })) }));
    const mobile = payMethod !== CASH;
    const created = await createOrders({
      groups,
      commune: address.commune,
      shipIndex,
      payMethod,
      address: { name: address.name, phone: address.phone, line: address.line, landmark: address.landmark, commune: address.commune },
      phone: mobile ? payPhone.trim() : undefined,
    });
    setLastOrder({ ...created, savings: totals.savings, items: picked, address, payMethod, payPhone: mobile ? payPhone.trim() : '' });
    // La commande est créée : les articles commandés quittent le panier.
    remove(picked.map(it => it.id));
    return created.refs;
  }, [uid, items, address, shipIndex, payMethod, payPhone, totals.savings, remove]);

  return useMemo(() => ({ orders, ordersReady, lastOrder, placeOrder }), [orders, ordersReady, lastOrder, placeOrder]);
}

const [OrdersProvider, useOrders] = createStore('useOrders', useOrdersState);
export { useOrders };

/* ---------- Point d'entrée ---------- */

export function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CatalogProvider>
        <HistoryProvider>
          <AddressesProvider>
            <CartProvider>
              <OrdersProvider>{children}</OrdersProvider>
            </CartProvider>
          </AddressesProvider>
        </HistoryProvider>
      </CatalogProvider>
    </AuthProvider>
  );
}
