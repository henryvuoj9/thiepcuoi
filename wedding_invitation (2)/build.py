"""Ghép font (base64), texture (base64) và các SVG path ren vào v4_template.html -> lv-wedding-invitation.html"""
import base64, math, sys, os
def b64(p): return base64.b64encode(open(p,'rb').read()).decode()
def scallop_path(points, r):
    """points: danh sách điểm khép kín theo chiều kim đồng hồ; nối bằng cung tròn lồi ra ngoài"""
    d=f"M{points[0][0]:.1f} {points[0][1]:.1f}"
    n=len(points)
    for i in range(1,n+1):
        x,y=points[i%n]; d+=f" A{r:.1f} {r:.1f} 0 0 1 {x:.1f} {y:.1f}"
    return d+" Z"
def ellipse_pts(cx,cy,rx,ry,n):
    return [(cx+rx*math.cos(2*math.pi*i/n - math.pi/2), cy+ry*math.sin(2*math.pi*i/n - math.pi/2)) for i in range(n)]
def heart_pts(cx,cy,s,n):
    pts=[]
    for i in range(n):
        t=2*math.pi*i/n
        x=16*math.sin(t)**3; y=-(13*math.cos(t)-5*math.cos(2*t)-2*math.cos(3*t)-math.cos(4*t))
        pts.append((cx+x*s, cy+y*s))
    # heart param chạy ngược chiều kim đồng hồ -> đảo để cung lồi ra ngoài
    return pts[::-1]
def arclen_resample(pts, step):
    out=[pts[0]]; acc=0
    for i in range(1,len(pts)+1):
        a=pts[i-1]; b=pts[i%len(pts)]; seg=math.hypot(b[0]-a[0],b[1]-a[1]); acc+=seg
        if acc>=step: out.append(b); acc=0
    return out
oval=scallop_path(ellipse_pts(100,120,88,108,22), 14.6)
oval_in=f"M100 12 a88 108 0 1 0 0.01 0"  # not used
heart=scallop_path(arclen_resample(heart_pts(100,105,5.6,400), 11.5), 6.4)
import sys
TPL=sys.argv[1] if len(sys.argv)>1 else 'v5_template.html'
tpl=open(TPL,encoding='utf-8').read()
PHOTO='https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80'
if os.path.exists('assets/photo.jpg'):
    from PIL import Image, ImageOps
    im=ImageOps.exif_transpose(Image.open('assets/photo.jpg')).convert('RGB'); im.thumbnail((900,1200)); im.save('assets/photo_web.jpg',quality=84,optimize=True)
    PHOTO='data:image/jpeg;base64,'+b64('assets/photo_web.jpg')
out=(tpl.replace('__FONT_B64__',b64('fonts/NewIconScript-VN.woff2'))
        .replace('__TEX_LEATHER__',b64('tex_leather.jpg'))
        .replace('__TEX_PLASTER__',b64('tex_plaster.jpg'))
        .replace('__ENV_CLOSED__',b64('assets/envelope_closed.jpg')).replace('__ENV_OPEN__',b64('assets/envelope_open_nocard.webp')).replace('__SEAL__',b64('assets/wax_seal_web.png')).replace('__STAMP__',b64('assets/stamp_brown_logo.webp')).replace('__LACE_FRAME__',b64('assets/lace_frame_web.webp')).replace('__SWAN__',b64('assets/swan_web.png')).replace('__ORCHID__',b64('assets/orchid_web.webp')).replace('__CALLA__',b64('assets/calla_web.webp')).replace('__LACE_STRIP__',b64('assets/lace_strip_web.webp')).replace('__TEX_ENV__',b64('assets/tex_env.jpg')).replace('__ENV_V2__',b64('assets/envelope_closed_v2.jpg')).replace('__ENV_V3__',b64('assets/envelope_closed_v3.jpg')).replace('__ENV_BG__',b64('assets/envelope_closed_bg.jpg')).replace('__ENV_OPEN_BG__',b64('assets/envelope_open_bg.webp')).replace('__PHOTO__',PHOTO).replace('__ENV_TOP__',b64('assets/env_top.jpg')).replace('__ENV_BOTTOM__',b64('assets/env_bottom.jpg')).replace('__STAMP_BEIGE__',b64('assets/stamp_beige_logo.webp')).replace('__MUSIC__',b64('assets/music_web.mp3') if os.path.exists('assets/music_web.mp3') else '')
        .replace('__OVAL_SCALLOP__',oval).replace('__HEART_SCALLOP__',heart))
open('lv-wedding-invitation.html','w',encoding='utf-8').write(out)
print('built', len(out), 'bytes; oval pts 40, heart pts', heart.count('A'))
