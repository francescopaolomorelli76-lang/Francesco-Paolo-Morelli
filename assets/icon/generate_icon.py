import math, random
def burst(cx,cy,r,inner,n,seed):
    rnd=random.Random(seed); pts=[]
    for i in range(n*2):
        a=-math.pi/2+i*math.pi/n
        k=(1-rnd.random()*0.12) if i%2==0 else inner+rnd.random()*0.07
        pts.append(f"{cx+math.cos(a)*r*k:.1f},{cy+math.sin(a)*r*k:.1f}")
    return " ".join(pts)
def speed(cx,cy,R,n,seed):
    rnd=random.Random(seed); out=[]
    for i in range(n):
        a=i/n*2*math.pi+rnd.random()*0.05; w=0.008+rnd.random()*0.014; ir=R*(0.42+rnd.random()*0.1)
        p=[(cx+math.cos(a)*ir,cy+math.sin(a)*ir),(cx+math.cos(a-w)*R*1.5,cy+math.sin(a-w)*R*1.5),(cx+math.cos(a+w)*R*1.5,cy+math.sin(a+w)*R*1.5)]
        out.append('<polygon points="%s" fill="#111" opacity=".85"/>'%" ".join(f"{x:.1f},{y:.1f}" for x,y in p))
    return "\n".join(out)
def dots():
    out=[]
    for y in range(0,1024,22):
        for x in range((y//22%2)*11,1024,22):
            d=math.hypot(x-512,y-512)/724
            if d>0.62: out.append(f'<circle cx="{x}" cy="{y}" r="{(d-0.6)*22:.1f}" fill="#E63946"/>')
    return "\n".join(out)
def art(bg):
    b=burst(512,512,430,0.74,16,5)
    bubble='''
  <g transform="translate(512 500)">
    <path d="M-250,-150 Q-250,-200 -200,-200 L200,-200 Q250,-200 250,-150 L250,110 Q250,160 200,160 L-20,160 L-120,250 L-90,160 L-200,160 Q-250,160 -250,110 Z" fill="#111" transform="translate(14 14)"/>
    <path d="M-250,-150 Q-250,-200 -200,-200 L200,-200 Q250,-200 250,-150 L250,110 Q250,160 200,160 L-20,160 L-120,250 L-90,160 L-200,160 Q-250,160 -250,110 Z" fill="#fff" stroke="#111" stroke-width="18" stroke-linejoin="round"/>
    <text x="-145" y="92" font-family="Bangers" font-size="270" text-anchor="middle" fill="#E63946" stroke="#111" stroke-width="10" paint-order="stroke">A</text>
    <text x="140" y="62" font-family="WenQuanYi Zen Hei" font-weight="bold" font-size="165" text-anchor="middle" fill="#111" stroke="#111" stroke-width="9" stroke-linejoin="round">文</text>
    <path d="M-40,-60 L40,-60 L40,-85 L85,-40 L40,5 L40,-20 L-40,-20 Z" fill="#00B4D8" stroke="#111" stroke-width="9" stroke-linejoin="round" transform="translate(0 -22) scale(.62)"/>
    <path d="M40,40 L-40,40 L-40,15 L-85,60 L-40,105 L-40,80 L40,80 Z" fill="#FFD60A" stroke="#111" stroke-width="9" stroke-linejoin="round" transform="translate(0 8) scale(.62)"/>
  </g>'''
    bgpart = f'<rect width="1024" height="1024" fill="#FFD60A"/>{dots()}<clipPath id="c"><rect width="1024" height="1024"/></clipPath><g clip-path="url(#c)">{speed(512,512,560,64,9)}</g>' if bg else ''
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
{bgpart}
<g {'' if bg else 'transform="translate(512 512) scale(.62) translate(-512 -512)"'}>
<polygon points="{b}" fill="#111" transform="translate(16 16)"/>
<polygon points="{b}" fill="#E63946" stroke="#111" stroke-width="16" stroke-linejoin="miter"/>
{bubble}
</g></svg>'''
for name,bg in (("icon",True),("icon_foreground",False)):
    open(name+".html","w").write(f'''<html><head><style>@font-face{{font-family:Bangers;src:url(Bangers-Regular.ttf)}}html,body{{margin:0;background:transparent}}</style></head><body>{art(bg)}</body></html>''')
