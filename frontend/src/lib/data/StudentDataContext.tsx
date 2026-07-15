import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "../auth/AuthContext";
import { adjustRsvp } from "./rsvpStore";

interface StudentData {
  interestIds: string[];
  savedClubSlugs: string[];
  savedEventKeys: string[];
}

const EMPTY: StudentData = { interestIds: [], savedClubSlugs: [], savedEventKeys: [] };

function storageKey(userId: string) {
  return `cc_student_data_${userId}`;
}

function load(userId: string): StudentData {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

interface StudentDataContextValue {
  interestIds: string[];
  savedClubSlugs: string[];
  savedEventKeys: string[];
  toggleInterest: (id: string) => void;
  toggleSavedClub: (slug: string) => void;
  toggleSavedEvent: (key: string) => void;
  isClubSaved: (slug: string) => boolean;
  isEventSaved: (key: string) => boolean;
}

const StudentDataContext = createContext<StudentDataContextValue | null>(null);

export function StudentDataProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [data, setData] = useState<StudentData>(EMPTY);

  useEffect(() => {
    setData(userId ? load(userId) : EMPTY);
  }, [userId]);

  useEffect(() => {
    if (userId) localStorage.setItem(storageKey(userId), JSON.stringify(data));
  }, [userId, data]);

  const toggleInterest = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      interestIds: prev.interestIds.includes(id)
        ? prev.interestIds.filter((i) => i !== id)
        : [...prev.interestIds, id],
    }));
  }, []);

  const toggleSavedClub = useCallback((slug: string) => {
    setData((prev) => ({
      ...prev,
      savedClubSlugs: prev.savedClubSlugs.includes(slug)
        ? prev.savedClubSlugs.filter((s) => s !== slug)
        : [...prev.savedClubSlugs, slug],
    }));
  }, []);

  const toggleSavedEvent = useCallback((key: string) => {
    setData((prev) => {
      const isSaved = prev.savedEventKeys.includes(key);
      adjustRsvp(key, isSaved ? -1 : 1);
      return {
        ...prev,
        savedEventKeys: isSaved
          ? prev.savedEventKeys.filter((k) => k !== key)
          : [...prev.savedEventKeys, key],
      };
    });
  }, []);

  const isClubSaved = useCallback((slug: string) => data.savedClubSlugs.includes(slug), [data]);
  const isEventSaved = useCallback((key: string) => data.savedEventKeys.includes(key), [data]);

  const value = useMemo<StudentDataContextValue>(
    () => ({
      interestIds: data.interestIds,
      savedClubSlugs: data.savedClubSlugs,
      savedEventKeys: data.savedEventKeys,
      toggleInterest,
      toggleSavedClub,
      toggleSavedEvent,
      isClubSaved,
      isEventSaved,
    }),
    [data, toggleInterest, toggleSavedClub, toggleSavedEvent, isClubSaved, isEventSaved],
  );

  return <StudentDataContext.Provider value={value}>{children}</StudentDataContext.Provider>;
}

export function useStudentData(): StudentDataContextValue {
  const ctx = useContext(StudentDataContext);
  if (!ctx) throw new Error("useStudentData must be used within a StudentDataProvider");
  return ctx;
}
