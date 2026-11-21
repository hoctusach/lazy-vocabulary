import numpy as np, os
from PIL import Image, ImageDraw, ImageFont, ImageFilter
R='/workspace/lazy-vocabulary/android/app/src/main/res'
PUB='/workspace/lazy-vocabulary/public'
src=np.asarray(Image.open('/workspace/logo/logo-a-simplified.jpg').convert('RGB')).astype(float)
H,W,_=src.shape
def feat(x,y): return np.stack([np.ones_like(x),x,y,x*x,y*y,x*y,x**3,y**3,x*x*y,x*y*y],-1)
yy,xx=np.mgrid[0:H,0:W]
m=np.zeros((H,W),bool); b=70; m[:b]=m[-b:]=True; m[:,:b]=m[:,-b:]=True
m|=((xx-470)**2/430**2+(yy-500)**2/370**2)>1.25
m&=~((xx>780)&(xx<990)&(yy>330)&(yy<740))
F=feat(xx/W,yy/H)
COEF=[np.linalg.lstsq(F[m],src[...,c][m],rcond=None)[0] for c in range(3)]
def gradient(w,h):
    y,x=np.mgrid[0:h,0:w]; f=feat((x+.5)/w,(y+.5)/h)
    return Image.fromarray(np.clip(np.stack([f@c for c in COEF],-1),0,255).astype(np.uint8),'RGB')
mid=np.array(gradient(64,64)).reshape(-1,3).mean(0).round().astype(int); MID='#%02X%02X%02X'%tuple(mid); print('mid colour',MID)
fg=Image.open('fg_full.png')  # RGBA cut-out, 1024
a=np.asarray(fg)[...,3]; ys,xs=np.where(a>20)
cx,cy=(xs.min()+xs.max())/2,(ys.min()+ys.max())/2
rmax=np.sqrt((xs-cx)**2+(ys-cy)**2).max(); print('centre',cx,cy,'rmax',rmax)
def place(size, radius_frac):
    """fg recentred on canvas size, farthest opaque pixel at radius_frac*size"""
    s=radius_frac*size/rmax
    big=fg.resize((round(W*s),round(H*s)),Image.LANCZOS)
    c=Image.new('RGBA',(size,size),(0,0,0,0))
    c.alpha_composite(big,(round(size/2-cx*s),round(size/2-cy*s))) if False else c.paste(big,(round(size/2-cx*s),round(size/2-cy*s)),big)
    return c
def master(size, radius_frac):
    g=gradient(size,size).convert('RGBA'); g.alpha_composite(place(size,radius_frac)); return g
def mask(size, kind):
    ss=4; M=Image.new('L',(size*ss,size*ss),0); d=ImageDraw.Draw(M)
    if kind=='circle': d.ellipse([0,0,size*ss-1,size*ss-1],fill=255)
    elif kind=='rounded': d.rounded_rectangle([0,0,size*ss-1,size*ss-1],radius=int(size*ss*0.18),fill=255)
    else:  # squircle superellipse n=4
        n=4; t=np.linspace(0,2*np.pi,2000); r=size*ss/2
        pts=[(r+r*np.sign(np.cos(a))*abs(np.cos(a))**(2/n), r+r*np.sign(np.sin(a))*abs(np.sin(a))**(2/n)) for a in t]
        d.polygon(pts,fill=255)
    return M.resize((size,size),Image.LANCZOS)
def masked(img,kind):
    o=img.copy(); o.putalpha(Image.fromarray(np.minimum(np.asarray(img.split()[3]),np.asarray(mask(img.size[0],kind))))); return o
M1024=master(1024,0.43)
# --- Android legacy + adaptive
dens={'mdpi':1,'hdpi':1.5,'xhdpi':2,'xxhdpi':3,'xxxhdpi':4}
SAFE=33/108  # safe-zone radius (66dp diameter) of 108dp canvas
for d,k in dens.items():
    L=round(48*k); A=round(108*k); p=f'{R}/mipmap-{d}'
    leg=M1024.resize((L,L),Image.LANCZOS)
    masked(leg,'rounded').save(f'{p}/ic_launcher.png')
    masked(leg,'circle').save(f'{p}/ic_launcher_round.png')
    place(A,SAFE*0.97).save(f'{p}/ic_launcher_foreground.png')
    gradient(A,A).save(f'{p}/ic_launcher_background.png')
open(f'{R}/mipmap-anydpi-v26/ic_launcher.xml','w').write('''<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
    <monochrome android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>''')
open(f'{R}/mipmap-anydpi-v26/ic_launcher_round.xml','w').write(open(f'{R}/mipmap-anydpi-v26/ic_launcher.xml').read())
open(f'{R}/values/ic_launcher_background.xml','w').write(f'''<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">{MID}</color>
</resources>''')
# --- splash screens (gradient + sloth at ~28% of short side)
import glob
for f in glob.glob(f'{R}/drawable*/splash.png'):
    w,h=Image.open(f).size; g=gradient(w,h).convert('RGBA'); s=min(w,h)
    p=place(s,0.30*0.5*1.0*1.9/1.9*0.95)  # radius 28.5% of short side
    g.alpha_composite(p,((w-s)//2,(h-s)//2)); g.convert('RGB').save(f)
# --- Play icon 512 (32-bit PNG, full square; Play applies its own mask)
os.makedirs('/workspace/logo',exist_ok=True)
master(512,0.43).save('/workspace/logo/play-icon-512.png')
# --- web
os.makedirs(f'{PUB}/icons',exist_ok=True)
master(192,0.43).save(f'{PUB}/icons/icon-192.png'); master(512,0.43).save(f'{PUB}/icons/icon-512.png')
master(512,0.36).save(f'{PUB}/icons/icon-maskable-512.png')
master(180,0.41).convert('RGB').save(f'{PUB}/icons/apple-touch-icon.png')
fav=masked(master(256,0.47),'rounded'); fav.save(f'{PUB}/favicon.ico',sizes=[(16,16),(32,32),(48,48),(64,64)])
fav.resize((32,32),Image.LANCZOS).save(f'{PUB}/icons/favicon-32.png')
# --- feature graphic 1024x500
fgw=gradient(1024,500).convert('RGBA')
sl=place(420,0.47); fgw.alpha_composite(sl,(20,40))
d=ImageDraw.Draw(fgw)
def font(path,sz,w=None):
    f=ImageFont.truetype(path,sz)
    if w:
        try: f.set_variation_by_axes([w] if 'Nunito' in path else [100,w])
        except Exception as e: print('var',e)
    return f
NUN='/usr/share/fonts/truetype/sand-box/google/Nunito/Nunito-VariableFont_wght.ttf'
x=450
sz=80
while True:
    t1=font(NUN,sz,900)
    if d.textlength('Lazy Vocabulary',font=t1)<=1024-x-40: break
    sz-=2
t2=font(NUN,max(26,int(sz*0.42)),700)
while d.textlength('Master vocabulary in 15 minutes a day',font=t2)>1024-x-40: t2=font(NUN,t2.size-1,700)
d.text((x,170),'Lazy Vocabulary',font=t1,fill=(255,255,255))
d.text((x+3,180+sz+22),'Master vocabulary in 15 minutes a day',font=t2,fill=(255,214,153))
fgw.convert('RGB').save('/workspace/logo/feature-graphic.png')
# --- preview
prev=Image.new('RGB',(1560,520),(236,239,244)); pd=ImageDraw.Draw(prev)
lab=font(NUN,22,700); fA=lambda s: (lambda b: (b.alpha_composite(place(s,SAFE*0.97)), b)[1])(gradient(s,s).convert('RGBA'))
y=40
for row,(label,size) in enumerate([('192 px',192),('48 px',48)]):
    cols=iter([40,420,800,1180])
    for kind in ['circle','squircle']:
        xx=next(cols); A=round(size*108/72); full=fA(A); vis=full.crop(((A-size)//2,(A-size)//2,(A-size)//2+size,(A-size)//2+size))
        prev.paste(masked(vis,kind),(xx,y),masked(vis,kind)); pd.text((xx,y+size+8),f'adaptive {kind} {label}',font=lab,fill=(40,40,40)); 
    for kind,name in [('rounded','ic_launcher'),('circle','ic_launcher_round')]:
        xx=next(cols); leg=masked(M1024.resize((size,size),Image.LANCZOS),kind); prev.paste(leg,(xx,y),leg); pd.text((xx,y+size+8),f'legacy {name} {label}',font=lab,fill=(40,40,40))
    y+=size+90
prev.save('/workspace/logo/preview.png')
print('done')
