export default function InfoPanel({ selectedRoute }) {
  return (
    <aside className="mt-4 md:mt-0 rounded-xl border border-gray-200 p-4 sticky top-20">
      <p className="text-xs font-semibold tracking-wide text-[#C28E0E] uppercase">
        Route Details
      </p>

      <h2 className="text-xl font-bold mt-1">{labelFor(selectedRoute)}</h2>

      <div className="mt-3 text-sm text-black">
        <p>
          <strong>Service Hours:</strong> Mon–Thu 8 a.m.–9 p.m., Fri 8 a.m.–1:15 p.m.
        </p>
        <p>
          <strong>Frequency:</strong> Every 15–20 minutes
        </p>
        <p className="mt-2">
          <strong>Status:</strong>{" "}
          <span className="text-green-600">Operating ●</span>
        </p>
      </div>

      <div className="mt-5">
        <p className="text-sm font-semibold text-black">Route Overview</p>
        <ul className="mt-2 space-y-2 text-sm text-black">
          {renderRouteInfo(selectedRoute)}
        </ul>
      </div>

      <div className="mt-6 text-xs text-black">
        <p>* Live vehicle and ETA tracking coming soon.</p>
      </div>
    </aside>
  );
}

function labelFor(id) {
  switch (id) {
    case "doermer":
      return "Doermer Route";
    case "canterbury":
      return "Canterbury Route";
    case "housing":
      return "Housing Route";
    default:
      return "All Routes";
  }
}

function renderRouteInfo(id) {
  switch (id) {
    case "doermer":
      return (
        <>
          <li>• Serves the Doermer School of Business and nearby buildings.</li>
          <li>• Ideal for students attending classes in business.</li>
        </>
      );
    case "canterbury":
      return (
        <>
          <li>• Covers Canterbury Green Apartments and nearby stops.</li>
          <li>• Connects residents to main campus buildings and student services.</li>
        </>
      );
    case "housing":
      return (
        <>
          <li>• Focused on on-campus student housing complexes.</li>
          <li>• Quick access to Walb Student Union and Kettler Hall.</li>
        </>
      );
    default:
      return (
        <>
          <li>• Shows all active campus shuttle routes.</li>
          <li>• Select a specific route for detailed view and schedule.</li>
        </>
      );
  }
}
