import json
import shutil
from pathlib import Path

from PIL import Image, ImageOps


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = PROJECT_ROOT / "assets" / "avatars"
OUTPUT_DIR = PROJECT_ROOT / "assets" / "avatars-processed"
MANIFEST_PATH = OUTPUT_DIR / "avatar-processing-manifest.json"

CROP_BOXES = {
    "andrey-zibnitskiy.jpg": (300, 330, 500, 530),
    "darina-pluzhnikova.jpg": (160, 35, 480, 355),
    "ella-vodopianova.jpg": (205, 45, 525, 365),
    "katerina-mazur.jpg": (250, 80, 610, 440),
    "konstantin-svizhak.jpg": (170, 115, 470, 415),
    "maria-bogatchenko.jpg": (170, 45, 510, 385),
    "ruslana-kozakova.jpg": (185, 80, 505, 400),
    "viktor-petrik.jpg": (195, 85, 535, 425),
    "vladislav-levkovich.jpg": (155, 45, 485, 375),
    "vladislav-rudenko.jpg": (170, 45, 510, 385),
}


def process_crop(source: Path, destination: Path, box: tuple[int, int, int, int]) -> None:
    image = ImageOps.exif_transpose(Image.open(source)).convert("RGB")
    cropped = image.crop(box)
    cropped = cropped.resize((640, 640), Image.Resampling.LANCZOS)
    cropped.save(destination, quality=95, optimize=True)


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    records = []

    for source in sorted(SOURCE_DIR.glob("*.jpg")):
        destination = OUTPUT_DIR / source.name
        box = CROP_BOXES.get(source.name)

        if box:
            process_crop(source, destination, box)
            operation = "crop_resize"
        else:
            shutil.copy2(source, destination)
            operation = "copy"

        records.append(
            {
                "file": source.name,
                "operation": operation,
                "cropBox": box,
            }
        )
        print(f"{source.name} -> {operation}")

    MANIFEST_PATH.write_text(
        json.dumps(records, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
