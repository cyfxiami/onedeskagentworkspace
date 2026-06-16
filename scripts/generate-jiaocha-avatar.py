"""Export cross-verify assistant avatar as downloadable PNG (emoji on blue circle)."""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

OUTPUT_SIZE = 128
RENDER_SCALE = 8
RENDER_SIZE = OUTPUT_SIZE * RENDER_SCALE
OUTPUT = Path(__file__).resolve().parent.parent / "images" / "jiaocha-assistant-avatar.png"
EMOJI = "\U0001F50D"
FONT_CANDIDATES = [
    Path(r"C:\Windows\Fonts\seguiemj.ttf"),
    Path(r"C:\Windows\Fonts\Segoe UI Emoji.ttf"),
]

COLOR_TOP = (0x60, 0xA5, 0xFA)
COLOR_BOTTOM = (0x3B, 0x82, 0xF6)


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def circle_alpha(dist: float, radius: float, feather: float) -> int:
    if dist <= radius - feather:
        return 255
    if dist >= radius + feather:
        return 0
    return int(255 * (radius + feather - dist) / (2 * feather))


def make_blue_circle(size: int, feather: float) -> Image.Image:
    """Gradient fill with per-pixel alpha; edge RGB matches interior blue."""
    cx = cy = (size - 1) / 2.0
    radius = size / 2.0
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    px = img.load()

    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * (size - 1))
            r = int(lerp(COLOR_TOP[0], COLOR_BOTTOM[0], t))
            g = int(lerp(COLOR_TOP[1], COLOR_BOTTOM[1], t))
            b = int(lerp(COLOR_TOP[2], COLOR_BOTTOM[2], t))
            alpha = circle_alpha(math.hypot(x - cx, y - cy), radius, feather)
            px[x, y] = (r, g, b, alpha)

    return img


def load_emoji_font(size: int) -> ImageFont.FreeTypeFont:
    for path in FONT_CANDIDATES:
        if path.exists():
            return ImageFont.truetype(str(path), size=size)
    raise FileNotFoundError("No emoji font found on this system")


def draw_emoji_centered(base: Image.Image, emoji: str, font_size: int) -> Image.Image:
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    font = load_emoji_font(font_size)

    bbox = draw.textbbox((0, 0), emoji, font=font, embedded_color=True)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (base.width - tw) // 2 - bbox[0]
    y = (base.height - th) // 2 - bbox[1] - int(base.height * 0.02)
    draw.text((x, y), emoji, font=font, embedded_color=True)

    out = base.copy()
    out.alpha_composite(layer)
    return out


def premultiply_rgba(img: Image.Image) -> Image.Image:
    img = img.convert("RGBA")
    px = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = px[x, y]
            if a == 0:
                px[x, y] = (0, 0, 0, 0)
                continue
            f = a / 255.0
            px[x, y] = (int(r * f + 0.5), int(g * f + 0.5), int(b * f + 0.5), a)
    return img


def unpremultiply_rgba(img: Image.Image) -> Image.Image:
    img = img.convert("RGBA")
    px = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = px[x, y]
            if a == 0:
                px[x, y] = (0, 0, 0, 0)
                continue
            f = 255.0 / a
            px[x, y] = (
                min(255, int(r * f + 0.5)),
                min(255, int(g * f + 0.5)),
                min(255, int(b * f + 0.5)),
                a,
            )
    return img


def downscale_rgba(img: Image.Image, size: int) -> Image.Image:
    premultiplied = premultiply_rgba(img)
    scaled = premultiplied.resize((size, size), Image.Resampling.LANCZOS)
    return unpremultiply_rgba(scaled)


def render_avatar(size: int) -> Image.Image:
    feather = max(1.0, RENDER_SCALE * 1.25)
    base = make_blue_circle(size, feather)
    return draw_emoji_centered(base, EMOJI, int(size * 0.46))


def main() -> None:
    hi_res = render_avatar(RENDER_SIZE)
    avatar = downscale_rgba(hi_res, OUTPUT_SIZE)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    avatar.save(OUTPUT, format="PNG", optimize=True)
    print(f"Saved: {OUTPUT} ({avatar.size[0]}x{avatar.size[1]})")


if __name__ == "__main__":
    main()
