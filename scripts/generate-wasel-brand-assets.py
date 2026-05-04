from __future__ import annotations

from base64 import b64encode
from io import BytesIO
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]

FULL_LOGO_SOURCE = ROOT / "src/assets/wasel-logo-source.png"
MARK_SOURCE = ROOT / "src/assets/wasel-mark-source.png"

WORDMARK_WIDTHS = (64, 96, 160, 280, 512)
ICON_TARGETS = (
    (16, ROOT / "public/favicon-16x16.png"),
    (32, ROOT / "public/favicon-32x32.png"),
    (180, ROOT / "public/apple-touch-icon.png"),
    (192, ROOT / "public/icon-192.png"),
    (512, ROOT / "public/icon-512.png"),
)


def ensure_parent(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def open_rgba(path: Path) -> Image.Image:
    if not path.exists():
        raise FileNotFoundError(f"Missing required logo source asset: {path}")
    return Image.open(path).convert("RGBA")


def trim_alpha(image: Image.Image) -> Image.Image:
    bbox = image.getbbox()
    return image.crop(bbox) if bbox else image


def resize_to_width(image: Image.Image, width: int) -> Image.Image:
    height = max(1, round(image.height * (width / image.width)))
    return image.resize((width, height), Image.Resampling.LANCZOS)


def contain_in_square(image: Image.Image, size: int, padding_ratio: float = 0.14) -> Image.Image:
    inner_size = max(1, round(size * (1 - (padding_ratio * 2))))
    scale = min(inner_size / image.width, inner_size / image.height)
    resized = image.resize(
        (
            max(1, round(image.width * scale)),
            max(1, round(image.height * scale)),
        ),
        Image.Resampling.LANCZOS,
    )
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    offset = ((size - resized.width) // 2, (size - resized.height) // 2)
    canvas.paste(resized, offset, resized)
    return canvas


def save_png(path: Path, image: Image.Image) -> None:
    ensure_parent(path)
    image.save(path)
    print(f"updated {path.relative_to(ROOT)}")


def save_ico(path: Path, base_icon: Image.Image) -> None:
    ensure_parent(path)
    base_icon.save(path, format="ICO", sizes=[(16, 16), (24, 24), (32, 32), (48, 48)])
    print(f"updated {path.relative_to(ROOT)}")


def save_favicon_svg(path: Path, image: Image.Image) -> None:
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    encoded = b64encode(buffer.getvalue()).decode("ascii")
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" fill="none">'
        '<image href="data:image/png;base64,{data}" width="{size}" height="{size}" />'
        "</svg>\n"
    ).format(size=image.width, data=encoded)
    ensure_parent(path)
    path.write_text(svg, encoding="utf-8")
    print(f"updated {path.relative_to(ROOT)}")


def main() -> None:
    full_logo = trim_alpha(open_rgba(FULL_LOGO_SOURCE))
    mark_logo = trim_alpha(open_rgba(MARK_SOURCE))

    save_png(ROOT / "src/assets/wasellogo.png", full_logo)
    save_png(ROOT / "public/brand/wasel-w-mark.png", mark_logo)

    for width in WORDMARK_WIDTHS:
        save_png(ROOT / f"public/brand/wasellogo-{width}.png", resize_to_width(full_logo, width))

    square_icons = {size: contain_in_square(mark_logo, size) for size, _ in ICON_TARGETS}

    for size, path in ICON_TARGETS:
        save_png(path, square_icons[size])

    save_ico(ROOT / "public/favicon.ico", square_icons[512])
    save_favicon_svg(ROOT / "public/favicon.svg", square_icons[192])


if __name__ == "__main__":
    main()
