import type { FleetDTO } from "@/lib/defs";

const REPORTS_SHOWN = 6;

/** the latest battle and colonisation reports, newest first */
export default function Reports({ fleets }: { fleets: FleetDTO[] }) {
  const reports = fleets.filter((fleet) => fleet.report).slice(-REPORTS_SHOWN).reverse();

  return (
    <div className="panel">
      <h2>Reports</h2>
      {reports.length === 0 && <div className="dim">No reports yet.</div>}
      {reports.map((fleet) => <div className="report" key={fleet.id}>{fleet.report}</div>)}
    </div>
  );
}
