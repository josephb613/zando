/**
 * Serveur Node autonome (local, Render, Railway, VPS…).
 *   PORT=8080 node index.js
 */
const http = require('http');
const { createHandler } = require('./src/handler');

const port = Number(process.env.PORT) || 8080;
http.createServer(createHandler()).listen(port, () => {
  console.log(`Module commandes Sokoni à l'écoute sur le port ${port}`);
});
