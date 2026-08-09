from PIL import Image, ImageDraw, ImageFont
import numpy as np, os, shutil

ASSETS = 'assets'
SRC = 'assets/_crop_wm_src'   # cropped images before wordmark edit (idempotent source)
os.makedirs(SRC, exist_ok=True)

NAVY = (12, 38, 66)      # personalwerk word
RED  = (229, 23, 71)     # the dot
FONT = 'C:/Windows/Fonts/segoeuib.ttf'

# name -> clear box (L,T,R,B) + baseline vertical center for new text
CFG = {
    'coll-active-sourcing': dict(box=(640, 1612, 1216, 1688), cy=1648),
    'coll-mediaplanung':    dict(box=(600, 1540, 1256, 1614), cy=1578),
}

TARGET_W = 520   # width of "personalwerk." in px -> same size in both images
WORD = 'personalwerk'

preview = os.environ.get('PREVIEW') == '1'
outdir = 'generated_imgs/_wm_preview' if preview else ASSETS
if preview: os.makedirs(outdir, exist_ok=True)

def fit_font(draw, text, target_w):
    s = 40
    while s < 300:
        f = ImageFont.truetype(FONT, s)
        if draw.textlength(text, font=f) >= target_w:
            return f, s
        s += 2
    return ImageFont.truetype(FONT, s), s

for name, cfg in CFG.items():
    live = os.path.join(ASSETS, name + '.jpg')
    src = os.path.join(SRC, name + '.jpg')
    if not os.path.exists(src):
        shutil.copy2(live, src)
    im = Image.open(src).convert('RGB')
    arr = np.asarray(im).astype(np.float32).copy()
    H, W, _ = arr.shape
    L, T, R, B = cfg['box']
    # erase old wordmark: per row, interpolate background from just outside the box
    lw = slice(max(0, L-40), max(1, L-8))
    rw = slice(min(W-1, R+8), min(W, R+40))
    for y in range(T, B):
        left = np.median(arr[y, lw], axis=0)
        right = np.median(arr[y, rw], axis=0)
        xs = np.arange(L, R); t = (xs - L) / max(1, (R - L - 1))
        arr[y, L:R] = left[None, :] * (1 - t)[:, None] + right[None, :] * t[:, None]
    im = Image.fromarray(arr.astype('uint8'))

    # draw new wordmark, centered horizontally on image center, vertically on cy
    d = ImageDraw.Draw(im)
    f, size = fit_font(d, WORD + '.', TARGET_W)
    w_word = d.textlength(WORD, font=f)
    w_dot = d.textlength('.', font=f)
    total = w_word + w_dot
    x0 = (W - total) / 2
    asc, desc = f.getmetrics()
    y0 = cfg['cy'] - (asc + desc) / 2
    d.text((x0, y0), WORD, font=f, fill=NAVY)
    d.text((x0 + w_word, y0), '.', font=f, fill=RED)

    out = os.path.join(outdir, name + '.jpg')
    im.save(out, quality=93)
    print(name, 'font', size, 'wordmark_w', int(total), 'preview' if preview else 'LIVE')
