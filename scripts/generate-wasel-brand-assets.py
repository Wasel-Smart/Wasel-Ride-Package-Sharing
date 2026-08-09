"""Build Wasel's production brand package from the approved bilingual lockup.

The supplied artwork is deliberately treated as the source of truth.  This
script traces each flat-colour silhouette into SVG paths, then produces the
web, PWA, mobile, social and print derivatives from those masters.  It is
safe to rerun and avoids re-sampling a generic square image for unrelated
asset roles.
"""

from __future__ import annotations

import shutil
import subprocess
import sys
import os
import re
from collections import defaultdict
from pathlib import Path
from typing import Iterable
from urllib.parse import quote
from html import escape as html_escape

import numpy as np
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "brand" / "reference" / "wasel-bilingual-reference.png"
BRAND = ROOT / "public" / "brand"
ARTIFACTS = ROOT / "artifacts" / "brand"
MOBILE = ROOT / "mobile" / "assets" / "images"
CHROME = Path(os.environ.get("CHROME_PATH", r"C:\Program Files\Google\Chrome\Application\chrome.exe"))

NAVY = "#061B4B"
PEARL = "#F8FBFF"
BLACK = "#000000"
APP_BACKGROUND = "#06111F"


def rdp(points: list[tuple[float, float]], epsilon: float) -> list[tuple[float, float]]:
    """Ramer-Douglas-Peucker reduction for a closed contour opened at a stable point."""
    if len(points) < 3:
        return points
    first, last = points[0], points[-1]
    segment = np.array(last, dtype=float) - np.array(first, dtype=float)
    length = np.hypot(*segment)
    max_distance = -1.0
    index = 0
    for i, point in enumerate(points[1:-1], 1):
        delta = np.array(point, dtype=float) - np.array(first, dtype=float)
        distance = abs(float(np.cross(segment, delta))) / length if length else float(np.hypot(*delta))
        if distance > max_distance:
            max_distance, index = distance, i
    if max_distance > epsilon:
        return rdp(points[: index + 1], epsilon)[:-1] + rdp(points[index:], epsilon)
    return [first, last]


def trace_mask(mask: np.ndarray, epsilon: float = 1.0) -> str:  # Reduced epsilon for more detail
    """Turn a boolean bitmap into crisp, simplified SVG paths with even-odd holes."""
    height, width = mask.shape
    outgoing: dict[tuple[int, int], list[tuple[int, int]]] = defaultdict(list)

    for y in range(height):
        row = mask[y]
        for x in np.flatnonzero(row):
            if y == 0 or not mask[y - 1, x]:
                outgoing[(x, y)].append((x + 1, y))
            if x == width - 1 or not mask[y, x + 1]:
                outgoing[(x + 1, y)].append((x + 1, y + 1))
            if y == height - 1 or not mask[y + 1, x]:
                outgoing[(x + 1, y + 1)].append((x, y + 1))
            if x == 0 or not mask[y, x - 1]:
                outgoing[(x, y + 1)].append((x, y))

    loops: list[list[tuple[int, int]]] = []
    while outgoing:
        start = next(iter(outgoing))
        current = start
        loop = [start]
        while True:
            candidates = outgoing.get(current)
            if not candidates:
                break
            nxt = candidates.pop()
            if not candidates:
                outgoing.pop(current, None)
            current = nxt
            if current == start:
                break
            loop.append(current)
        if len(loop) > 5 and current == start:
            # Break at the lowest-left point so closing simplification does not
            # cut a curved edge through a glyph.
            pivot = min(range(len(loop)), key=lambda i: (loop[i][1], loop[i][0]))
            ordered = loop[pivot:] + loop[:pivot] + [loop[pivot]]
            simplified = rdp([(float(x), float(y)) for x, y in ordered], epsilon)
            if len(simplified) > 3:
                loops.append([(round(x, 2), round(y, 2)) for x, y in simplified[:-1]])

    commands: list[str] = []
    for loop in loops:
        commands.append("M " + " L ".join(f"{x:g} {y:g}" for x, y in loop) + " Z")
    return " ".join(commands)


def svg_document(view_box: tuple[int, int, int, int], body: str, title: str) -> str:
    x, y, width, height = view_box
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x} {y} {width} {height}" role="img" aria-labelledby="title desc">
  <title id="title">{html_escape(title)}</title>
  <desc id="desc">Wasel bilingual mobility logo: Arabic and English wordmarks around the interlocking blue, orange, and green route mark.</desc>
  <defs>
    <linearGradient id="blue" x1="0" y1="0" x2="0.72" y2="1"><stop stop-color="#0A72EE"/><stop offset="1" stop-color="#05B9ED"/></linearGradient>
    <linearGradient id="orange" x1="0.25" y1="0" x2="0.7" y2="1"><stop stop-color="#FF7300"/><stop offset="1" stop-color="#FF9F06"/></linearGradient>
    <linearGradient id="green" x1="0.35" y1="0" x2="0.75" y2="1"><stop stop-color="#18C80B"/><stop offset="1" stop-color="#21D809"/></linearGradient>
  </defs>
  {body}
</svg>'''


def html_for_svg(svg_path: Path, width: int, height: int, background: str = "transparent") -> str:
    url = svg_path.resolve().as_uri()
    safe_bg = re.sub(r'[^a-zA-Z0-9#().,%/" ]', '', background) if background != "transparent" else "transparent"
    return f'''<!doctype html><html><head><meta charset="utf-8"><style>
      html,body{{margin:0;width:{width}px;height:{height}px;background:{safe_bg};overflow:hidden}}
      img{{display:block;width:{width}px;height:{height}px}}
    </style></head><body><img src="{url}" alt=""></body></html>'''


def chrome_screenshot(svg_path: Path, output: Path, width: int, height: int, background: str = "transparent") -> None:
    if not isinstance(width, int) or not isinstance(height, int) or width <= 0 or height <= 0:
        raise ValueError("Invalid dimensions for screenshot")
    temp = ROOT / "tmp" / "brand-render.html"
    temp.parent.mkdir(parents=True, exist_ok=True)
    temp.write_text(html_for_svg(svg_path, width, height, background), encoding="utf-8")
    command = [
        str(CHROME), "--headless=new", "--disable-gpu", "--hide-scrollbars",
        "--default-background-color=00000000", f"--window-size={width},{height}",
        f"--screenshot={output}", temp.resolve().as_uri(),
    ]
    subprocess.run(command, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    with Image.open(output) as img:
        img.convert("RGBA").save(output, "PNG", optimize=True)


def chrome_pdf(svg_path: Path, output: Path, width: int, height: int) -> None:
    if not isinstance(width, int) or not isinstance(height, int) or width <= 0 or height <= 0:
        raise ValueError("Invalid dimensions for PDF")
    temp = ROOT / "tmp" / "wasel-print.html"
    temp.parent.mkdir(parents=True, exist_ok=True)
    svg = svg_path.read_text(encoding="utf-8")
    temp.write_text(
        f'''<!doctype html><html><head><meta charset="utf-8"><style>
          @page {{ size: 297mm 210mm; margin: 0; }}
          html,body{{margin:0;width:297mm;height:210mm;display:grid;place-items:center;background:#fff}}
          svg{{width:250mm;height:auto;max-height:150mm}}
        </style></head><body>{svg}</body></html>''',
        encoding="utf-8",
    )
    command = [
        str(CHROME), "--headless=new", "--disable-gpu", "--no-pdf-header-footer",
        f"--print-to-pdf={output}", temp.resolve().as_uri(),
    ]
    subprocess.run(command, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)


def write_svg(name: str, content: str) -> Path:
    path = BRAND / name
    path.write_text(content, encoding="utf-8")
    return path


def existing_svg_size(path: Path, width: int) -> tuple[int, int]:
    """Return a proportional PNG size from an already generated SVG master."""
    match = re.search(r'viewBox="[^" ]+ [^" ]+ ([^" ]+) ([^" ]+)"', path.read_text(encoding="utf-8"))
    if not match:
        raise ValueError(f"Could not read viewBox from {path}")
    view_width, view_height = map(float, match.groups())
    return width, round(width * view_height / view_width)


def render_existing_masters() -> None:
    """Render a selected range without re-tracing the source in constrained CI."""
    jobs = [
        (BRAND / "wasel-logo.svg", BRAND / "wasel-logo.png", *existing_svg_size(BRAND / "wasel-logo.svg", 4096)),
        (BRAND / "wasel-logo.svg", BRAND / "wasel-logo-light.png", *existing_svg_size(BRAND / "wasel-logo.svg", 4096)),
        (BRAND / "wasel-logo-dark.svg", BRAND / "wasel-logo-dark.png", *existing_svg_size(BRAND / "wasel-logo-dark.svg", 4096)),
        (BRAND / "wasel-symbol.svg", BRAND / "wasel-symbol.png", *existing_svg_size(BRAND / "wasel-symbol.svg", 2048)),
        (BRAND / "wasel-symbol.svg", BRAND / "wasel-w-mark.png", *existing_svg_size(BRAND / "wasel-symbol.svg", 2048)),
        (BRAND / "wasel-social-dark.svg", BRAND / "wasel-og.png", 1200, 630),
        (BRAND / "wasel-social-dark.svg", BRAND / "wasel-social-dark.png", 1200, 630),
        (BRAND / "wasel-app-icon.svg", BRAND / "wasel-app-icon.png", 1024, 1024),
    ]
    start = int(os.environ.get("WASEL_PNG_START", "0"))
    end = int(os.environ.get("WASEL_PNG_END", str(len(jobs))))
    for svg, output, width, height in jobs[start:end]:
        chrome_screenshot(svg, output, width, height)
    print(f"Rendered existing Wasel raster jobs {start}:{end}.")


def finish_from_existing_rasters() -> None:
    """Create platform-specific derivatives from a validated app-icon raster."""
    BRAND.mkdir(parents=True, exist_ok=True)
    MOBILE.mkdir(parents=True, exist_ok=True)
    app_icon_png = BRAND / "wasel-app-icon.png"
    if not app_icon_png.exists():
        raise FileNotFoundError(f"Render {app_icon_png.name} before creating platform derivatives.")
    for destination, size in [
        (BRAND / "wasellogo-64.png", 64), (BRAND / "wasellogo-96.png", 96),
        (BRAND / "wasellogo-160.png", 160), (BRAND / "wasellogo-280.png", 280),
        (BRAND / "wasellogo-512.png", 512), (ROOT / "public" / "favicon-16x16.png", 16),
        (ROOT / "public" / "favicon-32x32.png", 32), (ROOT / "public" / "apple-touch-icon.png", 180),
        (ROOT / "public" / "icon-192.png", 192), (ROOT / "public" / "icon-512.png", 512),
        (ROOT / "public" / "icon-maskable-192.png", 192), (ROOT / "public" / "icon-maskable-512.png", 512),
        (MOBILE / "icon.png", 1024), (MOBILE / "adaptive-icon.png", 1024), (MOBILE / "favicon.png", 48),
    ]:
        with Image.open(app_icon_png) as _src:
            icon = _src.convert("RGBA").resize((size, size), Image.Resampling.LANCZOS)
        destination.parent.mkdir(parents=True, exist_ok=True)
        icon.save(destination, "PNG", optimize=True)
    with Image.open(app_icon_png) as _src:
        _src.convert("RGBA").save(
            ROOT / "public" / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48)]
        )

    # Native notification icons are white-only, with the master mark's alpha.
    with Image.open(BRAND / "wasel-symbol.png") as mark_src:
        mark = mark_src.convert("RGBA")
    notification = Image.new("RGBA", mark.size, PEARL)
    notification.putalpha(mark.getchannel("A"))
    notification.resize((96, 96), Image.Resampling.LANCZOS).save(MOBILE / "notification-icon.png", "PNG", optimize=True)

    splash = Image.new("RGBA", (1284, 2778), APP_BACKGROUND)
    with Image.open(BRAND / "wasel-logo-dark.png") as _src:
        logo = _src.convert("RGBA")
    logo.thumbnail((1080, 410), Image.Resampling.LANCZOS)  # Larger splash screen logo
    splash.alpha_composite(logo, ((splash.width - logo.width) // 2, 1030))
    splash.save(MOBILE / "splash.png", "PNG", optimize=True)

    for density, size in {"mipmap-mdpi": 48, "mipmap-hdpi": 72, "mipmap-xhdpi": 96, "mipmap-xxhdpi": 144, "mipmap-xxxhdpi": 192}.items():
        folder = ROOT / "mobile" / "android" / "app" / "src" / "main" / "res" / density
        folder.mkdir(parents=True, exist_ok=True)
        with Image.open(app_icon_png) as _src:
            rendered = _src.convert("RGBA").resize((size, size), Image.Resampling.LANCZOS)
        for filename in ("ic_launcher.png", "ic_launcher_round.png", "ic_launcher_foreground.png"):
            rendered.save(folder / filename, "PNG", optimize=True)
    shutil.copy2(SOURCE, ROOT / "src" / "assets" / "wasel-logo-source.png")
    print("Created Wasel web, PWA, Android, and Expo brand derivatives.")


def package_existing_assets() -> None:
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    for source in list(BRAND.glob("wasel-*.svg")) + list(BRAND.glob("wasel-*.png")) + [BRAND / "favicon.svg"]:
        shutil.copy2(source, ARTIFACTS / source.name)
    for source in [ROOT / "public" / "favicon.ico", ROOT / "public" / "icon-192.png", ROOT / "public" / "icon-512.png", ROOT / "public" / "icon-maskable-192.png", ROOT / "public" / "icon-maskable-512.png"]:
        shutil.copy2(source, ARTIFACTS / source.name)
    print("Packaged Wasel production brand artifacts.")


def app_icon_svg(symbol: str, symbol_box: tuple[int, int, int, int]) -> str:
    x, y, width, height = symbol_box
    scale = 720 / max(width, height)  # Increased scale for a more prominent app icon
    offset_x = 512 - (x + width / 2) * scale
    offset_y = 512 - (y + height / 2) * scale
    return svg_document(
        (0, 0, 1024, 1024),
        f'''<rect width="1024" height="1024" rx="230" fill="{APP_BACKGROUND}"/>
        <rect x="1" y="1" width="1022" height="1022" rx="229" fill="none" stroke="#2A537E" stroke-opacity=".42" stroke-width="2"/>
        <g transform="translate({offset_x:.2f} {offset_y:.2f}) scale({scale:.6f})">{symbol}</g>''',
        "Wasel app icon",
    )


def main() -> None:
    if os.environ.get("WASEL_RENDER_EXISTING") == "1":
        render_existing_masters()
        return
    if os.environ.get("WASEL_FINISH_EXISTING") == "1":
        finish_from_existing_rasters()
        return
    if os.environ.get("WASEL_PACKAGE_EXISTING") == "1":
        package_existing_assets()
        return
    if os.environ.get("WASEL_PRINT_EXISTING") == "1":
        print_dir = ARTIFACTS / "print"
        print_dir.mkdir(parents=True, exist_ok=True)
        chrome_pdf(BRAND / "wasel-logo.svg", print_dir / "wasel-logo-primary.pdf", 4096, 1024)
        print("Created Wasel vector print PDF.")
        return
    if not SOURCE.exists():
        raise FileNotFoundError(f"Approved source artwork is missing: {SOURCE}")
    if not CHROME.exists():
        raise FileNotFoundError("Google Chrome is required to rasterize the SVG brand masters.")

    BRAND.mkdir(parents=True, exist_ok=True)
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    MOBILE.mkdir(parents=True, exist_ok=True)

    with Image.open(SOURCE) as src_img:
        image = src_img.convert("RGB")
    pixels = np.asarray(image)
    red, green, blue = (pixels[:, :, channel].astype(np.int16) for channel in range(3))
    value = np.maximum(np.maximum(red, green), blue)

    # The four masks match the approved raster's visible solid-colour shapes.
    # Thresholding away the near-white canvas removes compression halos before tracing.
    navy_mask = (value < 145) & (blue > red + 13) & (blue > green + 12)
    blue_mask = (blue > 130) & (blue > red + 48) & (blue > green + 18)
    orange_mask = (red > 135) & (red > green + 42) & (green > blue + 18)
    green_mask = (green > 105) & (green > red + 34) & (green > blue + 34)
    combined = navy_mask | blue_mask | orange_mask | green_mask
    ys, xs = np.where(combined)
    if len(xs) == 0:
        raise RuntimeError("No logo pixels were found in the approved source artwork.")
    margin = 12  # Reduced margin to make logo appear larger in its viewbox
    x0, y0 = max(0, int(xs.min()) - margin), max(0, int(ys.min()) - margin)
    x1, y1 = min(image.width, int(xs.max()) + margin), min(image.height, int(ys.max()) + margin)
    master_box = (x0, y0, x1 - x0, y1 - y0)

    navy = trace_mask(navy_mask)
    blue_path = trace_mask(blue_mask)
    orange_path = trace_mask(orange_mask)
    green_path = trace_mask(green_mask)
    symbol_box = (int(xs[~navy_mask[ys, xs]].min()) - margin, int(ys[~navy_mask[ys, xs]].min()) - margin, 0, 0)
    symbol_pixels = blue_mask | orange_mask | green_mask
    sy, sx = np.where(symbol_pixels)
    symbol_box = (max(0, int(sx.min()) - margin), max(0, int(sy.min()) - margin), min(image.width, int(sx.max()) + margin) - max(0, int(sx.min()) - margin), min(image.height, int(sy.max()) + margin) - max(0, int(sy.min()) - margin))

    symbol_body = f'''<path fill="url(#blue)" fill-rule="evenodd" d="{blue_path}"/>
      <path fill="url(#orange)" fill-rule="evenodd" d="{orange_path}"/>
      <path fill="url(#green)" fill-rule="evenodd" d="{green_path}"/>'''
    # Stack in the approved visual order so overlaps retain their intended hierarchy.
    full_light_body = f'''<path fill="{NAVY}" fill-rule="evenodd" d="{navy}"/>{symbol_body}'''
    full_dark_body = f'''<path fill="{PEARL}" fill-rule="evenodd" d="{navy}"/>{symbol_body}'''
    full_black_body = f'''<path fill="{BLACK}" fill-rule="evenodd" d="{navy} {blue_path} {orange_path} {green_path}"/>'''
    full_white_body = f'''<path fill="{PEARL}" fill-rule="evenodd" d="{navy} {blue_path} {orange_path} {green_path}"/>'''

    primary_svg = write_svg("wasel-logo.svg", svg_document(master_box, full_light_body, "Wasel | bilingual logo"))
    write_svg("wasel-logo-light.svg", svg_document(master_box, full_light_body, "Wasel | light-mode logo"))
    dark_svg = write_svg("wasel-logo-dark.svg", svg_document(master_box, full_dark_body, "Wasel | dark-mode logo"))
    write_svg("wasel-logo-monochrome.svg", svg_document(master_box, full_light_body.replace(symbol_body, f'<path fill="{NAVY}" fill-rule="evenodd" d="{blue_path} {orange_path} {green_path}"/>'), "Wasel | monochrome logo"))
    write_svg("wasel-logo-black.svg", svg_document(master_box, full_black_body, "Wasel | black logo"))
    write_svg("wasel-logo-white.svg", svg_document(master_box, full_white_body, "Wasel | white logo"))
    symbol_svg = write_svg("wasel-symbol.svg", svg_document(symbol_box, symbol_body, "Wasel route mark"))
    white_symbol_svg = write_svg("wasel-symbol-white.svg", svg_document(symbol_box, f'<path fill="{PEARL}" fill-rule="evenodd" d="{blue_path} {orange_path} {green_path}"/>', "Wasel white route mark"))

    icon_svg = write_svg("wasel-app-icon.svg", app_icon_svg(symbol_body, symbol_box))
    write_svg("wasel-app-icon-white.svg", app_icon_svg(f'<path fill="{PEARL}" fill-rule="evenodd" d="{blue_path} {orange_path} {green_path}"/>', symbol_box))
    write_svg("favicon.svg", svg_document(symbol_box, symbol_body, "Wasel favicon"))

    # A complete, contrast-checked social card—not a square logo stretched into a preview.
    scale = 980 / master_box[2]
    social_body = f'''<rect width="1200" height="630" fill="{APP_BACKGROUND}"/>
      <circle cx="104" cy="112" r="240" fill="#0879F3" opacity=".10"/>
      <circle cx="1090" cy="555" r="280" fill="#22D00A" opacity=".08"/>
      <g transform="translate({(1200 - master_box[2] * scale) / 2 - master_box[0] * scale:.2f} {315 - (master_box[1] + master_box[3] / 2) * scale:.2f}) scale({scale:.6f})">{full_dark_body}</g>'''
    social_svg = write_svg("wasel-social-dark.svg", svg_document((0, 0, 1200, 630), social_body, "Wasel social sharing card"))

    # Master raster exports.
    png_jobs = [
        (primary_svg, BRAND / "wasel-logo.png", 4096, round(4096 * master_box[3] / master_box[2])),
        (primary_svg, BRAND / "wasel-logo-light.png", 4096, round(4096 * master_box[3] / master_box[2])),
        (dark_svg, BRAND / "wasel-logo-dark.png", 4096, round(4096 * master_box[3] / master_box[2])),
        (symbol_svg, BRAND / "wasel-symbol.png", 2048, round(2048 * symbol_box[3] / symbol_box[2])),
        (symbol_svg, BRAND / "wasel-w-mark.png", 2048, round(2048 * symbol_box[3] / symbol_box[2])),
        (social_svg, BRAND / "wasel-og.png", 1200, 630),
        (social_svg, BRAND / "wasel-social-dark.png", 1200, 630),
        (icon_svg, BRAND / "wasel-app-icon.png", 1024, 1024),
    ]
    # Rendering each SVG in its own Chrome process is intentionally robust on
    # Windows. The range controls make a CI runner able to split that work
    # without producing different assets.
    png_start = int(os.environ.get("WASEL_PNG_START", "0"))
    png_end = int(os.environ.get("WASEL_PNG_END", str(len(png_jobs))))
    if os.environ.get("WASEL_PNG_ONLY") == "1":
        for svg, output, width, height in png_jobs[png_start:png_end]:
            chrome_screenshot(svg, output, width, height)
        print(f"Rendered Wasel raster jobs {png_start}:{png_end}.")
        return
    if os.environ.get("WASEL_SKIP_RASTER") != "1":
        for svg, output, width, height in png_jobs:
            chrome_screenshot(svg, output, width, height)

    # Favicon, browser, PWA, and mobile icons are all based on a safe-area app tile.
    app_icon_png = BRAND / "wasel-app-icon.png"
    for destination, size in [
        (BRAND / "wasellogo-64.png", 64), (BRAND / "wasellogo-96.png", 96),
        (BRAND / "wasellogo-160.png", 160), (BRAND / "wasellogo-280.png", 280),
        (BRAND / "wasellogo-512.png", 512), (ROOT / "public" / "favicon-16x16.png", 16),
        (ROOT / "public" / "favicon-32x32.png", 32), (ROOT / "public" / "apple-touch-icon.png", 180),
        (ROOT / "public" / "icon-192.png", 192), (ROOT / "public" / "icon-512.png", 512),
        (ROOT / "public" / "icon-maskable-192.png", 192), (ROOT / "public" / "icon-maskable-512.png", 512),
        (MOBILE / "icon.png", 1024), (MOBILE / "adaptive-icon.png", 1024), (MOBILE / "favicon.png", 48),
    ]:
        with Image.open(app_icon_png) as _src:
            icon = _src.convert("RGBA").resize((size, size), Image.Resampling.LANCZOS)
        destination.parent.mkdir(parents=True, exist_ok=True)
        icon.save(destination, "PNG", optimize=True)
    with Image.open(app_icon_png) as _src:
        favicon = _src.convert("RGBA")
        favicon.save(ROOT / "public" / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])

    # Native notification icons must be monochrome and transparent.
    notification = Image.new("RGBA", (96, 96), (0, 0, 0, 0))
    chrome_screenshot(white_symbol_svg, ROOT / "tmp" / "wasel-notification.png", 96, 96)
    with Image.open(ROOT / "tmp" / "wasel-notification.png") as _src:
        notification = _src.convert("RGBA")
    notification.save(MOBILE / "notification-icon.png", "PNG", optimize=True)

    # Expo / Android splash: dark surface + the approved dark-mode lockup.
    splash = Image.new("RGBA", (1284, 2778), APP_BACKGROUND)
    with Image.open(BRAND / "wasel-logo-dark.png") as _src:
        logo = _src.convert("RGBA")
    logo.thumbnail((1080, 410), Image.Resampling.LANCZOS)  # Larger splash screen logo
    splash.alpha_composite(logo, ((splash.width - logo.width) // 2, 1030))
    splash.save(MOBILE / "splash.png", "PNG", optimize=True)

    for density, size in {"mipmap-mdpi": 48, "mipmap-hdpi": 72, "mipmap-xhdpi": 96, "mipmap-xxhdpi": 144, "mipmap-xxxhdpi": 192}.items():
        folder = ROOT / "mobile" / "android" / "app" / "src" / "main" / "res" / density
        folder.mkdir(parents=True, exist_ok=True)
        with Image.open(app_icon_png) as _src:
            rendered = _src.convert("RGBA").resize((size, size), Image.Resampling.LANCZOS)
        for filename in ("ic_launcher.png", "ic_launcher_round.png", "ic_launcher_foreground.png"):
            rendered.save(folder / filename, "PNG", optimize=True)

    # Keep the existing source asset path from carrying a legacy logo.
    shutil.copy2(SOURCE, ROOT / "src" / "assets" / "wasel-logo-source.png")

    print_dir = ARTIFACTS / "print"
    print_dir.mkdir(parents=True, exist_ok=True)
    chrome_pdf(primary_svg, print_dir / "wasel-logo-primary.pdf", 297, 210)
    print("Created Wasel vector print PDF.")

    package_existing_assets()
    print("\nAll brand assets generated and packaged successfully.")


if __name__ == "__main__":
    try:
        main()
    except (FileNotFoundError, ValueError, RuntimeError) as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)