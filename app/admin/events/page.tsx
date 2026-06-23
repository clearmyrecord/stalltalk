import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminEventsPage() {
  const events = await prisma.event.findMany({ where: { issueMonth: "July", issueYear: 2026 }, orderBy: [{ status: "asc" }, { date: "asc" }] });
  return <section>
    <h1 className="font-display text-7xl uppercase">July 2026 Events Review</h1>
    <p className="font-bold">Approve, edit through the API, hide, delete, or publish source-attributed imported events to the July 2026 issue.</p>
    {!events.length ? <p className="mt-6 rounded-2xl border-4 border-ink bg-white p-5 font-black">No verified July 2026 Las Vegas community events found yet.</p> : <div className="mt-6 overflow-x-auto rounded-2xl border-4 border-ink bg-white shadow-brutal"><table className="w-full min-w-[1100px] text-left text-sm"><thead className="bg-stallYellow"><tr>{["Title","Date","Venue","Price","Status","Source","Admin actions"].map((h) => <th key={h} className="p-3 font-black uppercase">{h}</th>)}</tr></thead><tbody>{events.map((event) => <tr key={event.id} className="border-t-2 border-ink align-top"><td className="p-3 font-black">{event.title}<p className="font-normal">{event.description}</p></td><td className="p-3">{event.date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/Los_Angeles" })}<br />{event.startTime || "—"}{event.endTime ? `–${event.endTime}` : ""}</td><td className="p-3">{event.venue}<br />{event.address || "—"}</td><td className="p-3">{event.priceLabel || "See source"}</td><td className="p-3 font-black">{event.status}</td><td className="p-3"><a className="text-stallPurple underline" href={event.sourceUrl}>{event.sourceName}</a>{event.imageUrl ? <p>Image available</p> : null}</td><td className="p-3">PATCH /api/admin/events/{event.id} status=APPROVED, HIDDEN, PUBLISHED; DELETE to remove.</td></tr>)}</tbody></table></div>}
  </section>;
}
