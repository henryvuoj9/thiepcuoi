"""Thêm bộ dấu tiếng Việt vào New Icon Script (CFF) bằng cách ghép outline:
   dấu sắc/huyền/ngã/mũ/trăng lấy từ chính font; dấu hỏi/nặng/móc lấy từ Imperial Script (OFL)."""
import unicodedata, sys
from fontTools.ttLib import TTFont
from fontTools.pens.recordingPen import RecordingPen, DecomposingRecordingPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.t2CharStringPen import T2CharStringPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.basePen import DecomposingPen

SRC='canvafonts/304da6bb759f7c1e6948d63f119e0b82.ttf'; MARKSRC='gf/ImperialScript.ttf'; OUT='fontbuild/NewIconScript-VN'
t=TTFont(SRC); gs=t.getGlyphSet(); cmap=t.getBestCmap(); order=list(t.getGlyphOrder())
cff=t['CFF '].cff; td=cff.topDictIndex[0]; XH=539; CAP=943
im=TTFont(MARKSRC); igs=im.getGlyphSet()

def contours(glyphset,name):
    p=DecomposingRecordingPen(glyphset); glyphset[name].draw(p)
    cs=[];cur=[]
    for op,args in p.value:
        if op=='moveTo': cur=[('moveTo',args)]
        elif op in('closePath','endPath'): cur.append((op,args)); cs.append(cur); cur=[]
        else: cur.append((op,args))
    if cur: cs.append(cur)
    return cs
def cbounds(c):
    xs=[];ys=[]
    for op,args in c:
        for pt in args: xs.append(pt[0]); ys.append(pt[1])
    return (min(xs),min(ys),max(xs),max(ys)) if xs else None
def bounds(glyphset,name):
    b=BoundsPen(glyphset); glyphset[name].draw(b); return b.bounds

# nguồn dấu: (glyphset, tên) + tỉ lệ
MARK={'0301':(gs,'acute',1),'0300':(gs,'grave',1),'0303':(gs,'tilde',1),'0302':(gs,'circumflex',1),'0306':(gs,'breve',1),
      '0309':(igs,'hookabovecomb',1.05),'0323':(igs,'dotbelowcomb',1.15),'031B':(igs,'uni031B',1.1)}
def mark_contours(code):
    g,n,s=MARK[code]; cs=contours(g,n)
    out=[]
    for c in cs:
        out.append([(op,tuple((x*s,y*s) for x,y in args)) for op,args in c])
    return out
def shift(cs,dx,dy): return [[(op,tuple((x+dx,y+dy) for x,y in args)) for op,args in c] for c in cs]
def allb(cs):
    bs=[cbounds(c) for c in cs]; return (min(b[0] for b in bs),min(b[1] for b in bs),max(b[2] for b in bs),max(b[3] for b in bs))

def top_anchor(name, upper):
    """tâm x và đỉnh y của phần thân chữ (để đặt dấu trên). Dùng glyph có sẵn <base>acute nếu có để lấy vị trí dấu chuẩn."""
    for acc in ('acute','grave','circumflex','tilde'):
        pre=name+acc
        if pre in gs and (name in 'aeiouyAEIOUY'):
            cs=contours(gs,pre); h=CAP if upper else XH
            marks=[c for c in cs if cbounds(c)[1]>h*0.98]
            if marks:
                b=allb(marks); return ((b[0]+b[2])/2, b[1], True)
    b=bounds(gs,name); h=CAP if upper else XH
    # tâm phần trên của thân chữ
    cs=contours(gs,name); pts=[pt for c in cs for op,args in c for pt in args if pt[1]>h*0.6]
    xs=[p[0] for p in pts]; cx=(min(xs)+max(xs))/2 if xs else (b[0]+b[2])/2
    return (cx, b[3]+40, False)

def compose(ch):
    nfd=unicodedata.normalize('NFD',ch); base=nfd[0]; marks=[f'{ord(m):04X}' for m in nfd[1:]]
    # ưu tiên glyph có sẵn cho base+mũ/trăng/móc
    pre=None
    if marks and marks[0] in('0302','0306') and unicodedata.normalize('NFC',base+nfd[1]) in cmap and len(unicodedata.normalize('NFC',base+nfd[1]))==1:
        pre=unicodedata.normalize('NFC',base+nfd[1]); basename=cmap[ord(pre)]; marks=marks[1:]; stacked=nfd[1]
    else:
        basename=cmap[ord(base)]; stacked=None
    upper=base.isupper()
    cs=contours(gs,basename); adv=t['hmtx'][basename][0]
    bb=bounds(gs,basename)
    # anchor trên
    if stacked:
        h=CAP if upper else XH; mk=[c for c in cs if cbounds(c)[1]>h*0.98]; mb=allb(mk)
        cx,top=(mb[0]+mb[2])/2, mb[3]
        if stacked=='̂': cx+=70; top-=22   # dấu thanh lệch phải trên mũ
        else: top+=8
    else:
        cx,top,_=top_anchor(basename.replace('dotlessi','i') if basename!='dotlessi' else 'i', upper)
        if base in 'iI' : pass
    if base=='i' and not stacked:  # bỏ chấm i khi có dấu trên
        if 'dotlessi' in gs: cs=contours(gs,'dotlessi'); cx,top,_=top_anchor('i',False)
    for m in marks:
        mc=mark_contours(m); mb=allb(mc)
        if m=='031B':  # móc: gắn đỉnh phải thân chữ
            dx=bb[2]-mb[0]-(70 if not upper else 90); dy=(bb[3]-mb[3])-(30 if not upper else 60)
            cs+=shift(mc,dx,dy); adv=max(adv, bb[2]-mb[0]+mb[2]-mb[0]+10) if False else adv+ (mb[2]-mb[0])//3
        elif m=='0323':  # nặng: dưới baseline giữa thân
            cs_pts=[pt for c in cs for op,args in c for pt in args if pt[1]<XH*0.35 and pt[1]>-5]
            xs=[p[0] for p in cs_pts]; bx=(min(xs)+max(xs))/2 if xs else (bb[0]+bb[2])/2
            cs+=shift(mc,bx-(mb[0]+mb[2])/2, -70-mb[3])
        else:  # dấu trên
            cs+=shift(mc,cx-(mb[0]+mb[2])/2, top-mb[1]+ (0 if stacked else 25))
            top=top+(mb[3]-mb[1])+10
    return cs,adv

VN=[c for c in map(chr,list(range(0x1EA0,0x1EFA))+[0x1A0,0x1A1,0x1AF,0x1B0]) if unicodedata.normalize('NFD',c)[0] in 'aeiouyAEIOUY' and ord(c) not in cmap and 'LATIN' in unicodedata.name(c,'') and all(unicodedata.category(x)=='Mn' for x in unicodedata.normalize('NFD',c)[1:]) and all(f'{ord(x):04X}' in MARK for x in unicodedata.normalize('NFD',c)[1:])]
print(len(VN),''.join(VN))
new=[]
for ch in VN:
    cs,adv=compose(ch); name=f'uni{ord(ch):04X}'
    pen=T2CharStringPen(adv,None)
    for c in cs:
        for op,args in c:
            if op=='moveTo': pen.moveTo(*args)
            elif op=='lineTo': pen.lineTo(*args)
            elif op=='curveTo': pen.curveTo(*args)
            elif op=='qCurveTo': pen.qCurveTo(*args)
            elif op=='closePath': pen.closePath()
            elif op=='endPath': pen.endPath()
    csr=pen.getCharString(private=td.Private, globalSubrs=cff.GlobalSubrs)
    td.CharStrings.charStringsIndex.append(csr); td.CharStrings.charStrings[name]=len(td.CharStrings.charStringsIndex)-1; td.charset.append(name)
    b=BoundsPen(None); 
    lsb=allb(cs)[0]
    t['hmtx'].metrics[name]=(int(adv),int(lsb)); new.append((ch,name))
t.setGlyphOrder(order+[n for _,n in new])
for st in t['cmap'].tables:
    for ch,n in new: st.cmap[ord(ch)]=n
N=len(t.getGlyphOrder()); t['maxp'].numGlyphs=N; t['hhea'].numberOfHMetrics=N; print('N',N)
if 'GDEF' in t: del t['GDEF']

# đổi tên font để không trùng
for rec in t['name'].names:
    if rec.nameID in (1,3,4,6,16):
        rec.string=rec.toUnicode().replace('New Icon Script','New Icon Script VN').replace('NewIconScript','NewIconScriptVN')
t.save(OUT+'.ttf'); t.flavor='woff2'; t.save(OUT+'.woff2'); print('saved')
