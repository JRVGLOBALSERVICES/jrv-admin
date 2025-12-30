// src/app/admin/site-events/page.tsx
import SiteEventsClient from "./_components/SiteEventsClient";

function startOfDayIso(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString();
}
function endOfDayIso(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x.toISOString();
}

export default async function SiteEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const sp = await searchParams;

  const now = new Date();
  const initialFrom = sp.from || startOfDayIso(now);
  const initialTo = sp.to || endOfDayIso(now);

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      <SiteEventsClient initialFrom={initialFrom} initialTo={initialTo} />
    </div>
  );
}
