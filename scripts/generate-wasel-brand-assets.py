from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]

MARK_COLOR = "#9CEEFF"
NODE_STROKE = "#ECFCFF"
NODE_FILL = "#F9FFFF"
WORD_COLOR = "#EEF8FF"

MARK_VIEWBOX = (64.0, 56.0)
WORDMARK_VIEWBOX = (224.0, 64.0)
WORDMARK_TEXT = "asel"
TRACKING_RATIO = -0.08

MARK_CURVES = (
    ((8.0, 10.0), (16.0, 41.0), (24.0, 10.0)),
    ((24.0, 10.0), (32.0, 49.0), (40.0, 10.0)),
    ((40.0, 10.0), (48.0, 41.0), (56.0, 10.0)),
)
MARK_NODES = ((8.0, 10.0), (24.0, 10.0), (40.0, 10.0), (56.0, 10.0))


def quadratic_points(
    start: tuple[float, float],
    control: tuple[float, float],
    end: tuple[float, float],
    steps: int = 48,
) -> list[tuple[float, float]]:
    points: list[tuple[float, float]] = []
    for index in range(steps + 1):
        t = index / steps
        inv = 1.0 - t
        x = (inv * inv * start[0]) + (2 * inv * t * control[0]) + (t * t * end[0])
        y = (inv * inv * start[1]) + (2 * inv * t * control[1]) + (t * t * end[1])
        points.append((x, y))
    return points


def pick_font_path() -> Path:
    candidates = (
        Path("C:/Windows/Fonts/ariblk.ttf"),
        Path("C:/Windows/Fonts/arialbd.ttf"),
        Path("C:/Windows/Fonts/Arial.ttf"),
    )
    for candidate in candidates:
        if candidate.exists():
            return candidate
    raise FileNotFoundError("Could not locate a usable system font for the Wasel wordmark.")


def ensure_parent(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def draw_mark(
    draw: ImageDraw.ImageDraw,
    x: float,
    y: float,
    width: float,
    height: float,
) -> None:
    scale = min(width / MARK_VIEWBOX[0], height / MARK_VIEWBOX[1])
    offset_x = x + (width - MARK_VIEWBOX[0] * scale) / 2
    offset_y = y + (height - MARK_VIEWBOX[1] * scale) / 2

    stroke_width = max(3, round(4.75 * scale))
    node_outline_width = max(1, round(1.7 * scale))
    outer_radius = 4.7 * scale
    inner_radius = 1.9 * scale

    for start, control, end in MARK_CURVES:
        points = quadratic_points(
            (offset_x + start[0] * scale, offset_y + start[1] * scale),
            (offset_x + control[0] * scale, offset_y + control[1] * scale),
            (offset_x + end[0] * scale, offset_y + end[1] * scale),
        )
        draw.line(points, fill=MARK_COLOR, width=stroke_width, joint="curve")

    for cx, cy in MARK_NODES:
        center_x = offset_x + cx * scale
        center_y = offset_y + cy * scale
        draw.ellipse(
            (
                center_x - outer_radius,
                center_y - outer_radius,
                center_x + outer_radius,
                center_y + outer_radius,
            ),
            outline=NODE_STROKE,
            width=node_outline_width,
        )
        draw.ellipse(
            (
                center_x - inner_radius,
                center_y - inner_radius,
                center_x + inner_radius,
                center_y + inner_radius,
            ),
            fill=NODE_FILL,
        )


def draw_tight_text(
    draw: ImageDraw.ImageDraw,
    origin_x: float,
    origin_y: float,
    font: ImageFont.FreeTypeFont,
) -> None:
    tracking = font.size * TRACKING_RATIO
    cursor_x = origin_x
    for character in WORDMARK_TEXT:
        bbox = draw.textbbox((0, 0), character, font=font)
        draw.text((cursor_x, origin_y - bbox[1]), character, font=font, fill=WORD_COLOR)
        cursor_x += (bbox[2] - bbox[0]) + tracking


def draw_wordmark(
    draw: ImageDraw.ImageDraw,
    x: float,
    y: float,
    width: float,
    height: float,
    font_path: Path,
) -> None:
    scale = min(width / WORDMARK_VIEWBOX[0], height / WORDMARK_VIEWBOX[1])
    offset_x = x + (width - WORDMARK_VIEWBOX[0] * scale) / 2
    offset_y = y + (height - WORDMARK_VIEWBOX[1] * scale) / 2

    draw_mark(draw, offset_x + 2 * scale, offset_y + 4 * scale, MARK_VIEWBOX[0] * scale, MARK_VIEWBOX[1] * scale)

    font_size = max(14, round(50 * scale))
    font = ImageFont.truetype(str(font_path), font_size)
    text_bbox = draw.textbbox((0, 0), WORDMARK_TEXT, font=font)
    text_height = text_bbox[3] - text_bbox[1]
    text_x = offset_x + 76 * scale
    text_y = offset_y + ((WORDMARK_VIEWBOX[1] * scale - text_height) / 2)
    draw_tight_text(draw, text_x, text_y, font)


def render_square_wordmark(target_size: int, font_path: Path) -> Image.Image:
    canvas_size = target_size * 4
    image = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    wordmark_width = canvas_size * 0.86
    wordmark_height = wordmark_width / (WORDMARK_VIEWBOX[0] / WORDMARK_VIEWBOX[1])
    offset_x = (canvas_size - wordmark_width) / 2
    offset_y = (canvas_size - wordmark_height) / 2
    draw_wordmark(draw, offset_x, offset_y, wordmark_width, wordmark_height, font_path)
    return image.resize((target_size, target_size), Image.Resampling.LANCZOS)


def render_square_mark(target_size: int) -> Image.Image:
    canvas_size = target_size * 4
    image = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    mark_size = canvas_size * 0.76
    offset_x = (canvas_size - mark_size) / 2
    offset_y = (canvas_size - mark_size) / 2
    draw_mark(draw, offset_x, offset_y, mark_size, mark_size)
    return image.resize((target_size, target_size), Image.Resampling.LANCZOS)


def render_source_wordmark(width: int, height: int, font_path: Path) -> Image.Image:
    scale = 2
    canvas = Image.new("RGBA", (width * scale, height * scale), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    wordmark_width = canvas.width * 0.84
    wordmark_height = wordmark_width / (WORDMARK_VIEWBOX[0] / WORDMARK_VIEWBOX[1])
    offset_x = (canvas.width - wordmark_width) / 2
    offset_y = (canvas.height - wordmark_height) / 2
    draw_wordmark(draw, offset_x, offset_y, wordmark_width, wordmark_height, font_path)
    return canvas.resize((width, height), Image.Resampling.LANCZOS)


def save_image(path: Path, image: Image.Image) -> None:
    ensure_parent(path)
    image.save(path)
    print(f"updated {path.relative_to(ROOT)}")


def main() -> None:
    font_path = pick_font_path()

    for size in (64, 96, 160, 280, 512):
        save_image(ROOT / f"public/brand/wasellogo-{size}.png", render_square_wordmark(size, font_path))

    for size, name in ((16, "favicon-16x16.png"), (32, "favicon-32x32.png"), (180, "apple-touch-icon.png"), (192, "icon-192.png"), (512, "icon-512.png")):
        save_image(ROOT / f"public/{name}", render_square_mark(size))

    save_image(ROOT / "src/assets/wasellogo.png", render_source_wordmark(1536, 1024, font_path))


if __name__ == "__main__":
    main()
