import { Accordion } from "@heroui/react";
import { ChevronDownIcon } from "lucide-react";
import PageWrapper from "../components/PageWrapper";

const steps = [
  {
    number: "01",
    title: "Tell us what you're into.",
    body: `Describe your interests in your own words — "I want something low-commitment where I can play music" or "pre-vet clubs with hands-on experience" — and ClearCampus finds the closest matches, not just keyword hits.`,
  },
  {
    number: "02",
    title: "Filter it down.",
    body: "Narrow by time commitment, membership cost, and club type to find exactly what fits your schedule and budget.",
  },
  {
    number: "03",
    title: "Apply in the app.",
    body: "No hunting for a buried Google Form or DMing an Instagram account that hasn't posted since last fall. Apply directly and track your status in one place.",
  },
];

const features = [
  {
    title: "Natural language search",
    body: "Describe what you want in plain English — ClearCampus finds the matches.",
  },
  {
    title: "Smart filters",
    body: "Time commitment, fees, club type, and more.",
  },
  {
    title: "In-app applications",
    body: "Apply directly — no forms scattered across the internet.",
  },
  {
    title: "Application tracker",
    body: "See everything you've applied to and its status, in one place.",
  },
  {
    title: "Verified club info",
    body: "Claimed clubs keep their details current, so you're not relying on a stale listing.",
  },
  {
    title: "Save for later",
    body: "Bookmark clubs you're curious about and come back when you're ready.",
  },
];

const faqItems = [
  {
    key: "free",
    title: "Is ClearCampus free for students?",
    body: "Yes — completely free, no catch.",
  },
  {
    key: "browse",
    title: "Do I need an account to browse clubs?",
    body: "No, although an account gives you personalization features that enhance your searching experience.",
  },
  {
    key: "different",
    title: "How is this different from official club directories?",
    body: "ClearCampus builds on public directories but makes them actually searchable — with natural language search, real filters, and the ability to apply directly instead of just seeing a name and an email address.",
  },
  {
    key: "accurate",
    title: "How do you know the club info is accurate?",
    body: "Clubs that have been claimed by a verified officer keep their own info up to date. Unclaimed clubs show what's publicly available. [TBD: do you want to label unclaimed clubs differently in the UI?]",
  },
  {
    key: "missing",
    title: "What if I can't find my club?",
    body: "You can open a ticket with us at help@clearcampus.club",
  },
  {
    key: "affiliated",
    title: "Is ClearCampus affiliated with any universities?",
    body: "No, ClearCampus is an independent platform built for college students, not run by any universities.",
  },
];

export default function () {
  return (
    <PageWrapper page="students">
      {/* Hero */}
      <section className="flex flex-col items-center text-center gap-4 pt-8 max-w-2xl">
        <p className="text-sm font-medium tracking-widest uppercase text-default-500">
          For Students
        </p>
        <h1 className="text-5xl font-semibold leading-tight">
          Find your people.<br />Skip the guesswork.
        </h1>
        <p className="text-lg text-default-500 max-w-xl">
          ClearCampus helps college students discover clubs that actually fit them — and apply in seconds, right from the app.
        </p>
      </section>

      {/* The Problem */}
      <section className="flex flex-col items-center text-center gap-2 max-w-xl">
        <p className="text-2xl font-medium">
          3,000+ student organizations. One overwhelming directory.
        </p>
        <p className="text-default-500">ClearCampus makes it actually usable.</p>
      </section>

      {/* How It Works */}
      <section className="flex flex-col gap-6 w-full max-w-2xl">
        <h2 className="text-3xl font-semibold">How It Works</h2>
        <div className="flex flex-col gap-4">
          {steps.map((step) => (
            <div key={step.number} className="flex gap-5 items-start">
              <span className="text-2xl font-semibold text-default-300 w-10 shrink-0">
                {step.number}
              </span>
              <div className="flex flex-col gap-1">
                <p className="font-semibold text-lg">{step.title}</p>
                <p className="text-default-500">{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="flex flex-col gap-6 w-full max-w-2xl">
        <h2 className="text-3xl font-semibold">Features</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="flex flex-col gap-1 rounded-xl border border-default-200 p-5"
            >
              <p className="font-semibold">{feature.title}</p>
              <p className="text-sm text-default-500">{feature.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="flex flex-col gap-6 w-full max-w-2xl pb-8">
        <h2 className="text-3xl font-semibold">FAQ</h2>
        <Accordion className="w-full">
      {faqItems.map((item, index) => (
        <Accordion.Item key={index}>
          <Accordion.Heading>
            <Accordion.Trigger>
              {item.title}
              <Accordion.Indicator>
                <ChevronDownIcon />
              </Accordion.Indicator>
            </Accordion.Trigger>
          </Accordion.Heading>
          <Accordion.Panel>
            <Accordion.Body>{item.body}</Accordion.Body>
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>
      </section>
    </PageWrapper>
  );
}
