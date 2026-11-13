/**
 * Génère server/src/shared/*.js depuis src/shared/*.ts (source unique des règles métier).
 * Le module server/ est déployé seul, sans le code de l'app : il reçoit donc une copie compilée.
 *
 *   node scripts/sync-shared.cjs           écrit les copies
 *   node scripts/sync-shared.cjs --check   échoue si une copie n'est plus à jour
 */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const root = path.join(__dirname, '..');
const srcDir = path.join(root, 'src', 'shared');
const outDir = path.join(root, 'server', 'src', 'shared');
const check = process.argv.includes('--check');

const sources = fs.readdirSync(srcDir).filter(f => f.endsWith('.ts')).sort();
const expected = new Set();
let stale = 0;

if (!check) fs.mkdirSync(outDir, { recursive: true });

for (const file of sources) {
  const name = file.replace(/\.ts$/, '.js');
  expected.add(name);
  const input = fs.readFileSync(path.join(srcDir, file), 'utf8');
  const { outputText } = ts.transpileModule(input, {
    fileName: file,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: false },
  });
  const output = `// Généré depuis src/shared/${file} par scripts/sync-shared.cjs : ne pas modifier à la main.\n${outputText}`;
  const target = path.join(outDir, name);
  const current = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : null;
  if (current === output) continue;
  if (check) {
    console.error(`server/src/shared/${name} n'est pas à jour.`);
    stale++;
  } else {
    fs.writeFileSync(target, output);
    console.log(`server/src/shared/${name} écrit.`);
  }
}

if (fs.existsSync(outDir)) {
  for (const f of fs.readdirSync(outDir)) {
    if (expected.has(f)) continue;
    if (check) {
      console.error(`server/src/shared/${f} n'a plus de source dans src/shared/.`);
      stale++;
    } else {
      fs.unlinkSync(path.join(outDir, f));
      console.log(`server/src/shared/${f} supprimé.`);
    }
  }
}

if (check && stale) {
  console.error('Lancer : npm run shared:sync');
  process.exit(1);
}
