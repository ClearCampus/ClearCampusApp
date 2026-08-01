// --- Content block types ---

export type ContentBlock =
  | { id: string; type: "header"; text: string }
  | { id: string; type: "body"; text: string }
  | { id: string; type: "carousel"; images: string[] };

// Plain `Omit` isn't distributive over unions, so `Omit<ContentBlock, "id">`
// would collapse to only the fields shared by every variant. This keeps
// each variant's own fields intact.
export type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

// --- Club data ---

export interface ClubEventEntry {
  id: string;
  title: string;
  description: string;
  date: string; // ISO 8601, so it round-trips through localStorage
  location: string;
  isPublic: boolean;
  fee: number | null;
}

export interface ClubData {
  slug: string;
  name: string;
  logo: string;
  description: string;
  /** Nullable: clubs that haven't opted into in-app applications yet show no Apply button. */
  applicationsOpen: boolean;
  claimed?: boolean;
  events: ClubEventEntry[];
  content: ContentBlock[];
}

export const SEED_CLUBS: ClubData[] = [
  {
    slug: "chess-club",
    name: "Chess Club",
    logo: "/hero.png",
    description:
      "Texas A&M's Chess Club welcomes players of all skill levels — from first-movers to tournament veterans. We meet weekly to play casual games, study openings, and compete in collegiate tournaments across Texas.",
    applicationsOpen: true,
    events: [
      {
        id: "chess-club-tournament",
        title: "Chess Tournament",
        description:
          "Annual spring chess tournament open to all skill levels. Bring your A-game and compete for prizes.",
        date: "2026-07-20T14:00:00",
        location: "MSC Room 2406",
        isPublic: true,
        fee: 5,
      },
    ],
    content: [
      { id: "chess-h1", type: "header", text: "About Our Club" },
      {
        id: "chess-b1",
        type: "body",
        text: "Founded in 2004, the A&M Chess Club has grown to over 200 active members. We host weekly rated games, blitz tournaments, and study sessions led by FIDE-rated players. Whether you're picking up a pawn for the first time or looking to sharpen your endgame, you'll find a place here.",
      },
      { id: "chess-c1", type: "carousel", images: ["/sophie.png", "/hero.png", "/sophie.png"] },
      { id: "chess-h2", type: "header", text: "Upcoming Events & Competitions" },
      {
        id: "chess-b2",
        type: "body",
        text: "We compete in the Texas Collegiate Chess League each semester and send teams to the Pan-American Intercollegiate Chess Championship. Members who maintain a 1400+ USCF rating are eligible to represent A&M at regional tournaments, with travel costs partially covered by the club.",
      },
    ],
  },
  {
    slug: "environmental-awareness-club",
    name: "Environmental Awareness Club",
    logo: "/hero.png",
    description:
      "The Environmental Awareness Club works to make Texas A&M a more sustainable campus through education, community events, and direct action. Everyone who cares about the planet is welcome.",
    applicationsOpen: true,
    events: [
      {
        id: "eac-cleanup",
        title: "Community Cleanup Drive",
        description:
          "Help keep our campus beautiful! Join us for a morning cleanup session around the main quad.",
        date: "2026-07-22T09:00:00",
        location: "Main Quad",
        isPublic: true,
        fee: null,
      },
    ],
    content: [
      { id: "eac-h1", type: "header", text: "Our Mission" },
      {
        id: "eac-b1",
        type: "body",
        text: "We believe small actions compound into big change. From weekly campus cleanups to lobbying for composting infrastructure, EAC members are on the ground making A&M greener — one initiative at a time. All events are free and open to the entire student body.",
      },
      { id: "eac-c1", type: "carousel", images: ["/hero.png", "/sophie.png"] },
      { id: "eac-h2", type: "header", text: "Get Involved" },
      {
        id: "eac-b2",
        type: "body",
        text: "No experience necessary — just a willingness to show up. Our cleanup drives run every Saturday morning, and we hold a general meeting each month where members vote on new projects. Check back here for our full event calendar as the semester kicks off.",
      },
    ],
  },
  {
    slug: "engineering-leadership-society",
    name: "Engineering Leadership Society",
    logo: "/hero.png",
    description:
      "ELS bridges the gap between technical education and real-world leadership. We host speaker series, project sprints, and professional development workshops for engineering students who want to lead.",
    applicationsOpen: true,
    events: [
      {
        id: "els-gbm",
        title: "General Body Meeting",
        description:
          "Monthly GBM with officer elections and project updates for the upcoming semester.",
        date: "2026-07-24T18:30:00",
        location: "ZACH 310",
        isPublic: false,
        fee: null,
      },
    ],
    content: [
      { id: "els-h1", type: "header", text: "Why ELS?" },
      {
        id: "els-b1",
        type: "body",
        text: "Engineering curricula are great at teaching you how to build things — they're less great at teaching you how to lead teams, navigate ambiguity, or communicate technical ideas to non-technical stakeholders. ELS fills that gap with hands-on workshops, mentorship from industry engineers, and a community that takes both skills seriously.",
      },
      { id: "els-c1", type: "carousel", images: ["/sophie.png", "/hero.png", "/sophie.png", "/hero.png"] },
      { id: "els-h2", type: "header", text: "Membership" },
      {
        id: "els-b2",
        type: "body",
        text: "ELS is selective — we accept new members each fall through an application and interview process. Current members are expected to attend at least 80% of meetings and lead or contribute to at least one project per semester. If that sounds like your kind of commitment, we'd love to see your application.",
      },
    ],
  },
  {
    slug: "latin-dance-club",
    name: "Latin Dance Club",
    logo: "/hero.png",
    description:
      "Salsa, bachata, cumbia — if it's got rhythm, we dance it. The Latin Dance Club is a welcoming, high-energy community for anyone who wants to move, regardless of experience.",
    applicationsOpen: false,
    events: [
      {
        id: "ldc-salsa-night",
        title: "Salsa Night",
        description:
          "Learn basic salsa moves from our instructors and dance with fellow students. No experience required!",
        date: "2026-07-26T19:00:00",
        location: "Rec Center Ballroom",
        isPublic: true,
        fee: 3,
      },
    ],
    content: [
      { id: "ldc-h1", type: "header", text: "What We Do" },
      {
        id: "ldc-b1",
        type: "body",
        text: "Every week we run beginner and intermediate lessons taught by our own trained instructors, followed by an open social dance. Monthly themed events bring the whole campus together — past nights have included Cuban Night, Feria de Cali, and a Merengue Madness fundraiser that raised over $800 for local charities.",
      },
      { id: "ldc-c1", type: "carousel", images: ["/hero.png", "/sophie.png", "/hero.png"] },
      { id: "ldc-h2", type: "header", text: "Perform With Us" },
      {
        id: "ldc-b2",
        type: "body",
        text: "Each spring we put on a full showcase that draws 400+ attendees. Members who audition and make the performance team rehearse twice a week from February through April. No prior stage experience required — just dedication and a willingness to put in the work.",
      },
    ],
  },
  {
    slug: "pre-med-society",
    name: "Pre-Med Society",
    logo: "/hero.png",
    description:
      "PMS supports A&M pre-med students from their first semester through medical school applications with study groups, shadowing opportunities, and a strong alumni network.",
    applicationsOpen: true,
    events: [
      {
        id: "pms-study-session",
        title: "Pre-Med Study Session",
        description:
          "Focused MCAT prep session covering biochemistry and molecular biology. Resources provided.",
        date: "2026-07-28T15:00:00",
        location: "Evans Library Room 105",
        isPublic: false,
        fee: null,
      },
    ],
    content: [
      { id: "pms-h1", type: "header", text: "Resources We Offer" },
      {
        id: "pms-b1",
        type: "body",
        text: "Members get access to a curated library of MCAT prep materials, peer tutoring from students who scored 515+, and a shadowing database with over 40 physician partners in the Bryan-College Station area. We also host annual mock MMI interviews and personal statement review workshops.",
      },
      { id: "pms-c1", type: "carousel", images: ["/sophie.png", "/hero.png"] },
      { id: "pms-h2", type: "header", text: "The PMS Network" },
      {
        id: "pms-b2",
        type: "body",
        text: "Our alumni span medical schools from Baylor College of Medicine to Mayo Clinic Alix School of Medicine. Each semester we bring back recent matriculants for an honest Q&A — no polished talking points, just real answers about what the process looked like for them. This community is genuinely one of the strongest reasons to join.",
      },
    ],
  },
  {
    slug: "photography-club",
    name: "Photography Club",
    logo: "/hero.png",
    description:
      "A creative community for photographers of all levels. We shoot together, critique together, and grow together — whether you're working with a phone or a full-frame.",
    applicationsOpen: true,
    events: [
      {
        id: "photo-walk",
        title: "Photography Walk",
        description:
          "Explore campus through a lens. Bring your camera or phone — we'll share tips along the way.",
        date: "2026-08-01T10:00:00",
        location: "Meet at Academic Building Steps",
        isPublic: true,
        fee: null,
      },
    ],
    content: [
      { id: "photo-h1", type: "header", text: "What We're About" },
      {
        id: "photo-b1",
        type: "body",
        text: "Photography Club meets every other Thursday for critique sessions, gear demos, and member showcases. We run monthly themed photo challenges with a small prize for the community's top pick, and organize photo walks around campus and downtown Bryan. Gear doesn't matter — perspective does.",
      },
      { id: "photo-c1", type: "carousel", images: ["/hero.png", "/sophie.png", "/hero.png", "/sophie.png"] },
      { id: "photo-h2", type: "header", text: "Annual Showcase" },
      {
        id: "photo-b2",
        type: "body",
        text: "Every April we curate a gallery show of member work in the MSC gallery space. Submissions are open to all members, and a panel of faculty photographers selects pieces for print. Past shows have attracted coverage from The Battalion and visits from the College of Architecture's design students.",
      },
    ],
  },
];

/** Global key for a specific event, stable across the club it belongs to. */
export function eventKey(clubSlug: string, eventId: string): string {
  return `${clubSlug}:${eventId}`;
}
