import banner from "@/assets/potty-favor-original-banner-2.png";

export function PublicationHeader({ monthYear, venueLine }: { monthYear: string; venueLine?: string }) {
  return (
    <header className="masthead">
      <img className="masthead-banner" src={banner.src} alt="Potty Favor publication masthead" width={2171} height={724} />
      <h1 className="visually-hidden">Potty Favor <small>/ Stall Talk</small></h1>
      <div className="masthead-meta" aria-label="Issue information">
        <p className="issue-kicker">{monthYear}</p>
        <p className="issue-line">One standard monthly issue · Designed for every reader{venueLine ? ` · ${venueLine}` : ""}</p>
      </div>
      <a className="admin-link" href="/signin">Admin</a>
    </header>
  );
}

export function MissionCard({ missionText }: { missionText: string }) {
  return (
    <section className="mission-card panel">
      <p className="mission-kicker">Potty Favor Purpose</p>
      <h2>Our Mission</h2>
      <p>{missionText}</p>
    </section>
  );
}
