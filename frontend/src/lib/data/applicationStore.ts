import { randomId } from "../id";

export interface ApplicationEntry {
  id: string;
  clubSlug: string;
  submittedAt: string;
  fullName: string;
  email: string;
  classification: string;
  major: string;
  phone: string;
  motivation: string;
  experience: string;
  availability: string[];
}

const STORAGE_KEY = "cc_applications";

function readAll(): ApplicationEntry[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeAll(entries: ApplicationEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function submitApplication(
  entry: Omit<ApplicationEntry, "id" | "submittedAt">,
): ApplicationEntry {
  const full: ApplicationEntry = {
    ...entry,
    id: randomId("app"),
    submittedAt: new Date().toISOString(),
  };
  const all = readAll();
  all.push(full);
  writeAll(all);
  return full;
}

export function listApplications(clubSlug: string): ApplicationEntry[] {
  return readAll()
    .filter((a) => a.clubSlug === clubSlug)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

export function countApplications(clubSlug: string): number {
  return listApplications(clubSlug).length;
}
