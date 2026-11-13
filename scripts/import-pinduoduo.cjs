#!/usr/bin/env node
/**
 * Remplace le catalogue Firestore (collection products) par les produits collectés sur Pinduoduo.
 *   Source : archive/pinduoduo/products.json  ([{ id, data }], généré par archive/pinduoduo/tools/build.py)
 *   Photos : archive/pinduoduo/public/p/<id>.jpg, servies par Firebase Hosting (https://sokoni-5c824.web.app/p/<id>.jpg) :
 *            les déployer avec `npx firebase-tools deploy --only hosting` depuis archive/pinduoduo.
 *
 * Les produits absents du fichier sont supprimés. Sauvegardez d'abord la collection si besoin.
 * Utilise la session de la CLI Firebase (`npx firebase-tools login`). `--dry-run` n'écrit rien.
 */
const fs = require('fs');
const path = require('path');
const { PROJECT, DOCS, accessToken, api, fields } = require('./firebase-cli.cjs');

const DRY = process.argv.includes('--dry-run');
const SRC = path.join(__dirname, '..', 'archive', 'pinduoduo', 'products.json');

async function main() {
  const items = JSON.parse(fs.readFileSync(SRC, 'utf8'));
  const keep = new Set(items.map(p => p.id));
  const token = DRY ? null : await accessToken();

  const existing = [];
  if (!DRY) {
    let page = '';
    do {
      const j = await api(token, 'GET', `${DOCS}/products?pageSize=300&mask.fieldPaths=name${page ? '&pageToken=' + page : ''}`);
      existing.push(...(j.documents || []).map(d => d.name.split('/').pop()));
      page = j.nextPageToken || '';
    } while (page);
  }
  const removed = existing.filter(id => !keep.has(id));
  const writes = [
    ...removed.map(id => ({ delete: `${DOCS}/products/${id}` })),
    ...items.map(p => ({ update: { name: `${DOCS}/products/${p.id}`, fields: fields(p.data) } })),
  ];
  console.log(`${DRY ? '[dry-run] ' : ''}produits à écrire ${items.length} · à supprimer ${removed.length} · écritures ${writes.length}`);
  if (DRY) return;
  for (let i = 0; i < writes.length; i += 400) {
    await api(token, 'POST', `projects/${PROJECT}/databases/(default)/documents:commit`, { writes: writes.slice(i, i + 400) });
  }
  console.log('écrit.');
}

main().catch(e => { console.error(e.message); process.exit(1); });
