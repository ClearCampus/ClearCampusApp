import { Button, Card, Chip, Tabs, TextArea } from "@heroui/react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  EyeIcon,
  FileTextIcon,
  ImageIcon,
  PlusIcon,
  TicketIcon,
  Trash2Icon,
  TypeIcon,
  UsersIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import PageWrapper from "../../components/PageWrapper";
import { useAuth } from "../../lib/auth/AuthContext";
import { listApplications } from "../../lib/data/applicationStore";
import { useClubData } from "../../lib/data/ClubDataContext";
import { eventKey, type ClubEventEntry, type ContentBlock } from "../../lib/data/clubs";
import { getPageViews } from "../../lib/data/clubStats";
import { getRsvpCount } from "../../lib/data/rsvpStore";

// --- Helpers ---

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocal(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    " · " +
    date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

// --- KPIs tab ---

function KpiTab({ clubSlug, events }: { clubSlug: string; events: ClubEventEntry[] }) {
  const [refreshTick, setRefreshTick] = useState(0);
  const applications = listApplications(clubSlug);
  const pageViews = getPageViews(clubSlug);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">KPIs</h2>
        <Button variant="outline" size="sm" onPress={() => setRefreshTick((t) => t + 1)}>
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" key={refreshTick}>
        <Card className="w-full">
          <Card.Header className="gap-1">
            <div className="flex items-center gap-2 text-default-500">
              <EyeIcon size={16} />
              <Card.Title className="text-sm">Page Views</Card.Title>
            </div>
            <p className="text-3xl font-semibold">{pageViews}</p>
          </Card.Header>
        </Card>
        <Card className="w-full">
          <Card.Header className="gap-1">
            <div className="flex items-center gap-2 text-default-500">
              <FileTextIcon size={16} />
              <Card.Title className="text-sm">Application Entries</Card.Title>
            </div>
            <p className="text-3xl font-semibold">{applications.length}</p>
          </Card.Header>
        </Card>
        <Card className="w-full">
          <Card.Header className="gap-1">
            <div className="flex items-center gap-2 text-default-500">
              <UsersIcon size={16} />
              <Card.Title className="text-sm">Total Event RSVPs</Card.Title>
            </div>
            <p className="text-3xl font-semibold">
              {events.reduce((sum, e) => sum + getRsvpCount(eventKey(clubSlug, e.id)), 0)}
            </p>
          </Card.Header>
        </Card>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-lg font-semibold">RSVPs by Event</h3>
        {events.length === 0 ? (
          <p className="text-default-400 text-sm">No events yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between border border-default-200 rounded-lg px-4 py-3"
              >
                <div className="flex items-center gap-2">
                  <TicketIcon size={16} className="text-default-400" />
                  <span className="font-medium">{event.title}</span>
                  <span className="text-default-400 text-sm">{formatDateTime(event.date)}</span>
                </div>
                <Chip variant="soft" color="accent">
                  {getRsvpCount(eventKey(clubSlug, event.id))} RSVPs
                </Chip>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-lg font-semibold">Recent Applications</h3>
        {applications.length === 0 ? (
          <p className="text-default-400 text-sm">No applications submitted yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {applications.slice(0, 8).map((app) => (
              <div
                key={app.id}
                className="flex items-center justify-between border border-default-200 rounded-lg px-4 py-3"
              >
                <div className="flex flex-col">
                  <span className="font-medium">{app.fullName}</span>
                  <span className="text-default-400 text-sm">{app.email}</span>
                </div>
                <span className="text-default-400 text-xs">
                  {new Date(app.submittedAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Content block editor ---

function ContentBlockRow({
  block,
  index,
  total,
  onMove,
  onChange,
  onRemove,
}: {
  block: ContentBlock;
  index: number;
  total: number;
  onMove: (direction: "up" | "down") => void;
  onChange: (patch: Partial<ContentBlock>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 border border-default-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-default-400">
          {block.type}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            isIconOnly
            isDisabled={index === 0}
            aria-label="Move up"
            onPress={() => onMove("up")}
          >
            <ArrowUpIcon size={14} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            isIconOnly
            isDisabled={index === total - 1}
            aria-label="Move down"
            onPress={() => onMove("down")}
          >
            <ArrowDownIcon size={14} />
          </Button>
          <Button variant="danger-soft" size="sm" isIconOnly aria-label="Remove" onPress={onRemove}>
            <Trash2Icon size={14} />
          </Button>
        </div>
      </div>

      {block.type === "header" && (
        <input
          value={block.text}
          onChange={(e) => onChange({ text: e.target.value })}
          className="w-full h-9 px-3 rounded-lg bg-default-100 border border-default-200 text-sm font-semibold"
          placeholder="Header text"
        />
      )}

      {block.type === "body" && (
        <TextArea
          value={block.text}
          onChange={(e) => onChange({ text: e.target.value })}
          className="w-full min-h-24 px-3 py-2 rounded-lg bg-default-100 border border-default-200 text-sm"
          placeholder="Body text"
        />
      )}

      {block.type === "carousel" && (
        <div className="flex flex-col gap-1">
          <TextArea
            defaultValue={block.images.join("\n")}
            onBlur={(e) =>
              onChange({
                images: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
              })
            }
            className="w-full min-h-20 px-3 py-2 rounded-lg bg-default-100 border border-default-200 text-sm font-mono"
            placeholder={"One image URL per line"}
          />
          <p className="text-xs text-default-400">One image URL per line.</p>
        </div>
      )}
    </div>
  );
}

// --- Edit tab ---

function EditTab({ clubSlug }: { clubSlug: string }) {
  const {
    getClub,
    updateClubMeta,
    addContentBlock,
    updateContentBlock,
    removeContentBlock,
    moveContentBlock,
    addEvent,
    updateEvent,
    removeEvent,
  } = useClubData();
  const club = getClub(clubSlug);

  if (!club) return <p className="text-default-400">Club not found.</p>;

  return (
    <div className="flex flex-col gap-8">
      {/* Required fields */}
      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Club Details</h2>

        <div className="flex items-center gap-4">
          <img
            src={club.logo}
            alt=""
            className="w-16 h-16 rounded-2xl object-cover border border-default-200"
          />
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-sm font-medium">Logo URL</label>
            <input
              value={club.logo}
              onChange={(e) => updateClubMeta(clubSlug, { logo: e.target.value })}
              className="w-full h-9 px-3 rounded-lg bg-default-100 border border-default-200 text-sm"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Club Name</label>
          <input
            value={club.name}
            onChange={(e) => updateClubMeta(clubSlug, { name: e.target.value })}
            className="w-full h-9 px-3 rounded-lg bg-default-100 border border-default-200 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Description</label>
          <TextArea
            value={club.description}
            onChange={(e) => updateClubMeta(clubSlug, { description: e.target.value })}
            className="w-full min-h-24 px-3 py-2 rounded-lg bg-default-100 border border-default-200 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Applications</label>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={club.applicationsOpen ? "primary" : "outline"}
              onPress={() => updateClubMeta(clubSlug, { applicationsOpen: true })}
            >
              Open
            </Button>
            <Button
              size="sm"
              variant={!club.applicationsOpen ? "primary" : "outline"}
              onPress={() => updateClubMeta(clubSlug, { applicationsOpen: false })}
            >
              Closed
            </Button>
          </div>
          <p className="text-xs text-default-400">
            When open, an Apply button linking to /apply/{clubSlug} shows on your club page.
          </p>
        </div>
      </section>

      {/* Event list */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Events</h2>
          <Button
            size="sm"
            variant="outline"
            onPress={() =>
              addEvent(clubSlug, {
                title: "New Event",
                description: "",
                date: new Date().toISOString(),
                location: "TBD",
                isPublic: true,
                fee: null,
              })
            }
          >
            <PlusIcon size={14} />
            Add Event
          </Button>
        </div>

        <div className="flex flex-col gap-4">
          {club.events.map((event) => (
            <div key={event.id} className="flex flex-col gap-2 border border-default-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <input
                  value={event.title}
                  onChange={(e) => updateEvent(clubSlug, event.id, { title: e.target.value })}
                  className="flex-1 h-9 px-3 rounded-lg bg-default-100 border border-default-200 text-sm font-semibold mr-2"
                  placeholder="Event title"
                />
                <Button
                  variant="danger-soft"
                  size="sm"
                  isIconOnly
                  aria-label="Remove event"
                  onPress={() => removeEvent(clubSlug, event.id)}
                >
                  <Trash2Icon size={14} />
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="datetime-local"
                  value={toDatetimeLocal(event.date)}
                  onChange={(e) => updateEvent(clubSlug, event.id, { date: fromDatetimeLocal(e.target.value) })}
                  className="h-9 px-3 rounded-lg bg-default-100 border border-default-200 text-sm"
                />
                <input
                  value={event.location}
                  onChange={(e) => updateEvent(clubSlug, event.id, { location: e.target.value })}
                  placeholder="Location"
                  className="h-9 px-3 rounded-lg bg-default-100 border border-default-200 text-sm"
                />
              </div>

              <TextArea
                value={event.description}
                onChange={(e) => updateEvent(clubSlug, event.id, { description: e.target.value })}
                placeholder="Event description"
                className="w-full min-h-16 px-3 py-2 rounded-lg bg-default-100 border border-default-200 text-sm"
              />

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-default-500">Visibility</span>
                  <Button
                    size="sm"
                    variant={event.isPublic ? "primary" : "outline"}
                    onPress={() => updateEvent(clubSlug, event.id, { isPublic: true })}
                  >
                    Public
                  </Button>
                  <Button
                    size="sm"
                    variant={!event.isPublic ? "primary" : "outline"}
                    onPress={() => updateEvent(clubSlug, event.id, { isPublic: false })}
                  >
                    Members Only
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-default-500">Fee ($, blank = free)</span>
                  <input
                    type="number"
                    min={0}
                    value={event.fee ?? ""}
                    onChange={(e) =>
                      updateEvent(clubSlug, event.id, {
                        fee: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    className="w-20 h-8 px-2 rounded-lg bg-default-100 border border-default-200 text-sm"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Content blocks */}
      <section className="flex flex-col gap-4 pb-8">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Page Content</h2>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onPress={() => addContentBlock(clubSlug, { type: "header", text: "New Header" })}
            >
              <TypeIcon size={14} />
              Header
            </Button>
            <Button
              size="sm"
              variant="outline"
              onPress={() => addContentBlock(clubSlug, { type: "body", text: "" })}
            >
              <FileTextIcon size={14} />
              Body Text
            </Button>
            <Button
              size="sm"
              variant="outline"
              onPress={() => addContentBlock(clubSlug, { type: "carousel", images: [] })}
            >
              <ImageIcon size={14} />
              Carousel
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {club.content.length === 0 ? (
            <p className="text-default-400 text-sm">No content blocks yet — add one above.</p>
          ) : (
            club.content.map((block, i) => (
              <ContentBlockRow
                key={block.id}
                block={block}
                index={i}
                total={club.content.length}
                onMove={(direction) => moveContentBlock(clubSlug, block.id, direction)}
                onChange={(patch) => updateContentBlock(clubSlug, block.id, patch)}
                onRemove={() => removeContentBlock(clubSlug, block.id)}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}

// --- Page ---

export default function () {
  const { session, isLoading } = useAuth();
  const navigate = useNavigate();
  const { getClub } = useClubData();

  useEffect(() => {
    if (isLoading) return;
    if (!session) navigate("/login", { replace: true });
    else if (session.user.role !== "club") navigate("/dashboard/student", { replace: true });
  }, [isLoading, session, navigate]);

  if (!session || session.user.role !== "club") return null;

  const club = getClub(session.user.clubSlug);

  return (
    <PageWrapper>
      <div className="w-full max-w-4xl flex flex-col gap-6 pt-8 pb-8">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium tracking-widest uppercase text-default-500">
            Club Dashboard
          </p>
          <h1 className="text-3xl font-semibold">{club?.name ?? "Your Club"}</h1>
        </div>

        <Tabs orientation="vertical" defaultSelectedKey="kpis" className="w-full items-start">
          <Tabs.ListContainer className="shrink-0">
            <Tabs.List className="w-48">
              <Tabs.Tab id="kpis">KPIs & Performance</Tabs.Tab>
              <div className="h-px bg-default-200 my-2" />
              <Tabs.Tab id="edit">Edit Profile & Page</Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>

          <Tabs.Panel id="kpis" className="flex-1 min-w-0">
            {club && <KpiTab clubSlug={club.slug} events={club.events} />}
          </Tabs.Panel>
          <Tabs.Panel id="edit" className="flex-1 min-w-0">
            {club && <EditTab clubSlug={club.slug} />}
          </Tabs.Panel>
        </Tabs>
      </div>
    </PageWrapper>
  );
}
