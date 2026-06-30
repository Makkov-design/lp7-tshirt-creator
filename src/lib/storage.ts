import type { Submission } from "@/lib/types";

const storageKey = "lp7-shirt-submissions";
const currentKey = "lp7-current-submission";
const legacySplashKey = "lp7-splash-seen";

export function readStoredSubmissions(): Submission[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as Submission[]) : [];
  } catch {
    return [];
  }
}

export function writeStoredSubmissions(submissions: Submission[]) {
  window.localStorage.setItem(storageKey, JSON.stringify(submissions));
}

export function readCurrentSubmissionSlug() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(currentKey);
}

export function writeCurrentSubmissionSlug(slug: string) {
  window.localStorage.setItem(currentKey, slug);
}

export function clearAppSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(storageKey);
  window.localStorage.removeItem(currentKey);
  window.localStorage.removeItem(legacySplashKey);
  window.sessionStorage.clear();
}
