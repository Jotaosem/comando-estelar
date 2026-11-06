import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const SRC_DIR = join(process.cwd(), 'src');
const FORBIDDEN_CLASSES = [
  /\bcyan-[a-z0-9/]+/g,
  /\bteal-[a-z0-9/]+/g,
  /\bsky-[a-z0-9/]+/g,
  /\bviolet-[a-z0-9/]+/g,
  /\bpurple-[a-z0-9/]+/g,
  /\bindigo-[a-z0-9/]+/g,
  /\bblue-[a-z0-9/]+/g,
  /\bslate-[a-z0-9/]+/g,
  /\bzinc-[a-z0-9/]+/g,
  /\bgray-[a-z0-9/]+/g,
];

// Permitir excepciones si estuvieran en styles.css o archivos específicos
const ALLOWED_HEX = new Set([
  '#f5f5f3', '#231f20', '#ebe9e5', '#ffffff', '#dedbd5', '#e9e7e2',
  '#625d59', '#d9d0c0', '#6a5d56', '#e8e2da', '#a9533a', '#a14f33',
  '#5a6553', '#9c6b3c', '#4f6b78', '#7a5c6b', '#141312', '#a53f3f',
  '#ddd9d2', '#b7b0a9', '#d3cfc8', '#9a908b', '#37745a', '#e3eee8',
  '#8a5a16', '#f4ead4', '#f4e2df', '#6f6560', '#c1b9ae', '#2a2726',
  '#2f2b2a', '#e08c6c', '#2766a8', '#d79a84', '#b5afa7', '#8db0dc',
  '#1b1819', '#272324', '#2a2627', '#393435', '#332e2f', '#aaa19c',
  '#554d48', '#afa39c', '#40393a', '#6fbf98', '#1f3a2e', '#e3b25f',
  '#3d301c', '#ee8f88', '#452826', '#c96f50', '#4a8fd6', '#8a4f3b',
  '#5f5859', '#335c90'
].map(h => h.toLowerCase()));

let errors = 0;

function walk(dir) {
  const files = readdirSync(dir);
  for (const file of files) {
    const fullPath = join(dir, file);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '__tests__') {
        walk(fullPath);
      }
    } else if (/\.(tsx|ts|jsx|js|css)$/.test(file)) {
      if (file.includes('.test.') || file.includes('.spec.')) continue;
      const content = readFileSync(fullPath, 'utf8');

      // 1. Chequear clases Tailwind prohibidas
      for (const reg of FORBIDDEN_CLASSES) {
        const matches = content.match(reg);
        if (matches) {
          console.error(`[lint:colores] Clase no permitida en ${file}: ${matches.join(', ')}`);
          errors++;
        }
      }
    }
  }
}

console.log('Iniciando lint:colores en', SRC_DIR);
walk(SRC_DIR);

if (errors > 0) {
  console.error(`\n❌ lint:colores falló con ${errors} error(es).`);
  process.exit(1);
} else {
  console.log('✅ lint:colores pasó exitosamente: no hay clases cian/violeta/teal/sky/purple prohibidas.');
}

