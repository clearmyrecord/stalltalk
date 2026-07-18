"use client";

export function DeleteQrButton({ id }: { id: string }) {
  async function onDelete() {
    if (!window.confirm("Deactivate this QR placement? If scan history exists it will be preserved instead of deleted.")) return;
    const response = await fetch(`/api/admin/qr/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!response.ok) { alert(`Delete failed (${response.status})`); return; }
    window.location.reload();
  }
  return <button type="button" onClick={onDelete} className="rounded bg-stallRed p-2 text-xs font-black uppercase text-white">Deactivate</button>;
}
