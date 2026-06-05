import { OpenAiTestButton } from "./OpenAiTestButton";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return <section className="grid gap-5">
    <div>
      <p className="font-black uppercase tracking-[.25em] text-stallRed">Settings</p>
      <h1 className="font-display text-7xl uppercase">AI & Deployment</h1>
      <p className="max-w-4xl font-bold">Use this page to verify that Stall Talk can reach OpenAI before generating production ad graphics.</p>
    </div>
    <OpenAiTestButton />
  </section>;
}
