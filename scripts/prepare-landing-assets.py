from PIL import Image
from pathlib import Path
root = Path(".").resolve()

def crop_ratio(name, box, target, width, ratio):
    image = Image.open(root / "assets" / name).convert("RGB")
    l, t, r, b = box
    x0, y0, x1, y1 = round(image.width * l), round(image.height * t), round(image.width * r), round(image.height * b)
    w, h = x1 - x0, y1 - y0
    if w / h > ratio:
        new_w = round(h * ratio); x0 += (w - new_w) // 2; w = new_w
    else:
        new_h = round(w / ratio); y0 += (h - new_h) // 2; h = new_h
    piece = image.crop((x0, y0, x0 + w, y0 + h))
    out = root / "public" / "landing" / target
    piece.resize((width, round(width / ratio)), Image.LANCZOS).save(out, "JPEG", quality=84, optimize=True, progressive=True)
    print(f"{target:20} {width}x{round(width/ratio)} {(out.stat().st_size//1024):4} KB")

# Hero strip: the slug tray, tighter on the grid of characters.
crop_ratio("chinese-typewriter.jpg", (0.10, 0.34, 0.88, 0.90), "hero-typewriter.jpg", 1200, 16/9)
# The hero reel's centre frame: classroom, 16:10 so it reads at 0.94em tall.
crop_ratio("geography-class-in-the-affiliated-high-school.jpg", (0.03, 0.05, 0.97, 0.93), "hero-class.jpg", 1200, 16/10)
