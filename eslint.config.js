// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const globals = require('globals');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'android/*', 'ios/*', 'archive/*', 'server/node_modules/*'],
  },
  {
    // Scripts d'outillage et module de commandes : exécutés par Node (CommonJS), pas par l'app.
    files: ['scripts/**/*.cjs', 'server/**/*.js'],
    languageOptions: { globals: globals.node, sourceType: 'commonjs' },
  },
]);
