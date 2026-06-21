import Link from "next/link";

export const dynamic = "force-dynamic";

const actions = [
  { href: "/signup?type=advertiser", label: "Create advertiser account", className: "bg-ink text-white" },
  { href: "/signup?type=venue", label: "Create venue account", className: "bg-stallYellow text-ink" },
  { href: "/issue", label: "Read the issue", className: "border-4 border-ink bg-white text-ink" },
  { href: "/issue", label: "Watch demo", className: "border-4 border-ink bg-stallYellow text-ink" }
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-paper px-4 py-5 text-ink sm:p-8">
      <section className="mx-auto max-h-[85svh] w-[min(92vw,900px)] max-w-[900px] overflow-hidden rounded-2xl border-4 border-ink bg-white p-[18px] shadow-brutal sm:p-6">
        <p className="mb-2 font-black uppercase tracking-[.25em] text-stallRed">Potty Favor</p>
        <h1 className="mb-5 max-w-[10ch] break-words font-display text-[clamp(3rem,8vw,7rem)] uppercase leading-[0.9] tracking-[-0.03em]">
          Bathroom ads that people actually read.
        </h1>
        <p className="mb-7 max-w-[600px] text-left text-[clamp(1rem,2vw,1.25rem)] font-bold leading-tight">
          AI-powered restroom publications that help venues, advertisers, and distributors reach people where attention is highest.
        </p>
        <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-3">
          {actions.map((action) => (
            <Link
              key={action.label}
              className={`flex min-h-16 w-full items-center justify-center rounded-[18px] px-4 text-center text-[1.15rem] font-extrabold uppercase leading-tight ${action.className}`}
              href={action.href}
            >
              {action.label}
            </Link>
          ))}
        </div>
      </section>
      <footer className="mx-auto mt-8 w-[min(92vw,900px)] max-w-[900px] font-bold">
        <Link className="underline" href="/signup?type=advertiser">Advertise with us</Link>
        <span> · </span>
        <Link className="underline" href="/signup?type=venue">Add your venue</Link>
      </footer>
    </main>
  );
}
