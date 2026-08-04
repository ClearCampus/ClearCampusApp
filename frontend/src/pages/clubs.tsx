import { Accordion } from "@heroui/react";
import { ChevronDownIcon } from "lucide-react";
import PageWrapper from "../components/PageWrapper";

const steps = [
  {
    number: "01",
    title: "Claim your club.",
    body: "If your officer email matches what's on file with A&M's directory, you can verify and claim your listing in minutes.",
  },
  {
    number: "02",
    title: "Make it yours.",
    body: "Update your meeting times, add photos, write a real description — anything that helps students get it instantly.",
  },
  {
    number: "03",
    title: "Manage applications in one place.",
    body: "No more spreadsheets or lost Google Form responses — see and respond to every applicant from one dashboard.",
  },
];

const features = [
  {
    title: "Free to claim",
    body: "Own your club's profile at no cost.",
  },
  {
    title: "Officer-verified claiming",
    body: "Matched against your listed A&M contact info, so only real officers can claim and edit.",
  },
  {
    title: "Full control over your listing",
    body: "Meeting times, dues, description, photos, social links — all editable anytime.",
  },
  {
    title: "Centralized applications",
    body: "Every applicant in one dashboard instead of scattered across forms and DMs.",
  },
  {
    title: "Better discoverability",
    body: "Show up when students search by interest, time commitment, or club type — not just by name.",
  },
  {
    title: "Multiple admin access",
    body: "[TBD: confirm if this is actually built — can more than one officer manage a listing?]",
  },
];

const faqItems = [
  {
    key: "free",
    title: "Is it free to claim our club's profile?",
    body: "Yes, claiming and managing your ClearCampus listing is free.",
  },
  {
    key: "verify",
    title: "How do you verify I'm actually an officer?",
    body: "We match the email you sign up with against the contact info listed for your club in A&M's official directory. If it matches, you're verified instantly.",
  },
  {
    key: "mismatch",
    title: "What if my officer email doesn't match what's on file?",
    body: "[TBD: this will come up a lot with officer turnover — what's the actual fallback/manual review path?]",
  },
  {
    key: "unclaimed",
    title: "What happens to clubs that haven't been claimed yet?",
    body: "Unclaimed clubs still appear in search using publicly available info, but they don't have a way to add applications, update details, or respond to students. Claiming gets you full control.",
  },
  {
    key: "turnover",
    title: "What happens when our officers change each year?",
    body: "[TBD: how does the platform handle this — does the new officer reclaim with their own matching email, or is there a hand-off feature?]",
  },
  {
    key: "multi-admin",
    title: "Can more than one officer manage the listing at once?",
    body: "[TBD — confirm if this is supported]",
  },
  {
    key: "data",
    title: "What do you do with applicant data?",
    body: "[TBD: this one matters for trust — worth having a real answer before launch]",
  },
  {
    key: "affiliated",
    title: "Is ClearCampus run by or affiliated with Texas A&M?",
    body: "No — ClearCampus is an independent platform built to help A&M clubs and students connect more easily.",
  },
];

export default function () {
  return (
    <PageWrapper page="clubs">
      {/* Hero */}
      <section className="flex flex-col items-center text-center gap-4 pt-8 max-w-2xl">
        <p className="text-sm font-medium tracking-widest uppercase text-default-500">
          For Clubs
        </p>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold leading-tight">
          Your club, easier to find.
        </h1>
        <p className="text-lg text-default-500 max-w-xl">
          Claim your free ClearCampus profile and reach students who are actually searching for what you offer.
        </p>
      </section>

      {/* The Problem */}
      <section className="flex flex-col items-center text-center gap-2 max-w-xl">
        <p className="text-2xl font-medium">
          Recruitment season means competing with 800 other orgs for five seconds of someone's attention.
        </p>
        <p className="text-default-500">
          ClearCampus puts your club in front of students who are already looking for exactly what you do.
        </p>
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
