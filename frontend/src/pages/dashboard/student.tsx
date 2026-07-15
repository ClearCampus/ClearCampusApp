import { Button, Card, Chip, Link } from "@heroui/react";
import { CalendarIcon, MapPinIcon } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router";
import PageWrapper from "../../components/PageWrapper";
import SaveButton from "../../components/SaveButton";
import { useAuth } from "../../lib/auth/AuthContext";
import { useClubData } from "../../lib/data/ClubDataContext";
import { eventKey, type ClubData, type ClubEventEntry } from "../../lib/data/clubs";
import { INTEREST_CATEGORIES } from "../../lib/data/interests";
import { useStudentData } from "../../lib/data/StudentDataContext";

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

export default function () {
  const { session, isLoading } = useAuth();
  const navigate = useNavigate();
  const { clubs } = useClubData();
  const { interestIds, savedClubSlugs, savedEventKeys, toggleInterest } = useStudentData();

  useEffect(() => {
    if (isLoading) return;
    if (!session) navigate("/login", { replace: true });
    else if (session.user.role !== "student") navigate("/dashboard/club", { replace: true });
  }, [isLoading, session, navigate]);

  if (!session || session.user.role !== "student") return null;

  const savedClubs = clubs.filter((club) => savedClubSlugs.includes(club.slug));

  const savedEvents = savedEventKeys
    .map((key) => {
      const [clubSlug, eventId] = key.split(":");
      const club = clubs.find((c) => c.slug === clubSlug);
      const event = club?.events.find((e) => e.id === eventId);
      return club && event ? { club, event } : null;
    })
    .filter((v): v is { club: ClubData; event: ClubEventEntry } => v !== null)
    .sort((a, b) => a.event.date.localeCompare(b.event.date));

  return (
    <PageWrapper>
      <div className="w-full max-w-2xl flex flex-col gap-6 pt-8">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium tracking-widest uppercase text-default-500">
            Student Dashboard
          </p>
          <h1 className="text-3xl font-semibold">Welcome back, {session.user.name}.</h1>
        </div>
      </div>

      {/* Interests */}
      <section className="flex flex-col gap-4 w-full max-w-2xl">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-semibold">Interests</h2>
          <p className="text-default-500 text-sm">
            Pick anything that sounds like you — we'll use this to surface better matches.
          </p>
        </div>
        <div className="flex flex-col gap-4">
          {INTEREST_CATEGORIES.map((category) => (
            <div key={category.id} className="flex flex-col gap-2">
              <p className="text-sm font-semibold text-default-600">{category.label}</p>
              <div className="flex flex-wrap gap-2">
                {category.chips.map((chip) => {
                  const selected = interestIds.includes(chip.id);
                  return (
                    <Button
                      key={chip.id}
                      size="sm"
                      variant={selected ? "primary" : "outline"}
                      onPress={() => toggleInterest(chip.id)}
                    >
                      {chip.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Saved clubs */}
      <section className="flex flex-col gap-4 w-full max-w-2xl">
        <h2 className="text-2xl font-semibold">Saved Clubs</h2>
        {savedClubs.length === 0 ? (
          <p className="text-default-400 text-sm py-4">
            You haven't saved any clubs yet — look for the bookmark icon on a club's page.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {savedClubs.map((club) => (
              <Card key={club.slug} className="w-full">
                <Card.Header className="gap-1">
                  <div className="flex items-center justify-between w-full gap-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={club.logo}
                        alt={club.name}
                        className="w-10 h-10 rounded-xl object-cover border border-default-200"
                      />
                      <Card.Title className="text-base">{club.name}</Card.Title>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={`/club/${club.slug}`}>
                        <Button variant="outline" size="sm">View</Button>
                      </Link>
                      <SaveButton kind="club" id={club.slug} />
                    </div>
                  </div>
                  <Card.Description>{club.description}</Card.Description>
                </Card.Header>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Saved events */}
      <section className="flex flex-col gap-4 w-full max-w-2xl pb-8">
        <h2 className="text-2xl font-semibold">Saved Events</h2>
        {savedEvents.length === 0 ? (
          <p className="text-default-400 text-sm py-4">
            You haven't saved any events yet — look for the bookmark icon on an event.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {savedEvents.map(({ club, event }) => (
              <Card key={eventKey(club.slug, event.id)} className="w-full">
                <Card.Header className="gap-1">
                  <div className="flex items-start justify-between w-full gap-4">
                    <div className="flex flex-col gap-0.5">
                      <p className="text-xs text-default-400 font-medium uppercase tracking-wider">
                        {club.name}
                      </p>
                      <Card.Title className="text-base">{event.title}</Card.Title>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Chip variant="soft" color={event.fee !== null ? "accent" : "default"} size="sm">
                        {event.fee !== null ? `$${event.fee}` : "Free"}
                      </Chip>
                      <SaveButton kind="event" id={eventKey(club.slug, event.id)} />
                    </div>
                  </div>
                </Card.Header>
                <Card.Footer>
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
                </Card.Footer>
              </Card>
            ))}
          </div>
        )}
      </section>
    </PageWrapper>
  );
}
