import { Button, Card, Chip, Link } from "@heroui/react";
import {
  ArrowLeftIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MapPinIcon,
  SendIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router";
import PageWrapper from "../../components/PageWrapper";
import SaveButton from "../../components/SaveButton";
import { useClubData } from "../../lib/data/ClubDataContext";
import { eventKey, type ContentBlock } from "../../lib/data/clubs";
import { recordPageView } from "../../lib/data/clubStats";

// --- Widgets ---

function HeaderWidget({ text }: { text: string }) {
  return (
    <h2 className="text-2xl font-semibold pt-2">{text}</h2>
  );
}

function BodyWidget({ text }: { text: string }) {
  return (
    <p className="text-default-600 leading-relaxed">{text}</p>
  );
}

function CarouselWidget({ images }: { images: string[] }) {
  const [idx, setIdx] = useState(0);

  return (
    <div className="relative w-full overflow-hidden rounded-xl bg-default-100">
      <div
        className="flex transition-transform duration-300 ease-in-out"
        style={{ transform: `translateX(-${idx * 100}%)` }}
      >
        {images.map((src, i) => (
          <img
            key={i}
            src={src}
            alt=""
            className="w-full shrink-0 h-64 object-cover select-none"
          />
        ))}
      </div>
      {images.length > 1 && (
        <>
          <button
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
            disabled={idx === 0}
            className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 disabled:opacity-30 text-white rounded-full p-1.5 transition-colors"
          >
            <ChevronLeftIcon size={18} />
          </button>
          <button
            onClick={() => setIdx((i) => Math.min(images.length - 1, i + 1))}
            disabled={idx === images.length - 1}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 disabled:opacity-30 text-white rounded-full p-1.5 transition-colors"
          >
            <ChevronRightIcon size={18} />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === idx ? "bg-white" : "bg-white/40"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function renderBlock(block: ContentBlock, i: number) {
  if (block.type === "header") return <HeaderWidget key={i} text={block.text} />;
  if (block.type === "body") return <BodyWidget key={i} text={block.text} />;
  if (block.type === "carousel") return <CarouselWidget key={i} images={block.images} />;
}

// --- Helpers ---

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return (
    date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }) +
    " · " +
    date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  );
}

// --- Page ---

export default function () {
  const { club: slug } = useParams<{ club: string }>();
  const { getClub } = useClubData();
  const data = slug ? getClub(slug) : undefined;

  useEffect(() => {
    if (slug) recordPageView(slug);
  }, [slug]);

  if (!data) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center gap-4 pt-16 text-center">
          <p className="text-default-400 text-lg">Club not found.</p>
          <Link href="/events">
            <Button variant="outline">
              <ArrowLeftIcon size={16} />
              Back to Events
            </Button>
          </Link>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="w-full max-w-2xl flex flex-col gap-8 pb-8">
        {/* Back */}
        <Link href="/events" className="self-start">
          <Button variant="ghost" size="sm">
            <ArrowLeftIcon size={16} />
            All Events
          </Button>
        </Link>

        {/* Club header */}
        <div className="flex items-start gap-5">
          <img
            src={data.logo}
            alt={data.name}
            className="w-16 h-16 rounded-2xl object-cover shrink-0 border border-default-200"
          />
          <div className="flex flex-col gap-1 flex-1">
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-3xl font-semibold">{data.name}</h1>
              <SaveButton kind="club" id={data.slug} />
            </div>
            <p className="text-default-500 leading-relaxed">{data.description}</p>
          </div>
        </div>

        {data.applicationsOpen && (
          <Link href={`/apply/${data.slug}`} className="self-start">
            <Button variant="primary">
              <SendIcon size={16} />
              Apply to {data.name}
            </Button>
          </Link>
        )}

        {/* Upcoming events */}
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Upcoming Events</h2>
          <div className="flex flex-col gap-3">
            {data.events.map((event) => (
              <Card key={event.id} className="w-full">
                <Card.Header className="gap-1">
                  <div className="flex items-start justify-between w-full gap-4">
                    <Card.Title className="text-base">{event.title}</Card.Title>
                    <div className="flex items-center gap-2 shrink-0">
                      <Chip variant="soft" color={event.isPublic ? "success" : "warning"} size="sm">
                        {event.isPublic ? "Public" : "Members Only"}
                      </Chip>
                      <Chip
                        variant="soft"
                        color={event.fee !== null ? "accent" : "default"}
                        size="sm"
                      >
                        {event.fee !== null ? `$${event.fee}` : "Free"}
                      </Chip>
                      <SaveButton kind="event" id={eventKey(data.slug, event.id)} />
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
        </div>

        {/* Stackable content blocks */}
        <div className="flex flex-col gap-5">
          {data.content.map((block, i) => renderBlock(block, i))}
        </div>
      </div>
    </PageWrapper>
  );
}
