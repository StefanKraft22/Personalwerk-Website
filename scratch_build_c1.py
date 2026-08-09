from PIL import Image, ImageDraw, ImageFont, ImageFilter
import numpy as np, math, os, bisect

BASE='generated_imgs/edited-2026-08-09T12-07-02-572Z-xzs4fi.jpg'
LOGODIR='assets/logos'
FB='/c/Windows/Fonts/segoeuib.ttf'
im=Image.open(BASE).convert('RGB'); W,H=im.size

# ---------- 1) remove headline "Lösungen, die zünden" ----------
def bg_fill(arr,y0,y1,x0,x1,refx):
    for yy in range(y0,y1):
        left=np.median(arr[yy,10:120],axis=0)
        right=np.median(arr[yy,refx[0]:refx[1]],axis=0)
        xs=np.arange(x0,x1); t=(xs-x0)/max(1,(x1-x0-1))
        arr[yy,x0:x1,:]=(left[None,:]*(1-t)[:,None]+right[None,:]*t[:,None]).astype('uint8')
arr=np.asarray(im).copy()
bg_fill(arr,223,606,0,W,(W-120,W-10))
# ---------- 2) remove old blue title + gray subline ----------
bg_fill(arr,600,925,0,W,(W-120,W-10))
bg_fill(arr,995,1150,0,2505,(2452,2500))
im=Image.fromarray(arr); d=ImageDraw.Draw(im)
blue=(18,82,150); gray=(85,81,82)
def font(sz): return ImageFont.truetype(FB,sz)
def fit(text,maxw,start,mins=80):
    s=start
    while s>mins:
        f=font(s)
        if d.textlength(text,font=f)<=maxw: return f,s
        s-=4
    return font(mins),mins
LX=300; maxw=W-LX-240
l1='Einzel- oder mehrere'; l2='Stellenanzeigen'
f1,s1=fit(l1,maxw,300); f2,s2=fit(l2,maxw,300); ts=min(s1,s2); f=font(ts)
lh=ts*1.02; y1=270; y2=int(y1+lh)
d.text((LX,y1),l1,font=f,fill=blue); d.text((LX,y2),l2,font=f,fill=blue)
sub='Das Paket mit Design & Reichweite'
fs,ss=fit(sub,2480-LX,155,110); d.text((LX,1010),sub,font=fs,fill=gray)
base=im.convert('RGBA')

# ---------- 3) logo flow left->right + "u. v. m." ----------
ctrl=[(600,4130),(1040,3930),(1520,3740),(1960,3660),(2360,3620),
      (2760,3450),(3120,3200),(3440,2990),(3690,2810)]
def catmull(p0,p1,p2,p3,n=28):
    o=[]
    for i in range(n):
        t=i/n;t2=t*t;t3=t2*t
        x=0.5*((2*p1[0])+(-p0[0]+p2[0])*t+(2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*t2+(-p0[0]+3*p1[0]-3*p2[0]+p3[0])*t3)
        y=0.5*((2*p1[1])+(-p0[1]+p2[1])*t+(2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*t2+(-p0[1]+3*p1[1]-3*p2[1]+p3[1])*t3)
        o.append((x,y))
    return o
pts=[ctrl[0]]; cc=[ctrl[0]]+ctrl+[ctrl[-1]]
for i in range(1,len(cc)-2): pts+=catmull(cc[i-1],cc[i],cc[i+1],cc[i+2])
pts.append(ctrl[-1])
seg=[0.0]
for i in range(1,len(pts)): seg.append(seg[-1]+math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]))
total=seg[-1]
def at(s):
    j=bisect.bisect_left(seg,s); j=max(1,min(j,len(pts)-1))
    x0,y0=pts[j-1];x1,y1_=pts[j];dn=(seg[j]-seg[j-1]) or 1;fr=(s-seg[j-1])/dn
    return x0+(x1-x0)*fr,y0+(y1_-y0)*fr,math.degrees(math.atan2(y1_-y0,x1-x0))
def chip_from(img,chip_h,pad):
    lw,lh2=img.size; inner=chip_h-2*pad; sc=inner/lh2
    nw=int(lw*sc); nh=inner; mx=int(inner*3.4)
    if nw>mx: sc=mx/lw; nw=mx; nh=int(lh2*sc)
    img=img.resize((max(1,nw),max(1,nh)),Image.LANCZOS)
    img=img.filter(ImageFilter.UnsharpMask(radius=2.0,percent=130,threshold=1))
    cw=max(int(chip_h*0.86),nw+2*pad); ss=3
    card=Image.new('RGBA',(cw*ss,chip_h*ss),(0,0,0,0)); dr=ImageDraw.Draw(card)
    r=int(chip_h*0.26)*ss
    dr.rounded_rectangle([0,0,cw*ss-1,chip_h*ss-1],radius=r,fill=(255,255,255,255),outline=(214,223,234,255),width=2*ss)
    card=card.resize((cw,chip_h),Image.LANCZOS)
    card.alpha_composite(img,((cw-nw)//2,(chip_h-nh)//2))
    return card
def make_chip(name,chip_h,pad):
    return chip_from(Image.open(os.path.join(LOGODIR,name+'.png')).convert('RGBA'),chip_h,pad)
def make_text_chip(text,chip_h,pad,col):
    f=ImageFont.truetype(FB,int(chip_h*0.5))
    tmp=Image.new('RGBA',(10,10)); td=ImageDraw.Draw(tmp)
    tw=int(td.textlength(text,font=f)); th=int(chip_h*0.5)
    lg=Image.new('RGBA',(tw+8,int(chip_h*0.72)),(0,0,0,0)); dd=ImageDraw.Draw(lg)
    dd.text((4,0),text,font=f,fill=col)
    return chip_from(lg,chip_h,pad)

order=['Stepstone','Indeed','Xing','LinkedIn','stellenanzeigen.de','meinestadt.de',
       'kimeta.de','kleinanzeigen.de','Jobware','Joblocal','yourfirm.de','Arbeitsagentur',
       'jobsintown.de','jobvector.de','Jobninja','Facebook','Instagram','TikTok','Snapchat']
laneBack =[order[i] for i in range(len(order)) if i%3==0]
laneMid  =[order[i] for i in range(len(order)) if i%3==1]
laneFront=[order[i] for i in range(len(order)) if i%3==2]
CHIP_H=176; PAD=20; GAP=26; MARGIN=55
def perp(ang,mag): a=math.radians(ang); return (math.sin(a)*mag,-math.cos(a)*mag)
placed=[]
def lay(names,off,scale,tail=None):
    s=None;prev=0
    for name in names:
        chip=make_chip(name,int(CHIP_H*scale),PAD);w=chip.width
        s=(MARGIN+w/2) if s is None else s+prev/2+GAP+w/2; prev=w
        if s+w/2>total-MARGIN: continue
        x,y,ang=at(s); dx,dy=perp(ang,off); placed.append((chip,x+dx,y+dy,ang))
    if tail is not None:
        chip=tail; w=chip.width
        s=s+prev/2+GAP+w/2
        s=min(s, total-MARGIN-w/2)
        x,y,ang=at(s); dx,dy=perp(ang,off); placed.append((chip,x+dx,y+dy,ang))
uvm=make_text_chip('u. v. m.', int(CHIP_H*1.0), 22, blue)
lay(laneBack,-315,0.82)
lay(laneMid,  -35,0.91)
lay(laneFront,255,1.0, tail=uvm)

canvas=base.copy(); shadows=Image.new('RGBA',(W,H),(0,0,0,0)); rots=[]
for chip,x,y,ang in placed:
    rot=chip.rotate(-ang*0.5,expand=True,resample=Image.BICUBIC); rots.append((rot,x,y))
    sh=Image.new('RGBA',rot.size,(16,34,60,255)); sh.putalpha(rot.split()[3].point(lambda a:int(a*0.30)))
    sh=sh.filter(ImageFilter.GaussianBlur(11)); shadows.alpha_composite(sh,(int(x-rot.width/2)+8,int(y-rot.height/2)+20))
canvas.alpha_composite(shadows)
for rot,x,y in rots: canvas.alpha_composite(rot,(int(x-rot.width/2),int(y-rot.height/2)))
canvas.convert('RGB').save('generated_imgs/mood7_logos_flow_4k.png',quality=95)
# refresh c1 asset
canvas.convert('RGB').resize((1856,2304),Image.LANCZOS).save('assets/coll-stellenanzeigen-paket.jpg',quality=86,optimize=True,progressive=True)
print('done, placed',len(placed))
