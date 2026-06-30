import fs from "node:fs";
import path from "node:path";
import backNameVariants from "../data/back-name-variants.json" with { type: "json" };
import participants from "../data/participants.json" with { type: "json" };

const outputRoot = path.join(process.cwd(), "public", "assets", "generated", "back-names");

const translitMap = {
  а: "a",
  б: "b",
  в: "v",
  г: "h",
  ґ: "g",
  д: "d",
  е: "e",
  ё: "yo",
  є: "ye",
  ж: "zh",
  з: "z",
  и: "y",
  і: "i",
  ї: "yi",
  й: "i",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "kh",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "shch",
  ь: "",
  ы: "y",
  ъ: "",
  э: "e",
  ю: "yu",
  я: "ya",
};

function transliterate(value) {
  return value
    .split("")
    .map((char) => {
      const lower = char.toLowerCase();
      const next = translitMap[lower] ?? char;
      return char === lower ? next : next.charAt(0).toUpperCase() + next.slice(1);
    })
    .join("");
}

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}

function textFor(participant, language) {
  const name = `${participant.firstName} ${participant.lastName}`;
  const variants = backNameVariants[participant.slug] ?? {};

  if (language === "en") {
    return transliterate(name);
  }

  if (language === "ua" && variants.UA) {
    return variants.UA;
  }

  if (language === "ru" && variants.RU) {
    return variants.RU;
  }

  return name;
}

function svgFor(text) {
  const [first, ...rest] = text.split(" ");
  const last = rest.join(" ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="460" height="320" viewBox="0 0 460 320" role="img" aria-label="${escapeXml(text)}">
  <defs>
    <filter id="ink" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="0.95" numOctaves="1" seed="7" result="noise"/>
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.25" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
  </defs>
  <rect width="460" height="320" fill="none"/>
  <g transform="translate(230 160) rotate(-8)" filter="url(#ink)">
    <text x="0" y="-18" text-anchor="middle"
      font-family="Segoe Script, Brush Script MT, Snell Roundhand, cursive"
      font-size="${first.length > 9 ? 58 : 66}"
      font-style="italic"
      fill="#d49a4d">${escapeXml(first)}</text>
    <text x="0" y="62" text-anchor="middle"
      font-family="Segoe Script, Brush Script MT, Snell Roundhand, cursive"
      font-size="${last.length > 12 ? 52 : 60}"
      font-style="italic"
      fill="#d49a4d">${escapeXml(last)}</text>
  </g>
</svg>`;
}

fs.mkdirSync(outputRoot, { recursive: true });

for (const participant of participants) {
  const participantDir = path.join(outputRoot, participant.slug);
  fs.mkdirSync(participantDir, { recursive: true });

  for (const language of ["ru", "ua", "en"]) {
    const svg = svgFor(textFor(participant, language));
    fs.writeFileSync(path.join(participantDir, `${language}.svg`), svg);
  }
}

console.log(`Generated ${participants.length * 3} back-name SVG files in ${outputRoot}`);
