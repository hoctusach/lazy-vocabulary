import numpy as np
from PIL import Image, ImageFilter
im=np.asarray(Image.open('/workspace/logo/logo-a-simplified.jpg').convert('RGB')).astype(float)
H,W,_=im.shape
yy,xx=np.mgrid[0:H,0:W]; x=xx/W; y=yy/H
feat=lambda x,y: np.stack([np.ones_like(x),x,y,x*x,y*y,x*y,x**3,y**3,x*x*y,x*y*y],-1)
F=feat(x,y)
# sample: border band + regions far from centre content
m=np.zeros((H,W),bool); b=70
m[:b]=m[-b:]=True; m[:,:b]=m[:,-b:]=True
m |= ((xx-470)**2/(430**2)+(yy-500)**2/(370**2))>1.25
m &= ~((xx>780)&(xx<990)&(yy>330)&(yy<740))
A=F[m]; fit=[]
for c in range(3):
    coef,*_=np.linalg.lstsq(A,im[...,c][m],rcond=None); fit.append(F@coef)
bg=np.stack(fit,-1)
d=np.sqrt(((im-bg)**2).sum(-1))
print('bg resid p99',np.percentile(d[m],99))
np.save('bgfit.npy',bg)
Image.fromarray(np.clip(bg,0,255).astype(np.uint8)).save('bg.png')
alpha=np.clip((d-18)/(40-18),0,1)
a=Image.fromarray((alpha*255).astype(np.uint8))
# clean speckle: median filter
a=a.filter(ImageFilter.MedianFilter(5))
a.save('alpha.png')
# un-blend colour on edges: fg = (im - (1-a)bg)/a
al=np.asarray(a).astype(float)[...,None]/255
fg=np.where(al>0.05,(im-(1-al)*bg)/np.maximum(al,0.05),im)
rgba=np.dstack([np.clip(fg,0,255),al[...,0]*255]).astype(np.uint8)
Image.fromarray(rgba,'RGBA').save('fg_full.png')
ys,xs=np.where(np.asarray(a)>20); print('bbox',xs.min(),ys.min(),xs.max(),ys.max())
