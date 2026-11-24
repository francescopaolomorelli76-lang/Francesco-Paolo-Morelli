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
open('index.html','w').write(t); print(len(t))
