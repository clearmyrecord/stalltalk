"use client";

export function DeleteQrButton({ id }: { id: string }) {
  async function onDelete() {
    if (!window.confirm("Delete this QR code? Existing printed stickers will stop tracking.")) return;
    const response = await fetch(`/api/admin/qr/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!response.ok) {
      alert(`Delete failed (${response.status})`);
      return;
    }
    window.location.reload();
  }
  return <button type="button" onClick={onDelete} className="rounded bg-stallRed p-2 text-xs font-black uppercase text-white">Delete</button>;
}
