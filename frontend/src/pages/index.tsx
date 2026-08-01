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
        onSearch={async (query) => {
          try {
            const baseUrl = import.meta.env.VITE_API_URL || "";
            const res = await fetch(`${baseUrl}/api/clubs/search?query=${encodeURIComponent(query)}`);
            if (res.ok) {
              const data = await res.json();
              const mapped = data.map((club: any) => ({
                id: club.id || club.slug,
                title: club.name,
                description: club.description,
                imageSrc: club.logo || "/hero.png",
                tags: club.filters?.tags || []
              }));
              setEvents(mapped);
            }
          } catch (e) {
            console.error("Search failed:", e);
          }
        }}
      />
      <CardList events={events} />
    </PageWrapper>
  );
}
