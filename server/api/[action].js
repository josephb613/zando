/** Point d'entrée Vercel : /api/createOrders, /api/updateOrderPayment, /api/updateOrderStatus, /api/nyoleWebhook, /api/health. */
const { createHandler } = require('../src/handler');

module.exports = createHandler();

// Corps non décodé : la signature du webhook nyole se calcule sur le texte exact reçu.
module.exports.config = { api: { bodyParser: false } };
