import publishedIssue from "@/data/published-issue.json";

export const dynamic = "force-static";

export default function Home() {
  return (
    <main className="public-page">
      <article className="publication" aria-label="Potty Favor homepage">
        <header className="publication-header">
          <p className="eyebrow">Potty Favor</p>
          <h1>Potty Favor</h1>
          <p>{publishedIssue.issueMonthYear}</p>
        </header>
        <section className="panel">
          <h2>Monthly restroom reading that loads fast.</h2>
          <p>{publishedIssue.missionText}</p>
          <a className="pill-link" href="/issue">Read the latest issue</a>
        </section>
      </article>
    </main>
  );
}
