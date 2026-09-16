import { useSyncExternalStore } from "react";

/**
 * The advisor application while it is being filled in, across its three stage
 * routes. Session storage, not the database: a half-finished application is not
 * something the console should ever see.
 */
export type OnboardingDraft = {
  readonly legalName: string;
  readonly phone: string;
  readonly birthDate: string;
  readonly bio: string;
  readonly idFileName: string | null;
  readonly skills: ReadonlyArray<{ readonly id: string; readonly skill: string; readonly proof: string | null }>;
};

const KEY = "advisory:onboarding";

const EMPTY: OnboardingDraft = {
  legalName: "",
  phone: "",
  birthDate: "",
  bio: "",
  idFileName: null,
  skills: [{ id: "skill-1", skill: "", proof: null }],
};

let current: OnboardingDraft | null = null;
const listeners = new Set<() => void>();

function read(): OnboardingDraft {
  if (current) return current;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    current = raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<OnboardingDraft>) } : EMPTY;
  } catch {
    current = EMPTY;
  }
  return current;
}

function write(next: OnboardingDraft): void {
  current = next;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Still held for this page view.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useOnboardingDraft(): OnboardingDraft {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function updateDraft(patch: Partial<OnboardingDraft>): void {
  write({ ...read(), ...patch });
}

export function clearDraft(): void {
  write(EMPTY);
}

/** Thai mobile and landline numbers, with or without dashes. */
export function isThaiPhone(value: string): boolean {
  return /^0\d{8,9}$/.test(value.replace(/[\s-]/g, ""));
}

/** `dd/mm/yyyy` on either calendar — a Buddhist year is converted on submit. */
export function parseBirthDate(value: string): string | null {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const [, d, m, y] = match;
  const year = Number(y) > 2400 ? Number(y) - 543 : Number(y);
  const date = new Date(Date.UTC(year, Number(m) - 1, Number(d)));
  if (date.getUTCMonth() !== Number(m) - 1 || year < 1900) return null;
  return date.toISOString().slice(0, 10);
}
