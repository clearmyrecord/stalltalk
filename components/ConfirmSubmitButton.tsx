"use client";

export function ConfirmSubmitButton({ message, children, className, disabled }: { message: string; children: React.ReactNode; className?: string; disabled?: boolean }) {
  return <button disabled={disabled} className={className} onClick={(event) => { if (!window.confirm(message)) event.preventDefault(); }}>{children}</button>;
}
