export type Participant = {
  slug: string;
  displayName: string;
  firstName: string;
  lastName: string;
  photoFileName: string;
  status?: "waiting" | "submitted";
};

export type ShirtSize = "XS" | "S" | "M" | "L" | "XL" | "XXL" | "3XL";
export type InitialsLanguage = "RU" | "UA" | "EN";

export type BackNameDraft = {
  firstName: string;
  lastName: string;
};

export type Submission = {
  participantSlug: string;
  firstName: string;
  lastName: string;
  size: ShirtSize;
  words: [string, string, string];
  initialsLanguage: InitialsLanguage;
  backNameAssetPath: string;
  backNameFirstName: string;
  backNameLastName: string;
  backNameText: string;
  createdAt: string;
};

export type CreatorStep =
  | "splash"
  | "identify"
  | "size"
  | "words"
  | "initials"
  | "confirm"
  | "complete";
