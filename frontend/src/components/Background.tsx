export default function () {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{
        backgroundImage:
          "radial-gradient(circle, var(--surface) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    >
      <div className="absolute -top-32 -left-32 h-128 w-128 rounded-full bg-accent/5 blur-3xl" />
      <div className="absolute -bottom-32 -right-32 h-128 w-128 rounded-full bg-accent/5 blur-3xl" />
    </div>
  );
}
