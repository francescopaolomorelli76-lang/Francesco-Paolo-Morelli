// Build: crea dist/JEEG_LIVELLO1.html (file unico autonomo, offline) + dist/index.html (copia per hosting web).
// Uso: node tools/build.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let html = readFileSync(join(root, 'index.html'), 'utf8');
const css = readFileSync(join(root, 'src/style.css'), 'utf8');
html = html.replace(/<!--STYLE-->[\s\S]*?<!--\/STYLE-->/, `<style>\n${css}</style>`);
const scripts = [...html.match(/<!--SCRIPTS-->([\s\S]*?)<!--\/SCRIPTS-->/)[1].matchAll(/src="([^"]+)"/g)].map((m) => m[1]);
const js = scripts.map((s) => `/* ---- ${s} ---- */\n` + readFileSync(join(root, s), 'utf8').replace(/<\/script/gi, '<\\/script')).join('\n');
html = html.replace(/<!--SCRIPTS-->[\s\S]*?<!--\/SCRIPTS-->/, () => `<script>\n${js}\n</script>`);
mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist/JEEG_LIVELLO1.html'), html);
writeFileSync(join(root, 'dist/index.html'), html);
console.log('OK dist/JEEG_LIVELLO1.html', (html.length / 1024).toFixed(1) + ' KB, script:', scripts.length);
