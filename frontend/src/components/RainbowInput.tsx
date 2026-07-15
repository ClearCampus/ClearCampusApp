import { Button, cn, SearchField, Spinner } from "@heroui/react";
import { SearchIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Filters from "./Filters";

const PLACEHOLDERS = [
  "Clubs that look good on a resume for consulting",
  "Clubs that do community service near campus",
  "Clubs where I can speak Spanish with other students",
  "Beginner-friendly clubs, no experience needed",
];

interface TypewriterOptions {
  typeSpeed?: number; // ms per character while typing
  deleteSpeed?: number; // ms per character while deleting
  pauseAfterType?: number; // ms to hold full string before deleting
  pauseAfterDelete?: number; // ms to hold empty before typing next
}

function useTypewriterPlaceholder(
  words: string[],
  {
    typeSpeed = 60,
    deleteSpeed = 30,
    pauseAfterType = 1500,
    pauseAfterDelete = 400,
  }: TypewriterOptions = {},
) {
  const [text, setText] = useState("");
  const wordIndexRef = useRef(0);
  const charIndexRef = useRef(0);
  const phaseRef = useRef<"typing" | "pausing" | "deleting" | "waiting">(
    "typing",
  );

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const tick = () => {
      const currentWord = words[wordIndexRef.current];

      switch (phaseRef.current) {
        case "typing": {
          charIndexRef.current += 1;
          setText(currentWord.slice(0, charIndexRef.current));

          if (charIndexRef.current >= currentWord.length) {
            phaseRef.current = "pausing";
            timeoutId = setTimeout(tick, pauseAfterType);
          } else {
            timeoutId = setTimeout(tick, typeSpeed);
          }
          break;
        }

        case "pausing": {
          phaseRef.current = "deleting";
          timeoutId = setTimeout(tick, deleteSpeed);
          break;
        }

        case "deleting": {
          charIndexRef.current -= 1;
          setText(currentWord.slice(0, charIndexRef.current));

          if (charIndexRef.current <= 0) {
            phaseRef.current = "waiting";
            timeoutId = setTimeout(tick, pauseAfterDelete);
          } else {
            timeoutId = setTimeout(tick, deleteSpeed);
          }
          break;
        }

        case "waiting": {
          wordIndexRef.current = (wordIndexRef.current + 1) % words.length;
          phaseRef.current = "typing";
          timeoutId = setTimeout(tick, typeSpeed);
          break;
        }
      }
    };

    timeoutId = setTimeout(tick, typeSpeed);

    return () => clearTimeout(timeoutId);
  }, [words, typeSpeed, deleteSpeed, pauseAfterType, pauseAfterDelete]);

  return text;
}

interface RainbowInputProps {
  onSearch: (query: string) => void;
}

export default function (props: RainbowInputProps) {
  const placeholder = useTypewriterPlaceholder(PLACEHOLDERS);

  const [isSearching, setIsSearching] = useState(false);
  const [query, setQuery] = useState("");

  async function search() {
    setIsSearching(true);
    setTimeout(() => {
      setIsSearching(false);
      props.onSearch(query);
    }, 2000);
  }

  return (
    <div className="w-full flex flex-row gap-4">
      <SearchField
        aria-label="Search"
        name="search"
        className="grow"
        value={query}
        onChange={(search) => setQuery(search)}
      >
        <SearchField.Group
          className={cn(
            "relative flex items-center gap-2 px-3 h-9",
            "lg:h-16",
            "transition-all",
            "bg-[linear-gradient(var(--surface),var(--surface)),linear-gradient(var(--surface)_85%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-1))]",
            "[background-clip:padding-box,border-box,border-box] [background-origin:border-box]",
            "[border:calc(0.125rem)_solid_transparent]",
            "before:absolute before:bottom-[-20%] before:left-1/2 before:z-0",
            "before:h-1/5 before:w-full before:-translate-x-1/2",
            "before:bg-[var(--color-1)]",
            "before:[filter:blur(0.75rem)]",
            "before:transition-opacity before:duration-500",
            isSearching ? "before:opacity-75" : "before:opacity-25",
          )}
        >
          <SearchField.SearchIcon className="text-muted shrink-0" />
          <SearchField.Input
            onKeyDown={(e) => {
              if (e.key == "Enter") {
                search();
              }
            }}
            placeholder={placeholder}
            className="flex-1 lg:text-2xl bg-transparent outline-none placeholder:text-muted"
          />
          <SearchField.ClearButton className="shrink-0" />
          <Filters />
          <Button
            slot={null}
            isPending={isSearching}
            size="lg"
            onPress={search}
          >
            {isSearching ? (
              <Spinner color="current" size="sm" />
            ) : (
              <div className="w-4">
                <SearchIcon />
              </div>
            )}
            Search
          </Button>
        </SearchField.Group>
      </SearchField>
    </div>
  );
}
