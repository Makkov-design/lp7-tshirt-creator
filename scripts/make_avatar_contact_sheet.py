import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


PROJECT_ROOT = Path(__file__).resolve().parents[1]

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", default=str(PROJECT_ROOT / "assets" / "avatars"))
    parser.add_argument("--output", default=str(PROJECT_ROOT / "assets" / "avatars-contact-sheet.jpg"))
    args = parser.parse_args()

    source_dir = Path(args.source)
    output_path = Path(args.output)

    files = sorted(source_dir.glob("*.jpg"))
    thumb = 180
    label_h = 42
    cols = 6
    rows = (len(files) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * thumb, rows * (thumb + label_h)), "white")
    draw = ImageDraw.Draw(sheet)

    try:
        font = ImageFont.truetype("arial.ttf", 12)
    except OSError:
        font = ImageFont.load_default()

    for index, path in enumerate(files):
        image = Image.open(path).convert("RGB")
        image.thumbnail((thumb, thumb), Image.Resampling.LANCZOS)

        x = (index % cols) * thumb
        y = (index // cols) * (thumb + label_h)
        sheet.paste(image, (x + (thumb - image.width) // 2, y + (thumb - image.height) // 2))

        label = path.stem
        lines = [label[i : i + 22] for i in range(0, len(label), 22)][:2]
        for line_index, line in enumerate(lines):
            draw.text((x + 4, y + thumb + 4 + line_index * 15), line, fill="black", font=font)

    sheet.save(output_path, quality=92)
    print(output_path)


if __name__ == "__main__":
    main()
