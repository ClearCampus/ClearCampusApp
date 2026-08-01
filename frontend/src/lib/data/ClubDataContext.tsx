import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { randomId } from "../id";
import { authService } from "../auth/authService";
import {
  type ClubData,
  type ClubEventEntry,
  type ContentBlock,
  type DistributiveOmit,
} from "./clubs";

type ClubMetaPatch = Partial<Pick<ClubData, "name" | "description" | "logo" | "applicationsOpen">>;

interface ClubDataContextValue {
  clubs: ClubData[];
  getClub: (slug: string) => ClubData | undefined;
  updateClubMeta: (slug: string, patch: ClubMetaPatch) => Promise<void>;

  addContentBlock: (slug: string, block: DistributiveOmit<ContentBlock, "id">) => Promise<void>;
  updateContentBlock: (slug: string, blockId: string, patch: Partial<ContentBlock>) => Promise<void>;
  removeContentBlock: (slug: string, blockId: string) => Promise<void>;
  moveContentBlock: (slug: string, blockId: string, direction: "up" | "down") => Promise<void>;

  addEvent: (slug: string, event: Omit<ClubEventEntry, "id">) => Promise<void>;
  updateEvent: (slug: string, eventId: string, patch: Partial<ClubEventEntry>) => Promise<void>;
  removeEvent: (slug: string, eventId: string) => Promise<void>;
}

const ClubDataContext = createContext<ClubDataContextValue | null>(null);

export function ClubDataProvider({ children }: { children: ReactNode }) {
  const [clubs, setClubs] = useState<ClubData[]>([]);
  const saveTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Fetch all clubs from backend on mount
  useEffect(() => {
    async function fetchClubs() {
      const baseUrl = import.meta.env.VITE_API_URL || "";
      try {
        const res = await fetch(`${baseUrl}/api/clubs`);
        if (res.ok) {
          const data = await res.json();
          setClubs(data);
        }
      } catch (e) {
        console.error("Failed to fetch clubs from backend:", e);
      }
    }
    fetchClubs();
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(saveTimeoutsRef.current).forEach(clearTimeout);
    };
  }, []);

  const getClub = useCallback((slug: string) => clubs.find((c) => c.slug === slug), [clubs]);

  // Debounced helper to save metadata patches (name, description, logo, events)
  const queueMetaSave = useCallback((slug: string, nextClubData: Partial<ClubData>) => {
    const key = `${slug}_meta`;
    if (saveTimeoutsRef.current[key]) {
      clearTimeout(saveTimeoutsRef.current[key]);
    }

    saveTimeoutsRef.current[key] = setTimeout(async () => {
      const session = authService.getSession();
      const token = session?.accessToken;
      try {
        const baseUrl = import.meta.env.VITE_API_URL || "";
        await fetch(`${baseUrl}/api/clubs/${slug}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(nextClubData),
        });
      } catch (e) {
        console.error("Failed to save club metadata to backend:", e);
      }
    }, 500);
  }, []);

  // Debounced helper to save page content custom sections
  const queuePageSave = useCallback((slug: string, nextContent: ContentBlock[]) => {
    const key = `${slug}_page`;
    if (saveTimeoutsRef.current[key]) {
      clearTimeout(saveTimeoutsRef.current[key]);
    }

    saveTimeoutsRef.current[key] = setTimeout(async () => {
      const session = authService.getSession();
      const token = session?.accessToken;
      try {
        const baseUrl = import.meta.env.VITE_API_URL || "";
        await fetch(`${baseUrl}/api/clubs/${slug}/page`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ custom_sections: nextContent }),
        });
      } catch (e) {
        console.error("Failed to save page to backend:", e);
      }
    }, 500);
  }, []);

  const updateClubMeta = useCallback(
    async (slug: string, patch: ClubMetaPatch) => {
      setClubs((prev) =>
        prev.map((club) => {
          if (club.slug === slug) {
            const nextData = { ...club, ...patch };
            // Queue the background save
            queueMetaSave(slug, nextData);
            return nextData;
          }
          return club;
        })
      );
    },
    [queueMetaSave],
  );

  const addContentBlock = useCallback(
    async (slug: string, block: DistributiveOmit<ContentBlock, "id">) => {
      const nextBlock = { ...block, id: randomId("block") } as ContentBlock;
      setClubs((prev) =>
        prev.map((c) => {
          if (c.slug === slug) {
            const nextContent = [...c.content, nextBlock];
            queuePageSave(slug, nextContent);
            return { ...c, content: nextContent };
          }
          return c;
        })
      );
    },
    [queuePageSave],
  );

  const updateContentBlock = useCallback(
    async (slug: string, blockId: string, patch: Partial<ContentBlock>) => {
      setClubs((prev) =>
        prev.map((c) => {
          if (c.slug === slug) {
            const nextContent = c.content.map((b) =>
              b.id === blockId ? ({ ...b, ...patch } as ContentBlock) : b
            );
            queuePageSave(slug, nextContent);
            return { ...c, content: nextContent };
          }
          return c;
        })
      );
    },
    [queuePageSave],
  );

  const removeContentBlock = useCallback(
    async (slug: string, blockId: string) => {
      setClubs((prev) =>
        prev.map((c) => {
          if (c.slug === slug) {
            const nextContent = c.content.filter((b) => b.id !== blockId);
            queuePageSave(slug, nextContent);
            return { ...c, content: nextContent };
          }
          return c;
        })
      );
    },
    [queuePageSave],
  );

  const moveContentBlock = useCallback(
    async (slug: string, blockId: string, direction: "up" | "down") => {
      setClubs((prev) =>
        prev.map((c) => {
          if (c.slug === slug) {
            const index = c.content.findIndex((b) => b.id === blockId);
            const targetIndex = direction === "up" ? index - 1 : index + 1;
            if (index === -1 || targetIndex < 0 || targetIndex >= c.content.length) return c;
            const nextContent = [...c.content];
            [nextContent[index], nextContent[targetIndex]] = [nextContent[targetIndex], nextContent[index]];
            queuePageSave(slug, nextContent);
            return { ...c, content: nextContent };
          }
          return c;
        })
      );
    },
    [queuePageSave],
  );

  const addEvent = useCallback(
    async (slug: string, event: Omit<ClubEventEntry, "id">) => {
      const nextEvent = { ...event, id: randomId("event") };
      setClubs((prev) =>
        prev.map((c) => {
          if (c.slug === slug) {
            const nextEvents = [...c.events, nextEvent];
            queueMetaSave(slug, { events: nextEvents });
            return { ...c, events: nextEvents };
          }
          return c;
        })
      );
    },
    [queueMetaSave],
  );

  const updateEvent = useCallback(
    async (slug: string, eventId: string, patch: Partial<ClubEventEntry>) => {
      setClubs((prev) =>
        prev.map((c) => {
          if (c.slug === slug) {
            const nextEvents = c.events.map((e) => (e.id === eventId ? { ...e, ...patch } : e));
            queueMetaSave(slug, { events: nextEvents });
            return { ...c, events: nextEvents };
          }
          return c;
        })
      );
    },
    [queueMetaSave],
  );

  const removeEvent = useCallback(
    async (slug: string, eventId: string) => {
      setClubs((prev) =>
        prev.map((c) => {
          if (c.slug === slug) {
            const nextEvents = c.events.filter((e) => e.id !== eventId);
            queueMetaSave(slug, { events: nextEvents });
            return { ...c, events: nextEvents };
          }
          return c;
        })
      );
    },
    [queueMetaSave],
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
