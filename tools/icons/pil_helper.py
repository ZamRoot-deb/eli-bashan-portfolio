#!/usr/bin/env python3
"""Small PIL helper used by fetch-icons.mjs for raster formats it can't
handle natively (ico/webp decode, autocrop, oversize downscale, dims probe).
Usage: python3 pil_helper.py <op> <args...>
"""
import sys
import io
from PIL import Image


def ico2png(src, dst):
    im = Image.open(src)
    best = None
    try:
        for i in range(0, 32):
            im.seek(i)
            if best is None or im.size[0] * im.size[1] > best.size[0] * best.size[1]:
                best = im.copy().convert("RGBA")
    except EOFError:
        pass
    if best is None:
        best = im.convert("RGBA")
    best.save(dst, "PNG")
    print(f"{dst} {best.size[0]}x{best.size[1]}")


def webp2png(src, dst):
    im = Image.open(src).convert("RGBA")
    im.save(dst, "PNG")
    print(f"{dst} {im.size[0]}x{im.size[1]}")


def autocrop(src, dst, tolerance=12):
    im = Image.open(src).convert("RGBA")
    rgb = im.convert("RGB")
    w, h = im.size
    # Sample the corner colour as "background" and make it (and near matches) transparent.
    bg = rgb.getpixel((0, 0))
    pixels = im.load()
    rgbpix = rgb.load()
    for y in range(h):
        for x in range(w):
            r, g, b = rgbpix[x, y]
            if abs(r - bg[0]) <= tolerance and abs(g - bg[1]) <= tolerance and abs(b - bg[2]) <= tolerance:
                pr, pg, pb, pa = pixels[x, y]
                pixels[x, y] = (pr, pg, pb, 0)
    bbox = im.getbbox()
    if bbox:
        im = im.crop(bbox)
    im.save(dst, "PNG")
    print(f"{dst} {im.size[0]}x{im.size[1]}")


def resize_cap(src, dst, max_kb=40, max_dim=256):
    im = Image.open(src).convert("RGBA")
    if max(im.size) > max_dim:
        ratio = max_dim / max(im.size)
        im = im.resize((max(1, int(im.size[0] * ratio)), max(1, int(im.size[1] * ratio))), Image.LANCZOS)
    im.save(dst, "PNG", optimize=True)
    size = len(open(dst, "rb").read())
    tries = 0
    while size > max_kb * 1024 and tries < 6:
        im = im.resize((int(im.size[0] * 0.85), int(im.size[1] * 0.85)), Image.LANCZOS)
        im.save(dst, "PNG", optimize=True)
        size = len(open(dst, "rb").read())
        tries += 1
    print(f"{dst} {im.size[0]}x{im.size[1]} {size}bytes")


def dims(src):
    im = Image.open(src)
    print(f"{src} {im.format} {im.size[0]}x{im.size[1]} {im.mode}")


OPS = {"ico2png": ico2png, "webp2png": webp2png, "autocrop": autocrop, "resize_cap": resize_cap, "dims": dims}

if __name__ == "__main__":
    op = sys.argv[1]
    args = sys.argv[2:]
    # numeric-looking trailing args -> int
    args = [int(a) if a.lstrip("-").isdigit() else a for a in args]
    OPS[op](*args)
