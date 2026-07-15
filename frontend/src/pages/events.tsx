import { Button, Card, Chip, Link, SearchField } from "@heroui/react";
import { CalendarIcon, MapPinIcon } from "lucide-react";
import { useMemo, useState } from "react";
import PageWrapper from "../components/PageWrapper";
import SaveButton from "../components/SaveButton";
import { useClubData } from "../lib/data/ClubDataContext";
import { eventKey, type ClubEventEntry } from "../lib/data/clubs";

interface FlatEvent extends ClubEventEntry {
  clubName: string;
  clubSlug: string;
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }) + " · " + date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function EventCard({ event }: { event: FlatEvent }) {
  return (
    <Card className="w-full">
      <Card.Header className="gap-2">
        <div className="flex items-start justify-between w-full gap-4">
          <div className="flex flex-col gap-0.5">
            <p className="text-xs text-default-400 font-medium uppercase tracking-wider">
              {event.clubName}
            </p>
            <Card.Title>{event.title}</Card.Title>
          </div>
          <div className="flex gap-2 shrink-0 flex-wrap justify-end items-center">
            <Chip variant="soft" color={event.isPublic ? "success" : "warning"}>
              {event.isPublic ? "Public" : "Members Only"}
            </Chip>
            <Chip variant="soft" color={event.fee !== null ? "accent" : "default"}>
              {event.fee !== null ? `$${event.fee}` : "Free"}
            </Chip>
            <SaveButton kind="event" id={eventKey(event.clubSlug, event.id)} />
          </div>
        </div>
        <Card.Description>{event.description}</Card.Description>
      </Card.Header>
      <Card.Footer className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex flex-wrap gap-4 text-sm text-default-500">
          <span className="flex items-center gap-1.5">
            <CalendarIcon size={14} />
            {formatDateTime(event.date)}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPinIcon size={14} />
            {event.location}
          </span>
        </div>
        <Link href={`/club/${event.clubSlug}`}>
          <Button variant="outline" size="sm">View Club</Button>
        </Link>
      </Card.Footer>
    </Card>
  );
}

export default function () {
  const { clubs } = useClubData();
  const [query, setQuery] = useState("");

  const events = useMemo<FlatEvent[]>(
    () =>
      clubs.flatMap((club) =>
        club.events.map((event) => ({ ...event, clubName: club.name, clubSlug: club.slug })),
      ),
    [clubs],
  );

  const filtered = events
    .filter((event) => {
      const q = query.toLowerCase();
      return (
        event.title.toLowerCase().includes(q) ||
        event.description.toLowerCase().includes(q) ||
        event.location.toLowerCase().includes(q) ||
        event.clubName.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <PageWrapper page="events">
      {/* Hero */}
      <section className="flex flex-col items-center text-center gap-4 pt-8 max-w-2xl">
        <p className="text-sm font-medium tracking-widest uppercase text-default-500">
          Events
        </p>
        <h1 className="text-5xl font-semibold leading-tight">
          What's happening on campus.
        </h1>
        <p className="text-lg text-default-500 max-w-xl">
          Browse upcoming club events in one place — all in chronological order.
        </p>
      </section>

      {/* Search */}
      <section className="w-full max-w-2xl">
        <SearchField
          aria-label="Search events"
          name="search"
          className="w-full"
          value={query}
          onChange={setQuery}
        >
          <SearchField.Group className="flex items-center gap-2 px-3 h-10 border border-default-200 rounded-lg bg-default-100">
            <SearchField.SearchIcon className="text-muted shrink-0" />
            <SearchField.Input
              placeholder="Search by event, club, or location…"
              className="flex-1 bg-transparent outline-none placeholder:text-muted"
            />
            <SearchField.ClearButton className="shrink-0" />
          </SearchField.Group>
        </SearchField>
      </section>

      {/* Events list */}
      <section className="flex flex-col gap-4 w-full max-w-2xl pb-8">
        {filtered.length === 0 ? (
          <p className="text-center text-default-400 py-12">
            No events match your search.
          </p>
        ) : (
          filtered.map((event) => <EventCard key={event.id} event={event} />)
        )}
      </section>
    </PageWrapper>
  );
}
