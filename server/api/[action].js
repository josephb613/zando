/**
 * Point d'entrée Vercel : /api/createOrders, /api/updateOrderPayment, /api/updateOrderStatus, /api/nyoleWebhook, /api/health.
 * La variable NODEJS_HELPERS=0 du projet laisse le corps non décodé : la signature du webhook nyole
 * se calcule sur le texte exact reçu (voir handler.js).
 */
const { createHandler } = require('../src/handler');

module.exports = createHandler();
