/** Point d'entrée Vercel : /api/createOrders, /api/updateOrderPayment, /api/updateOrderStatus, /api/health. */
const { createHandler } = require('../src/handler');

module.exports = createHandler();
