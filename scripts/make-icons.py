"""App icons generate karo (PIL). Run: python scripts/make-icons.py"""
import os

from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "icons")
os.makedirs(OUT, exist_ok=True)


def draw(size: int) -> Image.Image:
    S = 512
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # dark rounded square
    d.rounded_rectangle([8, 8, S - 8, S - 8], radius=110, fill=(24, 24, 27, 255))
    cx = cy = S // 2
    # alarm bells (top corners, amber)
    d.line([cx - 110, cy - 150, cx - 152, cy - 192], fill=(245, 158, 11, 255), width=30, joint="curve")
    d.line([cx + 110, cy - 150, cx + 152, cy - 192], fill=(245, 158, 11, 255), width=30, joint="curve")
    # clock face
    R = 150
    d.ellipse([cx - R, cy - R + 10, cx + R, cy + R + 10], fill=(255, 255, 255, 255))
    # hands (12 bajne me 5 min — uth jao!)
    d.line([cx, cy + 10, cx, cy - 95 + 10], fill=(24, 24, 27, 255), width=22)
    d.line([cx, cy + 10, cx + 68, cy + 52], fill=(24, 24, 27, 255), width=16)
    # center dot
    d.ellipse([cx - 20, cy - 10, cx + 20, cy + 30], fill=(245, 158, 11, 255))
    return img.resize((size, size), Image.LANCZOS)


draw(512).save(os.path.join(OUT, "icon-512.png"))
draw(192).save(os.path.join(OUT, "icon-192.png"))
print("ICONS-OK", OUT)
