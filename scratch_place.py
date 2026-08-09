from PIL import Image, ImageDraw, ImageFilter
import math, os, bisect

BASE='generated_imgs/edited-2026-08-09T10-46-55-571Z-7pk059.jpg'
LOGODIR='assets/logos'
base=Image.open(BASE).convert('RGBA')
W,Hh=base.size

ctrl=[(300,2180),(520,2075),(760,1975),(980,1930),(1180,1910),(1380,1820),
      (1560,1690),(1720,1580),(1845,1485)]

def catmull(p0,p1,p2,p3,n=26):
    out=[]
    for i in range(n):
        t=i/n; t2=t*t; t3=t2*t
        x=0.5*((2*p1[0])+(-p0[0]+p2[0])*t+(2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*t2+(-p0[0]+3*p1[0]-3*p2[0]+p3[0])*t3)
        y=0.5*((2*p1[1])+(-p0[1]+p2[1])*t+(2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*t2+(-p0[1]+3*p1[1]-3*p2[1]+p3[1])*t3)
        out.append((x,y))
    return out
pts=[ctrl[0]]; cc=[ctrl[0]]+ctrl+[ctrl[-1]]
for i in range(1,len(cc)-2):
    pts+=catmull(cc[i-1],cc[i],cc[i+1],cc[i+2])
pts.append(ctrl[-1])
seg=[0.0]
for i in range(1,len(pts)):
    seg.append(seg[-1]+math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]))
total=seg[-1]
def at(s):
    j=bisect.bisect_left(seg,s); j=max(1,min(j,len(pts)-1))
    x0,y0=pts[j-1]; x1,y1=pts[j]; denom=(seg[j]-seg[j-1]) or 1
    f=(s-seg[j-1])/denom
    return x0+(x1-x0)*f, y0+(y1-y0)*f, math.degrees(math.atan2(y1-y0,x1-x0))

def make_chip(name, chip_h, pad):
    lg=Image.open(os.path.join(LOGODIR,name+'.png')).convert('RGBA')
    lw,lh=lg.size; inner_h=chip_h-2*pad; scale=inner_h/lh
    nw=int(lw*scale); nh=inner_h; max_in_w=int(inner_h*3.2)
    if nw>max_in_w: scale=max_in_w/lw; nw=max_in_w; nh=int(lh*scale)
    lg=lg.resize((max(1,nw),max(1,nh)),Image.LANCZOS)
    chip_w=max(int(chip_h*0.9), nw+2*pad)
    ss=3; cw,ch=chip_w*ss,chip_h*ss
    card=Image.new('RGBA',(cw,ch),(0,0,0,0)); dr=ImageDraw.Draw(card)
    r=int(chip_h*0.24)*ss
    dr.rounded_rectangle([0,0,cw-1,ch-1],radius=r,fill=(255,255,255,255),outline=(220,228,238,255),width=2*ss)
    card=card.resize((chip_w,chip_h),Image.LANCZOS)
    card.alpha_composite(lg,((chip_w-nw)//2,(chip_h-nh)//2))
    return card

order=['Stepstone','Indeed','Xing','LinkedIn','stellenanzeigen.de','meinestadt.de',
       'kimeta.de','kleinanzeigen.de','Jobware','Joblocal','yourfirm.de','Arbeitsagentur']

GAP=34; MARGIN=40; PAD=13; CHIP_H=112
# two staggered lanes on the wide ribbon: front (down) and back (up)
laneA=order[0::2]   # front lane
laneB=order[1::2]   # back lane
def perp(ang, mag):
    a=math.radians(ang); return (math.sin(a)*mag, -math.cos(a)*mag)
placed=[]; dropped=[]
def lay(names, off, scale):
    s=None; prev_w=0
    for name in names:
        chip=make_chip(name, int(CHIP_H*scale), PAD); w=chip.width
        s = (MARGIN + w/2) if s is None else s + prev_w/2 + GAP + w/2
        prev_w=w
        if s + w/2 > total-MARGIN:
            dropped.append(name); continue
        x,y,ang=at(s); dx,dy=perp(ang,off)
        placed.append((chip,x+dx,y+dy,ang,s))
lay(laneB, -128, 0.9)   # back lane (drawn behind), smaller for depth
lay(laneA, 44, 1.0)     # front lane
print('placed',len(placed),'dropped',dropped)

# pass 1 shadows
canvas=base.copy()
shadows=Image.new('RGBA',(W,Hh),(0,0,0,0))
rots=[]
for chip,x,y,ang,s in placed:
    rot=chip.rotate(-ang*0.5,expand=True,resample=Image.BICUBIC)
    rots.append((rot,x,y))
    sh=Image.new('RGBA',rot.size,(18,38,66,255))
    sh.putalpha(rot.split()[3].point(lambda a:int(a*0.28)))
    sh=sh.filter(ImageFilter.GaussianBlur(7))
    shadows.alpha_composite(sh,(int(x-rot.width/2)+5,int(y-rot.height/2)+12))
canvas.alpha_composite(shadows)
# pass 2 chips
for rot,x,y in rots:
    canvas.alpha_composite(rot,(int(x-rot.width/2),int(y-rot.height/2)))

out='generated_imgs/mood7_logos_flow.png'
canvas.convert('RGB').save(out,quality=95)
print('placed',[p[0] for p in zip(order)][:0] or [order[i] for i in range(len(placed))])
print('dropped',dropped,'total_len',int(total))
