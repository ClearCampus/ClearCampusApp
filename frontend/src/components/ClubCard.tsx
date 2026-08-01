import { Button, Card, Chip, Link } from "@heroui/react";
import { ExternalLinkIcon } from "lucide-react";
import { motion, type Variants } from "motion/react";
import SaveButton from "./SaveButton";

// --- Types ---

export interface EventCardData {
  id: string;
  title: string;
  description: string;
  imageSrc: string;
  tags: string[];
}

interface EventCardProps {
  title: string;
  description: string;
  imageSrc: string;
  tags: string[];
}

interface CardListProps {
  events: EventCardData[];
}

// --- Variants (typed as Variants so TS validates the keys/shape) ---

const containerVariants: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

// --- Components ---

function EventCard({ id, title, description, imageSrc, tags }: EventCardProps & { id: string }) {
  return (
    <motion.div variants={itemVariants}>
      <Card className="col-span-12 flex h-auto min-h-[152px] flex-col sm:flex-row w-full">
        <div className="relative h-[140px] w-full shrink-0 overflow-hidden rounded-full sm:h-[120px] sm:w-[120px]">
          <img
            alt={""}
            className="pointer-events-none absolute inset-0 h-full w-full scale-125 object-cover select-none"
            loading="lazy"
            src={imageSrc}
          />
        </div>
        <div className="flex flex-1 flex-col gap-3">
          <Card.Header className="gap-1">
            <div className="flex items-start justify-between gap-2">
              <Card.Title className="pr-8">{title}</Card.Title>
              <SaveButton kind="club" id={id} />
            </div>
            <Card.Description>{description}</Card.Description>
          </Card.Header>
          <Card.Footer className="mt-auto flex w-full flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-row gap-2">
              {tags.map((tag) => (
                <Chip key={tag} variant="soft" color="success">
                  {tag}
                </Chip>
              ))}
            </div>
            <Link href={`/club/${id}`} className="w-full sm:w-auto">
              <Button className="w-full">
                See More
                <ExternalLinkIcon />
              </Button>
            </Link>
          </Card.Footer>
        </div>
      </Card>
    </motion.div>
  );
}

export default function CardList({ events }: CardListProps) {
  return (
    <motion.div
      className="flex flex-col gap-4"
      initial="hidden"
      animate="show"
      variants={containerVariants}
    >
      {events.map((event) => (
        <EventCard
          key={event.id}
          id={event.id}
          title={event.title}
          description={event.description}
          imageSrc={event.imageSrc}
          tags={event.tags}
        />
      ))}
    </motion.div>
  );
}
