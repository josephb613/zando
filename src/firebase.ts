/**
 * Accès Firebase (React Native Firebase, API modulaire).
 * Auth : connexion par numéro de téléphone + code SMS.
 * Firestore :
 *   products/{k}                 catalogue (lecture publique)
 *   users/{uid}                  profil (téléphone, commune)
 *   users/{uid}/cart/current     panier
 *   users/{uid}/addresses/{id}   adresses de livraison
 *   orders/{id}                  commandes (lecture seule pour l'app ; écrites par le module server/)
 *   lots/{id}                    lots groupés (lecture publique ; écrits par le module server/)
 *   lots/{id}/members/{uid}      réservation d'un membre (lisible par lui seul)
 * La configuration du projet vient de google-services.json / GoogleService-Info.plist (voir app.json).
 */
import { getAuth, onAuthStateChanged, signInWithPhoneNumber, signOut as fbSignOut } from '@react-native-firebase/auth';
import {
  getFirestore, doc, getDoc, setDoc, deleteDoc, collection, collectionGroup, query, where, orderBy, onSnapshot, serverTimestamp,
  writeBatch, getDocs,
} from '@react-native-firebase/firestore';
import type { Query, QueryDocumentSnapshot } from '@react-native-firebase/firestore';
import type { CatItem } from './catalog';
import { basePrice, normalizeTiers } from './shared/pricing';
import { isOrderStatus, isPayMethod, OrderStatus, PayMethod } from './shared/orders';

export type { OrderStatus, PayMethod };

export type User = import('@react-native-firebase/auth').User;
export type Confirmation = Awaited<ReturnType<typeof signInWithPhoneNumber>>;

const auth = () => getAuth();
const db = () => getFirestore();

/**
 * Adresse du module de commandes (dossier server/), définie au build :
 * EXPO_PUBLIC_ORDERS_API_URL dans .env (dev) ou dans eas.json (APK).
 */
const ORDERS_API = (process.env.EXPO_PUBLIC_ORDERS_API_URL ?? '').replace(/\/+$/, '');

/** Erreur du module de commandes : `code` reprend les codes Firebase (invalid-argument, failed-precondition…). */
export class OrdersError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

/** Appelle une action du module de commandes avec le jeton de connexion de l'utilisateur. */
async function callOrders<T>(action: string, payload: object): Promise<T> {
  if (!ORDERS_API) throw new OrdersError('unavailable', 'Adresse du serveur de commandes non configurée.');
  const user = auth().currentUser;
  if (!user) throw new OrdersError('unauthenticated', 'Connexion requise.');
  const token = await user.getIdToken();
  let res: Response;
  try {
    res = await fetch(`${ORDERS_API}/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new OrdersError('unavailable', 'Serveur de commandes injoignable.');
  }
  const body = await res.json().catch(() => null) as { data?: T; error?: { code: string; message: string } } | null;
  if (!res.ok || !body || body.error) {
    throw new OrdersError(body?.error?.code ?? 'internal', body?.error?.message ?? 'Erreur serveur, réessayez.');
  }
  return body.data as T;
}

/**
 * Écoute une requête Firestore et convertit ses documents. Si la lecture échoue avant le premier résultat,
 * renvoie une liste vide pour que l'écran ne reste pas bloqué sur son squelette.
 */
function watchList<T>(q: Query, tag: string, toItems: (docs: QueryDocumentSnapshot[]) => T[], cb: (items: T[]) => void) {
  let got = false;
  return onSnapshot(q, s => {
    got = true;
    cb(toItems(s.docs));
  }, e => {
    if (__DEV__) console.warn(`[${tag}]`, e.message);
    if (!got) cb([]);
  });
}

/* ---------- Authentification ---------- */

/**
 * Suit la session. Sur le web, React Native Firebase n'a pas d'app initialisée (pas de google-services.json) :
 * au lieu de planter au démarrage, on continue en visiteur sans compte.
 */
export function watchUser(cb: (u: User | null) => void): () => void {
  try {
    return onAuthStateChanged(auth(), cb);
  } catch (e) {
    if (__DEV__) console.warn('[auth] Firebase indisponible, mode visiteur :', (e as Error)?.message);
    cb(null);
    return () => {};
  }
}

/** Envoie le code SMS. `e164` = numéro complet, ex. « +243970000000 ». */
export const sendCode = (e164: string) => signInWithPhoneNumber(auth(), e164);

/**
 * Valide le code à 6 chiffres et crée le profil s'il n'existe pas encore.
 * `hasCommune` : le compte a déjà choisi sa zone de livraison (reconnexion), l'étape Commune peut être sautée.
 */
export async function confirmCode(confirmation: Confirmation, code: string) {
  const cred = await confirmation.confirm(code);
  const user = cred?.user;
  if (!user) throw new Error('auth/no-user');
  const ref = doc(db(), 'users', user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) await setDoc(ref, { phone: user.phoneNumber, createdAt: serverTimestamp() });
  const commune = snap.exists() ? (snap.data() as Partial<Profile>).commune : undefined;
  return { user, hasCommune: !!commune };
}

export const signOut = () => fbSignOut(auth());

/** Message lisible pour les erreurs Firebase Auth les plus courantes. */
export function authMessage(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  if (__DEV__) console.warn('[auth]', code, (e as Error)?.message);
  if (code.includes('invalid-phone-number')) return 'Numéro invalide.';
  if (code.includes('operation-not-allowed') || /region enabled/i.test((e as Error)?.message ?? '')) return 'SMS indisponible pour ce pays.';
  if (code.includes('invalid-verification-code')) return 'Code incorrect.';
  if (code.includes('session-expired') || code.includes('code-expired')) return 'Code expiré, demandez-en un nouveau.';
  if (code.includes('too-many-requests')) return 'Trop de tentatives, réessayez plus tard.';
  if (code.includes('network-request-failed')) return 'Pas de connexion internet.';
  return 'Échec, réessayez.';
}

/* ---------- Profil ---------- */

export interface Profile { phone: string | null; commune?: string }

export const saveProfile = (uid: string, data: Partial<Profile>) =>
  setDoc(doc(db(), 'users', uid), { ...data, updatedAt: serverTimestamp() }, { merge: true });

export async function loadProfile(uid: string): Promise<Profile | null> {
  const snap = await getDoc(doc(db(), 'users', uid));
  return snap.exists() ? (snap.data() as Profile) : null;
}

/* ---------- Produits ---------- */

/** Document Firestore -> forme `CatItem` utilisée par les écrans (les paliers y sont des objets : Firestore refuse les tableaux imbriqués). */
function toCatItem(id: string, d: Record<string, any>): CatItem {
  const f = d.flash;
  return {
    k: id, b: d.photo ?? '', o: d.origin === 'kin' ? 'kin' : 'cn', c: d.category, n: d.name, p: d.price,
    // Le premier palier est toujours le prix courant : promo active -> prix flash, sinon prix catalogue.
    t: normalizeTiers(d.tiers, basePrice(d)),
    m: d.moq, s: d.sold ?? '', h: d.tag ?? '', kd: d.family,
    pr: f ? [f.price, f.was, f.label, f.active ? 1 : 0] : undefined,
    order: d.order,
  };
}

/**
 * Catalogue en direct ; les produits désactivés (`active: false`) sont masqués.
 * Le tri est fait côté client pour ne pas exclure les produits qui n'ont pas encore de champ `order`.
 */
export function watchProducts(cb: (items: CatItem[]) => void) {
  // En cas d'erreur, la liste vide garde le catalogue local en secours et débloque l'UI.
  return watchList(query(collection(db(), 'products')), 'products', docs => docs
    .filter(d => d.data().active !== false)
    .map(d => toCatItem(d.id, d.data()))
    .sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999)), cb);
}

/* ---------- Panier ---------- */

/** Ligne du panier enregistrée : l'article (nom, photo, prix) est relu dans le catalogue à l'affichage. */
export interface Line { id: string; k: string; variant: string; qty: number; selected: boolean }

const cartRef = (uid: string) => doc(db(), 'users', uid, 'cart', 'current');

const toLine = (raw: Record<string, unknown>): Line | null => {
  const k = typeof raw.k === 'string' ? raw.k : '';
  const qty = Math.floor(Number(raw.qty));
  if (!k || !Number.isFinite(qty) || qty < 1) return null;
  const variant = typeof raw.variant === 'string' && raw.variant ? raw.variant : 'Standard';
  return { id: typeof raw.id === 'string' && raw.id ? raw.id : `${k}-${variant}`, k, variant, qty, selected: raw.selected === true };
};

/** `lines` = null si l'utilisateur n'a pas encore de panier. Les écritures locales en attente sont ignorées (évite l'écho). */
export function watchCart(uid: string, cb: (lines: Line[] | null) => void) {
  return onSnapshot(cartRef(uid), s => {
    if (s.metadata.hasPendingWrites) return;
    const raw = s.exists() ? (s.data() as { lines?: Record<string, unknown>[] }).lines ?? [] : null;
    cb(raw && raw.map(toLine).filter((l): l is Line => l !== null));
  }, e => { if (__DEV__) console.warn('[cart]', e.message); });
}

export const saveCart = (uid: string, lines: Line[]) => setDoc(cartRef(uid), {
  lines: lines.map(({ id, k, variant, qty, selected }) => ({ id, k, variant, qty, selected })),
  updatedAt: serverTimestamp(),
});

/* ---------- Adresses ---------- */

export interface Address {
  id: string; tag: string; name: string; phone: string;
  /** Avenue, numéro et quartier ; la commune est dans `commune`. */
  line: string; commune: string; landmark: string; isDefault: boolean; order: number;
}

export function watchAddresses(uid: string, cb: (a: Address[]) => void) {
  const q = query(collection(db(), 'users', uid, 'addresses'), orderBy('order'));
  return watchList(q, 'addresses', docs => docs.map(d => {
    const x = d.data();
    return {
      id: d.id, tag: x.tag ?? '', name: x.name ?? '', phone: x.phone ?? '', line: x.line ?? '',
      commune: x.commune ?? '', landmark: x.landmark ?? '', isDefault: x.isDefault === true, order: Number(x.order) || 0,
    };
  }), cb);
}

/** Crée ou met à jour une adresse ; une seule adresse peut être « par défaut ». */
export async function saveAddress(uid: string, a: Omit<Address, 'id'> & { id?: string }) {
  const col = collection(db(), 'users', uid, 'addresses');
  const ref = a.id ? doc(col, a.id) : doc(col);
  const data: Omit<Address, 'id'> = {
    tag: a.tag, name: a.name, phone: a.phone, line: a.line, commune: a.commune, landmark: a.landmark,
    isDefault: a.isDefault, order: a.order,
  };
  if (data.isDefault) {
    const snap = await getDocs(col);
    const batch = writeBatch(db());
    snap.docs.forEach(d => {
      if (d.id !== ref.id && d.data().isDefault) batch.update(d.ref, { isDefault: false });
    });
    batch.set(ref, data);
    await batch.commit();
  } else {
    await setDoc(ref, data);
  }
  return ref.id;
}

export const deleteAddress = (uid: string, id: string) => deleteDoc(doc(db(), 'users', uid, 'addresses', id));

/* ---------- Commandes ---------- */

export interface OrderAddress {
  name: string;
  phone: string;
  line: string;
  landmark: string;
  commune: string;
}

export interface OrderLine { img: string; qty: number; name?: string; variant?: string; unit?: number }

export interface Order {
  id: string;
  ref: string;
  kin: boolean;
  status: OrderStatus;
  count: number;
  total: number;
  ship: number;
  shipIndex?: number;
  lines: OrderLine[];
  commune: string;
  payMethod: string;
  payPhone?: string;
  address?: OrderAddress;
  /** Lot groupé à l'origine de la commande, le cas échéant. */
  lot?: string;
  createdAt: Date | null;
}

export interface NewOrderGroup {
  kin: boolean;
  lines: { k: string; img: string; qty: number; variant: string }[];
}

export interface CreatedOrders {
  refs: string[];
  total: number;
  count: number;
  /** Page de paiement Mobile Money (nyole) ; absente pour le paiement à la livraison ou si le service est indisponible. */
  payUrl?: string;
}

/**
 * Crée les commandes via le module de commandes (server/).
 * Le serveur relit les prix produits, recalcule livraison et totaux, et écrit les documents
 * avec l'Admin SDK. Les règles Firestore interdisent toute création directe côté client.
 */
export function createOrders(order: {
  groups: NewOrderGroup[]; commune: string; shipIndex: number; payMethod: PayMethod; address: OrderAddress; phone?: string;
}): Promise<CreatedOrders> {
  return callOrders<CreatedOrders>('createOrders', order);
}

export function watchOrders(uid: string, cb: (orders: Order[]) => void) {
  const q = query(collection(db(), 'orders'), where('uid', '==', uid), orderBy('createdAt', 'desc'));
  return watchList(q, 'orders', docs => docs.flatMap(d => {
    const x = d.data();
    if (!isOrderStatus(x.status)) return [];
    return [{
      id: d.id, ref: x.ref ?? d.id, kin: x.kin === true, status: x.status,
      count: Number(x.count) || 0, total: Number(x.total) || 0, ship: Number(x.ship) || 0,
      shipIndex: typeof x.shipIndex === 'number' ? x.shipIndex : undefined,
      lines: Array.isArray(x.lines) ? x.lines : [], commune: x.commune ?? '', payMethod: x.payMethod ?? '',
      payPhone: x.payPhone, address: x.address, lot: typeof x.lot === 'string' ? x.lot : undefined, createdAt: x.createdAt ? x.createdAt.toDate() : null,
    }];
  }), cb);
}

/**
 * Lance le paiement Mobile Money d'une commande encore en attente (commande d'un lot groupé, ou paiement
 * abandonné) ; renvoie l'adresse de la page de paiement, absente si le service de paiement est indisponible.
 */
export async function payOrder(order: Pick<Order, 'ref' | 'payMethod' | 'payPhone'>): Promise<string | undefined> {
  const payMethod: PayMethod = isPayMethod(order.payMethod) ? order.payMethod : 'M-Pesa';
  const res = await callOrders<{ payUrl?: string }>('updateOrderPayment', { refs: [order.ref], payMethod, phone: order.payPhone });
  return res.payUrl;
}

/* ---------- Lots groupés ---------- */

/** Lot ouvert : `taken` pièces réservées sur `target`, au prix unitaire `unit`, jusqu'à `expiresAt`. */
export interface Lot { id: string; productId: string; target: number; unit: number; taken: number; members: number; expiresAt: number }

/** Lots en cours de remplissage (lecture publique) ; l'échéance est vérifiée à l'affichage. */
export function watchOpenLots(cb: (lots: Lot[]) => void) {
  const q = query(collection(db(), 'lots'), where('status', '==', 'open'));
  return watchList(q, 'lots', docs => docs.map(d => {
    const x = d.data();
    return {
      id: d.id, productId: String(x.productId ?? ''), target: Number(x.target) || 0, unit: Number(x.unit) || 0,
      taken: Number(x.taken) || 0, members: Number(x.members) || 0, expiresAt: x.expiresAt ? x.expiresAt.toMillis() : 0,
    };
  }), cb);
}

/** Réservations du compte : identifiant du lot -> pièces réservées. */
export function watchMyLots(uid: string, cb: (mine: Record<string, number>) => void) {
  const q = query(collectionGroup(db(), 'members'), where('uid', '==', uid));
  return watchList(q, 'members', docs => docs.flatMap(d => {
    const lotId = d.ref.parent.parent?.id;
    return lotId ? [[lotId, Number(d.data().qty) || 0] as [string, number]] : [];
  }), rows => cb(Object.fromEntries(rows)));
}

export interface JoinedLot { lotId: string; target: number; taken: number; unit: number; status: 'open' | 'full'; expiresAt: number; ref?: string }

/** Réserve des pièces dans le lot ouvert de l'article, ou en ouvre un ; `ref` : commande créée si le lot est complet. */
export function joinLot(input: { productId: string; lines: { variant: string; qty: number }[]; address: OrderAddress; phone?: string }) {
  return callOrders<JoinedLot>('joinLot', input);
}

export const leaveLot = (lotId: string) => callOrders<{ ok: true }>('leaveLot', { lotId });
