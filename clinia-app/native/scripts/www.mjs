// Copia l'app web (index.html, immagini, video) nella cartella www che finisce dentro l'app iPhone.
import { cpSync, rmSync, mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const qui = dirname(fileURLToPath(import.meta.url)), app = join(qui, "..", ".."), www = join(qui, "..", "www");
rmSync(www, { recursive: true, force: true });
mkdirSync(www, { recursive: true });
for (const f of ["index.html", "manifest.webmanifest", "img", "video"]) {
  if (existsSync(join(app, f))) cpSync(join(app, f), join(www, f), { recursive: true });
}
// index.html dell'app web è un frammento (lo completa la pagina che lo ospita): qui diventa un documento intero
const html = readFileSync(join(app, "index.html"), "utf8");
writeFileSync(join(www, "index.html"), `<!doctype html><html lang="it"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="format-detection" content="telephone=no"></head><body>
${html}
</body></html>`);
console.log("www pronta:", www);
