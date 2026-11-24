import base64,io
from PIL import Image
S='/tmp/claude-0/-home-user-Francesco-Paolo-Morelli/5abe85f5-f86a-5572-bc55-cade8b4898e8/scratchpad/'
def enc(f,w,q=80):
    im=Image.open(S+f).convert('RGB'); h=round(im.height*w/im.width); im=im.resize((w,h),Image.LANCZOS); b=io.BytesIO(); im.save(b,'WEBP',quality=q); return 'data:image/webp;base64,'+base64.b64encode(b.getvalue()).decode()
t=open('template.html').read()
seal='data:image/webp;base64,'+base64.b64encode(open('../leggio/fpm_seal320.webp','rb').read()).decode()
t=t.replace('__SEAL__',seal).replace('__SHSCORE__',enc('sh_score.png',1000)).replace('__SHPRON__',enc('sh_pron_c.png',1000))
open('index.html','w').write(t); print(len(t))
