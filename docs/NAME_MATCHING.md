# Name Matching Plan

## Goal

The participant can type their name in Russian, Ukrainian, English transliteration, or with a small typo. The app should still identify the likely participant and ask for visual confirmation with a photo or placeholder.

## Recommended Approach

Use a two-layer matcher:

1. Deterministic normalization.
2. Fuzzy ranking with Fuse.js.

Fuse.js is a good fit because the dataset has only 29 records, and the official docs describe it as a lightweight zero-dependency fuzzy-search library for client-side and Node.js use.

Source: https://www.fusejs.io/

## Normalization

Normalize both the user query and participant records:

- lowercase;
- trim spaces;
- collapse repeated spaces;
- remove punctuation;
- replace `ё` with `е`;
- normalize Ukrainian/Russian variants where helpful;
- generate Latin transliteration aliases.

Examples:

```text
Андрій Препелиця -> андрій препелиця
Андрій Препелиця -> andriy prepelitsya
Євген Гончаров -> євген гончаров
Євген Гончаров -> yevhen goncharov
Виталий Кордин -> vitaliy kordin
```

## Search Keys

Each participant should expose these keys to Fuse.js:

- `displayName`
- `firstName`
- `lastName`
- `searchName`
- `aliases`
- `slug`

Suggested Fuse.js options:

```ts
const options = {
  includeScore: true,
  threshold: 0.35,
  ignoreLocation: true,
  keys: [
    { name: 'displayName', weight: 0.4 },
    { name: 'searchName', weight: 0.3 },
    { name: 'aliases', weight: 0.2 },
    { name: 'slug', weight: 0.1 }
  ]
};
```

## UX Rules

- If there is one strong match, show the confirmation card: "Ооо, это ты?"
- If there are 2-4 plausible matches, show cards and ask the participant to choose.
- If the match is weak, show: "Не нашел точно. Попробуй имя, фамилию или английское написание."
- Always require confirmation before moving to the survey.
- If the confirmed participant already has `status = submitted`, show a playful block screen instead of the form.

## Manual Safeguard

Because one shared link is used for the whole group, the final safeguard is visual confirmation. Fuzzy search helps find the right person, but the user still confirms the card before continuing.
