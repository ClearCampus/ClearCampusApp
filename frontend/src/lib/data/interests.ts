export interface InterestChip {
  id: string;
  label: string;
}

export interface InterestCategory {
  id: string;
  label: string;
  chips: InterestChip[];
}

export const INTEREST_CATEGORIES: InterestCategory[] = [
  {
    id: "academic",
    label: "Academic & Professional",
    chips: [
      { id: "consulting", label: "Consulting" },
      { id: "engineering", label: "Engineering" },
      { id: "pre-health", label: "Pre-Health" },
      { id: "business", label: "Business" },
      { id: "research", label: "Research" },
    ],
  },
  {
    id: "arts",
    label: "Arts & Culture",
    chips: [
      { id: "music", label: "Music" },
      { id: "photography", label: "Photography" },
      { id: "theater", label: "Theater" },
      { id: "dance", label: "Dance" },
      { id: "writing", label: "Writing" },
    ],
  },
  {
    id: "sports",
    label: "Sports & Recreation",
    chips: [
      { id: "club-sports", label: "Club Sports" },
      { id: "outdoors", label: "Outdoors" },
      { id: "esports", label: "Esports" },
      { id: "fitness", label: "Fitness" },
    ],
  },
  {
    id: "service",
    label: "Service & Advocacy",
    chips: [
      { id: "volunteering", label: "Volunteering" },
      { id: "sustainability", label: "Sustainability" },
      { id: "policy", label: "Policy & Advocacy" },
      { id: "philanthropy", label: "Philanthropy" },
    ],
  },
  {
    id: "identity",
    label: "Cultural & Identity",
    chips: [
      { id: "cultural-heritage", label: "Cultural Heritage" },
      { id: "international", label: "International Students" },
      { id: "lgbtq", label: "LGBTQ+" },
      { id: "faith", label: "Faith-Based" },
    ],
  },
  {
    id: "hobbies",
    label: "Hobbies & Games",
    chips: [
      { id: "board-games", label: "Board Games" },
      { id: "chess", label: "Chess" },
      { id: "gaming", label: "Video Games" },
      { id: "cooking", label: "Cooking" },
    ],
  },
  {
    id: "greek",
    label: "Greek Life",
    chips: [
      { id: "fraternity", label: "Fraternity" },
      { id: "sorority", label: "Sorority" },
      { id: "professional-greek", label: "Professional Greek" },
    ],
  },
];
