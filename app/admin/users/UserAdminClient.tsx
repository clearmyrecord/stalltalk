"use client";

import { useMemo, useState } from "react";

type Linked = { id: string; name: string };
type User = { id: string; email: string; name: string; role: string; createdAt: string | Date; advertiser?: Linked | null; venue?: Linked | null };

export function UserAdminClient({ initialUsers, advertisers, venues }: { initialUsers: User[]; advertisers: Linked[]; venues: Linked[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [message, setMessage] = useState("");
  const [role, setRole] = useState("ADVERTISER");
  const showAdvertiser = role === "ADVERTISER";
  const showVenue = role === "VENUE_MANAGER";
  const sortedUsers = useMemo(() => [...users].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)), [users]);

  async function createUser(formData: FormData) {
    setMessage("Creating user…");
    const payload = Object.fromEntries(formData.entries());
    const response = await fetch("/api/admin/users", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...payload, createLinked: formData.get("createLinked") === "on" }) });
    const result = await response.json();
    if (!response.ok) return setMessage(result.error || "Unable to create user.");
    setUsers((current) => [result.user, ...current]);
    setMessage(`Created ${result.user.email}.`);
  }

  async function deleteUser(id: string) {
    if (!confirm("Delete this user account?")) return;
    const response = await fetch(`/api/admin/users?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) return setMessage(result.error || "Unable to delete user.");
    setUsers((current) => current.filter((user) => user.id !== id));
    setMessage("User deleted.");
  }

  return <div className="grid gap-6">
    <form action={createUser} className="grid gap-3 rounded-2xl border-4 border-ink bg-white p-4 shadow-brutal md:grid-cols-2">
      <div className="md:col-span-2"><h2 className="font-display text-5xl uppercase">Create User</h2>{message ? <p className="mt-2 rounded bg-stallYellow p-2 font-black">{message}</p> : null}</div>
      <label className="grid gap-1 font-black uppercase">Email<input name="email" type="email" required className="rounded border-2 border-ink p-3" /></label>
      <label className="grid gap-1 font-black uppercase">Name<input name="name" required className="rounded border-2 border-ink p-3" /></label>
      <label className="grid gap-1 font-black uppercase">Role<select name="role" value={role} onChange={(event) => setRole(event.target.value)} className="rounded border-2 border-ink p-3"><option>ADMIN</option><option>ADVERTISER</option><option>VENUE_MANAGER</option><option>DISTRIBUTOR</option></select></label>
      <label className="grid gap-1 font-black uppercase">Password<input name="password" type="password" required minLength={8} className="rounded border-2 border-ink p-3" /></label>
      <label className="grid gap-1 font-black uppercase">Confirm Password<input name="confirmPassword" type="password" required minLength={8} className="rounded border-2 border-ink p-3" /></label>
      <label className="flex items-center gap-2 rounded border-2 border-ink p-3 font-black uppercase"><input name="createLinked" type="checkbox" defaultChecked />Create linked record from name/email</label>
      {showAdvertiser ? <label className="grid gap-1 font-black uppercase">Linked Advertiser<select name="advertiserId" className="rounded border-2 border-ink p-3"><option value="">Create or leave unlinked</option>{advertisers.map((advertiser) => <option key={advertiser.id} value={advertiser.id}>{advertiser.name}</option>)}</select></label> : null}
      {showVenue ? <label className="grid gap-1 font-black uppercase">Linked Venue<select name="venueId" className="rounded border-2 border-ink p-3"><option value="">Create or leave unlinked</option>{venues.map((venue) => <option key={venue.id} value={venue.id}>{venue.name}</option>)}</select></label> : null}
      <button className="rounded bg-ink p-3 font-black uppercase text-white md:col-span-2">Create Account</button>
    </form>
    <section className="overflow-x-auto rounded-2xl border-4 border-ink bg-white shadow-brutal"><table className="w-full min-w-[900px] text-left"><thead className="bg-ink text-white"><tr>{["Email", "Name", "Role", "Linked Advertiser", "Linked Venue", "Created Date", "Actions"].map((h) => <th key={h} className="p-3 text-sm font-black uppercase">{h}</th>)}</tr></thead><tbody>{sortedUsers.map((user) => <tr key={user.id} className="border-t-2 border-ink"><td className="p-3 font-bold">{user.email}</td><td className="p-3">{user.name}</td><td className="p-3 font-black">{user.role}</td><td className="p-3">{user.advertiser?.name || "—"}</td><td className="p-3">{user.venue?.name || "—"}</td><td className="p-3">{new Date(user.createdAt).toLocaleDateString()}</td><td className="p-3"><button onClick={() => deleteUser(user.id)} className="rounded bg-stallRed px-3 py-2 font-black uppercase text-white">Delete</button></td></tr>)}</tbody></table></section>
  </div>;
}
