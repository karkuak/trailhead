const TIPS = [
  {
    title: "Your first overnight",
    body: "Headlamp, warm layer, firestarter, and a daypack that fits it all — start there, add later.",
  },
  {
    title: "Seasonal refresh",
    body: "Swap in merino layers as fall nights get colder. Small changes keep you comfortable longer.",
  },
  {
    title: "Trip-based bundles",
    body: "Planning a weekend out? We're building bundles that match gear to the trip, not just the season.",
  },
];

export default function GuidePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-brand">The Guide</h1>
        <p className="text-foreground/60 text-sm">
          Lightweight recommendations that make curation feel personal, not generic.
        </p>
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        {TIPS.map((tip) => (
          <div key={tip.title} className="rounded-lg bg-brand-light p-5">
            <h2 className="font-semibold text-brand mb-1">{tip.title}</h2>
            <p className="text-sm text-foreground/70">{tip.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
