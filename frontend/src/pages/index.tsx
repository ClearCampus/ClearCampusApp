import { useState } from "react";
import CardList, { type EventCardData } from "../components/ClubCard";
import PageWrapper from "../components/PageWrapper";
import RainbowInput from "../components/RainbowInput";

export default function () {
  const [events, setEvents] = useState<EventCardData[]>([]);

  return (
    <PageWrapper page="home">
      <h1 className="text-5xl font-semibold">Club search, simplified.</h1>
      <RainbowInput
        onSearch={() => {
          setEvents([
            {
              id: "chess-club",
              description:
                "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
              title: "Chess Club in the Park",
              imageSrc: "/sophie.png",
              tags: ["Tag #1", "Tag #2"],
            },
            {
              id: "environmental-awareness-club",
              description:
                "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
              title: "Environmental Awareness Club",
              imageSrc: "/sophie.png",
              tags: ["Tag #1", "Tag #2"],
            },
            {
              id: "engineering-leadership-society",
              description:
                "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
              title: "Engineering Leadership Society",
              imageSrc: "/sophie.png",
              tags: ["Tag #1", "Tag #2"],
            },
            {
              id: "latin-dance-club",
              description:
                "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
              title: "Latin Dance Club",
              imageSrc: "/sophie.png",
              tags: ["Tag #1", "Tag #2"],
            },
          ]);
        }}
      />
      <CardList events={events} />
    </PageWrapper>
  );
}
