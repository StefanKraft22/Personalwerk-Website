from PIL import Image
import os, shutil

ASSETS = 'assets'
ORIG = 'assets/_orig_coll'
os.makedirs(ORIG, exist_ok=True)

# name -> (top offset removed from 1856x2304 original, top_fill px to erase remnants)
# Output height fixed = 1704 -> all images identical size 1856x1704.
OUT_H = 1704
CFG = {
    'coll-stellenanzeigen-paket': (600, 0),   # tall title + subline + bestseller badge
    'coll-employer-branding':     (540, 0),   # title + subline
    'coll-active-sourcing':       (560, 0),   # keep bottom PERSONALWERK wordmark
    'coll-mediaplanung':          (600, 64),  # keep wordmark; erase tiny title remnant on top
    'coll-bewerbermanagement':    (560, 0),   # title + subline
}

preview = os.environ.get('PREVIEW') == '1'
outdir = 'generated_imgs/_crop_preview' if preview else ASSETS
if preview:
    os.makedirs(outdir, exist_ok=True)

for name, (off, fill) in CFG.items():
    src_orig = os.path.join(ORIG, name + '.jpg')
    live = os.path.join(ASSETS, name + '.jpg')
    # back up original once
    if not os.path.exists(src_orig):
        shutil.copy2(live, src_orig)
    im = Image.open(src_orig).convert('RGB')
    W, H = im.size
    top = off
    bottom = min(H, top + OUT_H)
    if bottom - top < OUT_H:  # safety, shift up
        top = bottom - OUT_H
    crop = im.crop((0, top, W, bottom)).copy()
    if fill:
        # erase residual title pixels: extend the clean background row at y=fill upward
        row = crop.crop((0, fill, W, fill + 2)).resize((W, fill), Image.BILINEAR)
        crop.paste(row, (0, 0))
    out = os.path.join(outdir, name + '.jpg')
    crop.save(out, quality=92)
    print(name, '->', crop.size, 'window', (top, bottom), 'fill', fill, 'preview' if preview else 'LIVE')
