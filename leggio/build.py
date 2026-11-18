#!/usr/bin/env python3
"""Assembla Mozart.

  python3 leggio/build.py                       -> leggio/index.html (web-app installabile)
  python3 leggio/build.py --artifact OUT.html   -> versione per l'anteprima su claude.ai
  python3 leggio/build.py --ios DIR             -> contenuto dell'app iPad/iPhone (offline, librerie locali)
"""
import base64, pathlib, shutil, sys

ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT / "src"
VENDOR = ROOT / "vendor"
LOGO = ROOT / "logo160.jpg"
COVER = ROOT / "cover.jpg"

CDN = "https://cdnjs.cloudflare.com/ajax/libs/"
FONTS = ("https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,500;0,6..96,700;0,6..96,900;"
         "1,6..96,600&family=Manrope:wght@400;500;600;700;800&family=Noto+Music&display=swap")
JS_ORDER = ["store.js", "icons.js", "glyphs.js", "app.js", "anno.js", "insert.js", "audio.js", "forscore.js",
            "features.js", "singers.js", "lyrics.js", "pron.js", "uizoom.js", "textbox.js", "fix.js", "finger.js", "stable.js", "extras.js", "native.js"]


def build(mode: str) -> str:
    logo = "data:image/jpeg;base64," + base64.b64encode(LOGO.read_bytes()).decode()
    cover = "data:image/jpeg;base64," + base64.b64encode(COVER.read_bytes()).decode()
    css = (SRC / "style.css").read_text().replace("__COVER__", cover)
    body = (SRC / "body.html").read_text().replace("__LOGO__", logo).replace("__COVER__", cover)
    js = "\n".join((SRC / f).read_text() for f in JS_ORDER).replace("__LOGO__", logo).replace("__COVER__", cover)
    ios = mode == "ios"
    fonts = '<link rel="stylesheet" href="lib/fonts.css">' if ios else (
        '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
        f'<link rel="stylesheet" href="{FONTS}">')
    head = f"""<title>Mozart</title>
<meta name="claude:viewport-fit-sides" content="cover">
{fonts}
<style>
{css}
</style>
"""
    if ios:
        # nell'app il lettore PDF lavora in un thread separato: la pagina resta fluida
        libs = '<script src="lib/pdf.min.js"></script>\n<script src="lib/pdf-lib.min.js"></script>\n'
        consts = 'const PDFJS_WORKER = "lib/pdf.worker.min.js";\nconst SQLJS_URL = "lib/";\nconst PAKO_URL = "lib/pako.min.js";'
    else:
        libs = (f'<script src="{CDN}pdf.js/3.11.174/pdf.min.js"></script>\n'
                f'<script src="{CDN}pdf.js/3.11.174/pdf.worker.min.js"></script>\n'
                f'<script src="{CDN}pdf-lib/1.17.1/pdf-lib.min.js"></script>\n')
        consts = (f'const PDFJS_WORKER = "{CDN}pdf.js/3.11.174/pdf.worker.min.js";\n'
                  f'const SQLJS_URL = "{CDN}sql.js/1.8.0/";\n'
                  f'const PAKO_URL = "{CDN}pako/2.1.0/pako.min.js";')
    scripts = f"""{libs}<script>
{consts}
{js}
boot();
</script>
"""
    if mode == "artifact":
        return head + body + scripts
    return f"""<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">
<meta name="theme-color" content="#0b0a08">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Mozart">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="icon-180.png">
<link rel="apple-touch-startup-image" href="cover.jpg">
<link rel="icon" href="icon-512.png">
<style>[hidden]{{display:none!important}}:root{{padding-top:0}}body{{margin:0}}*{{box-sizing:border-box}}</style>
{head}</head>
<body>
{body}{scripts}</body>
</html>
"""


if __name__ == "__main__":
    if len(sys.argv) > 2 and sys.argv[1] == "--artifact":
        pathlib.Path(sys.argv[2]).write_text(build("artifact"))
    elif len(sys.argv) > 2 and sys.argv[1] == "--ios":
        out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
        (out / "index.html").write_text(build("ios"))
        lib = out / "lib"
        if lib.exists():
            shutil.rmtree(lib)
        shutil.copytree(VENDOR, lib)
    else:
        (ROOT / "index.html").write_text(build("web"))
    print("ok")
