/**
 * Environnement de l'app, défini au build par EXPO_PUBLIC_APP_ENV (profils de eas.json).
 * Seul le profil `production` (version publiée) vaut 'production' ; sans valeur (Metro, build local) : 'development'.
 */
export const APP_ENV = process.env.EXPO_PUBLIC_APP_ENV ?? 'development';
export const IS_PRODUCTION = APP_ENV === 'production';

/**
 * Production : l'onglet Compte d'un visiteur affiche l'invitation « Créez votre compte ».
 * Ailleurs (développement, APK de test) : il affiche l'écran Compte en mode visiteur.
 */
export const ACCOUNT_GATE = IS_PRODUCTION;

/**
 * Hors production, un visiteur parcourt toute l'app (fiches, prix de gros, variantes, compte) sans être
 * renvoyé vers la connexion. Seul l'envoi d'une commande demande un compte, car le serveur l'exige.
 */
export const VISITOR_FREE = !IS_PRODUCTION;
