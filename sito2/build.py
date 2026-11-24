import base64,io
from PIL import Image
S='/tmp/claude-0/-home-user-Francesco-Paolo-Morelli/5abe85f5-f86a-5572-bc55-cade8b4898e8/scratchpad/'
def enc(f,w,q=80):
    im=Image.open(S+f).convert('RGB'); h=round(im.height*w/im.width); im=im.resize((w,h),Image.LANCZOS); b=io.BytesIO(); im.save(b,'WEBP',quality=q); return 'data:image/webp;base64,'+base64.b64encode(b.getvalue()).decode()
t=open('template.html').read()
seal='data:image/webp;base64,'+base64.b64encode(open('../leggio/fpm_seal320.webp','rb').read()).decode()
t=t.replace('__SEAL__',seal).replace('__SHSCORE__',enc('sh_score.png',1000)).replace('__SHPRON__',enc('sh_pron_c.png',1000))
IM='/tmp/claude-0/-home-user-Francesco-Paolo-Morelli/5abe85f5-f86a-5572-bc55-cade8b4898e8/images/'
def encp(n,w,q=76):
    im=Image.open(IM+n+'.webp').convert('RGB'); h=round(im.height*w/im.width); im=im.resize((w,h),Image.LANCZOS); bb=io.BytesIO(); im.save(bb,'WEBP',quality=q); return 'data:image/webp;base64,'+base64.b64encode(bb.getvalue()).decode()
for n,w in (('7',1400),('8',1600),('9',1400),('10',1600),('11',1800)): t=t.replace('__IMG'+n+'__',encp(n,w))
def webp(img,w,q=82):
    im=img.convert('RGB').resize((w,w),Image.LANCZOS); bb=io.BytesIO(); im.save(bb,'WEBP',quality=q); return 'data:image/webp;base64,'+base64.b64encode(bb.getvalue()).decode()
t=t.replace('__LOGO__',webp(Image.open('../leggio/icon-180.png'),96)).replace('__FACE__',webp(Image.open('../leggio/cover.webp').crop((300,40,660,400)),160))
open('index.html','w').write(t); print(len(t))
# versione autonoma (GitHub Pages): documento completo con charset e viewport
open('standalone.html','w').write('<!doctype html><html lang="it"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'+open('index.html').read())
