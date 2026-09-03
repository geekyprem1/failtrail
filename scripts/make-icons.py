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

# ---- Android (Capacitor) sources ----
ANDROID = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets")
os.makedirs(ANDROID, exist_ok=True)


def draw_padded(size: int, scale: float = 0.72) -> Image.Image:
    """Adaptive-icon safe: logo chhota, center me (mask crop se bachega)."""
    S = 1024
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    m = int(S * (1 - scale) / 2)
    d.rounded_rectangle([m, m, S - m, S - m], radius=int(110 * scale) + 40, fill=(24, 24, 27, 255))
    cx = cy = S // 2
    R = int(150 * scale)
    dy = 10
    d.ellipse([cx - R, cy - R + dy, cx + R, cy + R + dy], fill=(255, 255, 255, 255))
    b = int(30 * scale)
    off = int(110 * scale)
    tip = int(152 * scale)
    d.line([cx - off, cy - 150 * scale, cx - tip, cy - 192 * scale], fill=(245, 158, 11, 255), width=b, joint="curve")
    d.line([cx + off, cy - 150 * scale, cx + tip, cy - 192 * scale], fill=(245, 158, 11, 255), width=b, joint="curve")
    d.line([cx, cy + dy, cx, cy - 95 * scale + dy], fill=(24, 24, 27, 255), width=int(22 * scale))
    d.line([cx, cy + dy, cx + 68 * scale, cy + 52 * scale], fill=(24, 24, 27, 255), width=int(16 * scale))
    cr = int(20 * scale)
    d.ellipse([cx - cr, cy - cr + dy, cx + cr, cy + cr + dy], fill=(245, 158, 11, 255))
    return img.resize((size, size), Image.LANCZOS)


def draw_splash(size: int = 2732) -> Image.Image:
    img = Image.new("RGBA", (size, size), (30, 27, 75, 255))
    logo = draw_padded(1024, scale=0.9)
    img.alpha_composite(logo, ((size - 1024) // 2, (size - 1024) // 2))
    return img.convert("RGB")


draw_padded(1024).save(os.path.join(ANDROID, "icon.png"))
draw_padded(1024).save(os.path.join(ANDROID, "icon-foreground.png"))
Image.new("RGBA", (1024, 1024), (24, 24, 27, 255)).save(os.path.join(ANDROID, "icon-background.png"))
draw_splash().save(os.path.join(ANDROID, "splash.png"))
draw_splash(1280).save(os.path.join(ANDROID, "splash-dark.png"))
print("ANDROID-ASSETS-OK", ANDROID)
print("ICONS-OK", OUT)
