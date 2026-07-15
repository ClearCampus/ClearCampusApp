import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { randomId } from "../id";
import {
  SEED_CLUBS,
  type ClubData,
  type ClubEventEntry,
  type ContentBlock,
  type DistributiveOmit,
} from "./clubs";

const STORAGE_KEY = "cc_clubs_v1";

function loadClubs(): ClubData[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED_CLUBS;
    const parsed = JSON.parse(raw) as ClubData[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SEED_CLUBS;
  } catch {
    return SEED_CLUBS;
  }
}

type ClubMetaPatch = Partial<Pick<ClubData, "name" | "description" | "logo" | "applicationsOpen">>;

interface ClubDataContextValue {
  clubs: ClubData[];
  getClub: (slug: string) => ClubData | undefined;
  updateClubMeta: (slug: string, patch: ClubMetaPatch) => void;

  addContentBlock: (slug: string, block: DistributiveOmit<ContentBlock, "id">) => void;
  updateContentBlock: (slug: string, blockId: string, patch: Partial<ContentBlock>) => void;
  removeContentBlock: (slug: string, blockId: string) => void;
  moveContentBlock: (slug: string, blockId: string, direction: "up" | "down") => void;

  addEvent: (slug: string, event: Omit<ClubEventEntry, "id">) => void;
  updateEvent: (slug: string, eventId: string, patch: Partial<ClubEventEntry>) => void;
  removeEvent: (slug: string, eventId: string) => void;
}

const ClubDataContext = createContext<ClubDataContextValue | null>(null);

export function ClubDataProvider({ children }: { children: ReactNode }) {
  const [clubs, setClubs] = useState<ClubData[]>(loadClubs);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clubs));
  }, [clubs]);

  const withClub = useCallback((slug: string, fn: (club: ClubData) => ClubData) => {
    setClubs((prev) => prev.map((club) => (club.slug === slug ? fn(club) : club)));
  }, []);

  const getClub = useCallback((slug: string) => clubs.find((c) => c.slug === slug), [clubs]);

  const updateClubMeta = useCallback(
    (slug: string, patch: ClubMetaPatch) => withClub(slug, (club) => ({ ...club, ...patch })),
    [withClub],
  );

  const addContentBlock = useCallback(
    (slug: string, block: DistributiveOmit<ContentBlock, "id">) =>
      withClub(slug, (club) => ({
        ...club,
        content: [...club.content, { ...block, id: randomId("block") } as ContentBlock],
      })),
    [withClub],
  );

  const updateContentBlock = useCallback(
    (slug: string, blockId: string, patch: Partial<ContentBlock>) =>
      withClub(slug, (club) => ({
        ...club,
        content: club.content.map((b) => (b.id === blockId ? ({ ...b, ...patch } as ContentBlock) : b)),
      })),
    [withClub],
  );

  const removeContentBlock = useCallback(
    (slug: string, blockId: string) =>
      withClub(slug, (club) => ({
        ...club,
        content: club.content.filter((b) => b.id !== blockId),
      })),
    [withClub],
  );

  const moveContentBlock = useCallback(
    (slug: string, blockId: string, direction: "up" | "down") =>
      withClub(slug, (club) => {
        const index = club.content.findIndex((b) => b.id === blockId);
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (index === -1 || targetIndex < 0 || targetIndex >= club.content.length) return club;
        const content = [...club.content];
        [content[index], content[targetIndex]] = [content[targetIndex], content[index]];
        return { ...club, content };
      }),
    [withClub],
  );

  const addEvent = useCallback(
    (slug: string, event: Omit<ClubEventEntry, "id">) =>
      withClub(slug, (club) => ({
        ...club,
        events: [...club.events, { ...event, id: randomId("event") }],
      })),
    [withClub],
  );

  const updateEvent = useCallback(
    (slug: string, eventId: string, patch: Partial<ClubEventEntry>) =>
      withClub(slug, (club) => ({
        ...club,
        events: club.events.map((e) => (e.id === eventId ? { ...e, ...patch } : e)),
      })),
    [withClub],
  );

  const removeEvent = useCallback(
    (slug: string, eventId: string) =>
      withClub(slug, (club) => ({
        ...club,
        events: club.events.filter((e) => e.id !== eventId),
      })),
    [withClub],
  );

  const value = useMemo<ClubDataContextValue>(
    () => ({
      clubs,
      getClub,
      updateClubMeta,
      addContentBlock,
      updateContentBlock,
      removeContentBlock,
      moveContentBlock,
      addEvent,
      updateEvent,
      removeEvent,
    }),
    [
      clubs,
      getClub,
      updateClubMeta,
      addContentBlock,
      updateContentBlock,
      removeContentBlock,
      moveContentBlock,
      addEvent,
      updateEvent,
      removeEvent,
    ],
  );

  return <ClubDataContext.Provider value={value}>{children}</ClubDataContext.Provider>;
}

export function useClubData(): ClubDataContextValue {
  const ctx = useContext(ClubDataContext);
  if (!ctx) throw new Error("useClubData must be used within a ClubDataProvider");
  return ctx;
}
