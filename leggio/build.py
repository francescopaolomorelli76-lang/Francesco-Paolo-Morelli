#!/usr/bin/env python3
"""Assembla Mozart in un unico file HTML.

  python3 leggio/build.py            -> leggio/index.html (web-app installabile)
  python3 leggio/build.py --artifact OUT.html  -> versione senza <!doctype> per l'anteprima
"""
import base64, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT / "src"
LOGO = ROOT / "logo160.jpg"

PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
PDFJS_WORKER = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"
PDFLIB = "https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js"
FONTS = ("https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,500;0,6..96,700;0,6..96,900;"
         "1,6..96,600&family=Manrope:wght@400;500;600;700;800&family=Noto+Music&display=swap")
JS_ORDER = ["store.js", "icons.js", "glyphs.js", "app.js", "anno.js", "insert.js", "audio.js", "forscore.js"]


def build(standalone: bool) -> str:
    logo = "data:image/jpeg;base64," + base64.b64encode(LOGO.read_bytes()).decode()
    css = (SRC / "style.css").read_text()
    body = (SRC / "body.html").read_text().replace("__LOGO__", logo)
    js = "\n".join((SRC / f).read_text() for f in JS_ORDER).replace("__LOGO__", logo)
    head = f"""<title>Mozart</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="{FONTS}">
<style>
{css}
</style>
"""
    scripts = f"""<script src="{PDFJS}"></script>
<script src="{PDFJS_WORKER}"></script>
<script src="{PDFLIB}"></script>
<script>
const PDFJS_WORKER = "{PDFJS_WORKER}";
{js}
boot();
</script>
"""
    if not standalone:
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
<link rel="icon" href="icon-512.png">
<style>[hidden]{{display:none!important}}:root{{padding-top:0}}body{{margin:0}}*{{box-sizing:border-box}}</style>
{head}</head>
<body>
{body}{scripts}</body>
</html>
"""


if __name__ == "__main__":
    if len(sys.argv) > 2 and sys.argv[1] == "--artifact":
        pathlib.Path(sys.argv[2]).write_text(build(False))
    else:
        (ROOT / "index.html").write_text(build(True))
    print("ok")
