import Fuse from "fuse.js";
import type { Participant } from "@/lib/types";

type SearchableParticipant = Participant & {
  searchName: string;
  aliases: string[];
};

const cyrillicToLatin: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  ґ: "g",
  д: "d",
  е: "e",
  є: "ye",
  ё: "e",
  ж: "zh",
  з: "z",
  и: "i",
  і: "i",
  ї: "yi",
  й: "y",
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
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};

const ukrainianRussianPairs: Record<string, string[]> = {
  і: ["и"],
  и: ["і", "ы"],
  є: ["е"],
  е: ["є", "э"],
  ї: ["и"],
  ґ: ["г"],
  э: ["е"],
  ы: ["и"],
};

export function normalizeName(value: string) {
  return value
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function transliterate(value: string) {
  return normalizeName(value)
    .split("")
    .map((letter) => cyrillicToLatin[letter] ?? letter)
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

function swapLanguageLetters(value: string) {
  const normalized = normalizeName(value);
  const variants = new Set<string>([normalized]);

  for (const [source, replacements] of Object.entries(ukrainianRussianPairs)) {
    for (const replacement of replacements) {
      if (normalized.includes(source)) {
        variants.add(normalized.replaceAll(source, replacement));
      }
    }
  }

  return [...variants];
}

export function enrichParticipant(participant: Participant): SearchableParticipant {
  const displayName = normalizeName(participant.displayName);
  const reversedName = normalizeName(`${participant.lastName} ${participant.firstName}`);
  const latinName = transliterate(participant.displayName);
  const latinReversed = transliterate(`${participant.lastName} ${participant.firstName}`);
  const firstName = normalizeName(participant.firstName);
  const lastName = normalizeName(participant.lastName);

  const aliases = new Set([
    displayName,
    reversedName,
    latinName,
    latinReversed,
    transliterate(participant.firstName),
    transliterate(participant.lastName),
    participant.slug.replaceAll("-", " "),
    ...swapLanguageLetters(displayName),
    ...swapLanguageLetters(reversedName),
  ]);

  return {
    ...participant,
    searchName: `${displayName} ${latinName} ${firstName} ${lastName}`,
    aliases: [...aliases],
  };
}

export function searchParticipants(participants: Participant[], rawQuery: string) {
  const query = normalizeName(rawQuery);

  if (query.length < 2) {
    return [];
  }

  const enriched = participants.map(enrichParticipant);
  const fuse = new Fuse(enriched, {
    includeScore: true,
    ignoreLocation: true,
    threshold: 0.36,
    keys: [
      { name: "displayName", weight: 0.36 },
      { name: "searchName", weight: 0.28 },
      { name: "aliases", weight: 0.28 },
      { name: "slug", weight: 0.08 },
    ],
  });

  return fuse
    .search(query)
    .filter((result) => result.score === undefined || result.score < 0.58)
    .slice(0, 4)
    .map((result) => ({
      participant: result.item,
      score: result.score ?? 0,
    }));
}
