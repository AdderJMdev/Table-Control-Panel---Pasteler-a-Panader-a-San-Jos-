#!/usr/bin/env python3
"""
Genera los iconos PNG (192 y 512) de la PWA a partir del diseño original
(public/assets/icons/icon-192.svg) para máxima compatibilidad de
instalación en Chrome/Edge (los navegadores usan .png con preferencia).

Requiere: Pillow  ->  pip install pillow
"""
import os

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "public", "assets", "icons")

COLOR_BG = (30, 34, 43, 255)          # #1e222b fondo
COLOR_TABLE = (46, 125, 50, 255)      # #2E7D32 mesa
COLOR_TABLE_LIGHT = (76, 175, 80, 255)  # #4caf50 superficie
COLOR_LEG = (27, 94, 32, 255)         # #1b5e20 pata
COLOR_CUP = (255, 255, 255, 255)      # taza
COLOR_STEAM = (255, 183, 77, 255)     # #ffb74d vapor


def make_icon(size: int) -> Image.Image:
    """Dibuja el icono a `size` px (diseño original en una cuadrícula de 192)."""
    scale = size / 192.0

    def S(v):
        return round(v * scale)

    base = Image.new("RGBA", (size, size), COLOR_BG)

    # Recuadro interior decorativo (opacidad ~15% como en el SVG)
    inner = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ImageDraw.Draw(inner).rounded_rectangle(
        [S(24), S(24), S(168), S(168)], radius=S(24), fill=(46, 125, 50, 38)
    )
    base = Image.alpha_composite(base, inner)

    # Superficie de la mesa (elipse) con translucidez
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse(
        [S(41), S(97), S(151), S(133)], fill=(76, 175, 80, 102)
    )
    base = Image.alpha_composite(base, glow)

    d = ImageDraw.Draw(base)

    # Cuerpo de la mesa (trapezoide)
    d.polygon(
        [
            (S(48), S(95)), (S(96), S(78)), (S(144), S(95)),
            (S(138), S(108)), (S(96), S(92)), (S(54), S(108)),
        ],
        fill=COLOR_TABLE,
    )

    # Pata de la mesa
    d.rectangle([S(92), S(108), S(100), S(145)], fill=COLOR_LEG)

    # Taza (cuerpo redondeado)
    d.rounded_rectangle([S(80), S(62), S(112), S(92)], radius=S(10), fill=COLOR_CUP)

    # Asa de la taza (arco a la derecha)
    d.arc(
        [S(107), S(64), S(125), S(84)],
        start=295, end=65,
        fill=COLOR_CUP,
        width=max(2, S(3)),
    )

    # Vapor (3 arcos)
    vapor = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    dv = ImageDraw.Draw(vapor)
    for cx in (88, 96, 104):
        dv.arc(
            [S(cx - 4), S(28), S(cx + 4), S(48)],
            start=200, end=340,
            fill=COLOR_STEAM,
            width=max(2, round(2.5 * scale)),
        )
    return Image.alpha_composite(base, vapor)


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    for size in (512, 192):
        out = os.path.join(OUT_DIR, f"icon-{size}.png")
        make_icon(size).save(out, "PNG")
        print(f"Icono generado: {out} ({size}x{size})")


if __name__ == "__main__":
    main()