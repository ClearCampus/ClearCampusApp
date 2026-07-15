import { Button, FieldError, Form, Input, Label, Link, TextArea, TextField } from "@heroui/react";
import { ArrowLeftIcon, CheckCircle2Icon } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router";
import PageWrapper from "../../components/PageWrapper";
import { submitApplication } from "../../lib/data/applicationStore";
import { useClubData } from "../../lib/data/ClubDataContext";

const CLASSIFICATIONS = ["Freshman", "Sophomore", "Junior", "Senior", "Graduate"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function () {
  const { club: slug } = useParams<{ club: string }>();
  const { getClub } = useClubData();
  const club = slug ? getClub(slug) : undefined;

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [classification, setClassification] = useState(CLASSIFICATIONS[0]);
  const [major, setMajor] = useState("");
  const [phone, setPhone] = useState("");
  const [motivation, setMotivation] = useState("");
  const [experience, setExperience] = useState("");
  const [availability, setAvailability] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!club) {
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

  if (!club.applicationsOpen) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center gap-4 pt-16 text-center max-w-md">
          <p className="text-lg">{club.name} isn't accepting in-app applications right now.</p>
          <Link href={`/club/${club.slug}`}>
            <Button variant="outline">
              <ArrowLeftIcon size={16} />
              Back to {club.name}
            </Button>
          </Link>
        </div>
      </PageWrapper>
    );
  }

  if (submitted) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center gap-4 pt-16 text-center max-w-md">
          <CheckCircle2Icon size={40} className="text-success" />
          <h1 className="text-2xl font-semibold">Application sent!</h1>
          <p className="text-default-500">
            {club.name} will follow up with you at {email}.
          </p>
          <Link href={`/club/${club.slug}`}>
            <Button variant="outline">
              <ArrowLeftIcon size={16} />
              Back to {club.name}
            </Button>
          </Link>
        </div>
      </PageWrapper>
    );
  }

  function toggleDay(day: string) {
    setAvailability((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!fullName || !email || !major || !motivation) {
      setError("Please fill out all required fields.");
      return;
    }
    submitApplication({
      clubSlug: club!.slug,
      fullName,
      email,
      classification,
      major,
      phone,
      motivation,
      experience,
      availability,
    });
    setSubmitted(true);
  }

  return (
    <PageWrapper>
      <div className="w-full max-w-xl flex flex-col gap-6 pt-8 pb-8">
        <Link href={`/club/${club.slug}`} className="self-start">
          <Button variant="ghost" size="sm">
            <ArrowLeftIcon size={16} />
            Back to {club.name}
          </Button>
        </Link>

        <div className="flex items-center gap-4">
          <img
            src={club.logo}
            alt={club.name}
            className="w-12 h-12 rounded-xl object-cover border border-default-200"
          />
          <div>
            <p className="text-sm font-medium tracking-widest uppercase text-default-500">
              Apply to
            </p>
            <h1 className="text-2xl font-semibold">{club.name}</h1>
          </div>
        </div>

        <Form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <TextField
            name="fullName"
            isRequired
            value={fullName}
            onChange={setFullName}
            className="flex flex-col gap-1 w-full"
          >
            <Label className="text-sm font-medium">Full name</Label>
            <Input placeholder="Reveille Longhorn" className="w-full" />
            <FieldError className="text-xs" />
          </TextField>

          <TextField
            name="email"
            type="email"
            isRequired
            value={email}
            onChange={setEmail}
            className="flex flex-col gap-1 w-full"
          >
            <Label className="text-sm font-medium">Email</Label>
            <Input placeholder="you@tamu.edu" className="w-full" />
            <FieldError className="text-xs" />
          </TextField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" htmlFor="classification">
                Classification
              </label>
              <select
                id="classification"
                value={classification}
                onChange={(e) => setClassification(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-default-100 border border-default-200 text-sm"
              >
                {CLASSIFICATIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <TextField
              name="major"
              isRequired
              value={major}
              onChange={setMajor}
              className="flex flex-col gap-1 w-full"
            >
              <Label className="text-sm font-medium">Major</Label>
              <Input placeholder="Computer Science" className="w-full" />
              <FieldError className="text-xs" />
            </TextField>
          </div>

          <TextField
            name="phone"
            type="tel"
            value={phone}
            onChange={setPhone}
            className="flex flex-col gap-1 w-full"
          >
            <Label className="text-sm font-medium">Phone (optional)</Label>
            <Input placeholder="(555) 555-5555" className="w-full" />
          </TextField>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Which days work for meetings? (optional)</span>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((day) => (
                <Button
                  key={day}
                  type="button"
                  size="sm"
                  variant={availability.includes(day) ? "primary" : "outline"}
                  onPress={() => toggleDay(day)}
                >
                  {day}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" htmlFor="motivation">
              Why do you want to join {club.name}?
            </label>
            <TextArea
              id="motivation"
              value={motivation}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMotivation(e.target.value)}
              required
              className="w-full min-h-28 px-3 py-2 rounded-lg bg-default-100 border border-default-200 text-sm"
              placeholder="Tell us a bit about yourself and why you're interested..."
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" htmlFor="experience">
              Relevant experience (optional)
            </label>
            <TextArea
              id="experience"
              value={experience}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setExperience(e.target.value)}
              className="w-full min-h-20 px-3 py-2 rounded-lg bg-default-100 border border-default-200 text-sm"
              placeholder="Any related experience, skills, or past involvement"
            />
          </div>

          {error && <p className="text-xs text-danger">{error}</p>}

          <Button type="submit" variant="primary" fullWidth>
            Submit Application
          </Button>
        </Form>
      </div>
    </PageWrapper>
  );
}
