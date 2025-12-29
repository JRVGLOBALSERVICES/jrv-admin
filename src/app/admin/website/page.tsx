import { Suspense } from "react";
import { createSupabaseServer } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Website Traffic",
  description: "Live tracking of page views and leads.",
  path: "/admin/website",
});

export default async function WebsiteTrafficPage() {
  await requireAdmin();
  const supabase = await createSupabaseServer();

  // 1. Fetch Events (Last 30 Days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: events } = await supabase
    .from("website_events")
    .select("*")
    .gte("created_at", thirtyDaysAgo.toISOString())
    .order("created_at", { ascending: false });

  const rows = events || [];

  // 2. Metrics Calculation
  const totalViews = rows.filter(e => e.event_type === 'pageview').length;
  const totalClicks = rows.filter(e => e.event_type.includes('click')).length;
  
  // Sources
  const sources = new Map<string, number>();
  rows.forEach(e => {
    const s = e.source || 'direct';
    sources.set(s, (sources.get(s) || 0) + 1);
  });
  
  const topSources = Array.from(sources.entries()).sort((a, b) => b[1] - a[1]);

  // Conversion Rate (Clicks / Views)
  const convRate = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : "0.0";

  return (
    <div className="p-4 md:p-6 space-y-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold text-gray-900">Website & Traffic</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border shadow-sm">
          <div className="text-xs font-bold text-gray-400 uppercase">Total Views</div>
          <div className="text-3xl font-bold text-blue-600 mt-1">{totalViews}</div>
          <div className="text-xs text-gray-500 mt-1">Last 30 days</div>
        </div>
        <div className="bg-white p-5 rounded-xl border shadow-sm">
          <div className="text-xs font-bold text-gray-400 uppercase">Button Clicks</div>
          <div className="text-3xl font-bold text-green-600 mt-1">{totalClicks}</div>
          <div className="text-xs text-gray-500 mt-1">Leads generated</div>
        </div>
        <div className="bg-white p-5 rounded-xl border shadow-sm">
          <div className="text-xs font-bold text-gray-400 uppercase">Organic vs Direct</div>
          <div className="text-3xl font-bold text-purple-600 mt-1">
            {Math.round((sources.get('google') || 0) / (rows.length || 1) * 100)}%
          </div>
          <div className="text-xs text-gray-500 mt-1">Organic Search</div>
        </div>
        <div className="bg-white p-5 rounded-xl border shadow-sm">
          <div className="text-xs font-bold text-gray-400 uppercase">Conversion Rate</div>
          <div className="text-3xl font-bold text-gray-800 mt-1">{convRate}%</div>
          <div className="text-xs text-gray-500 mt-1">Click-through</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Source Breakdown */}
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <h3 className="font-bold text-gray-800 mb-4">Traffic Sources</h3>
          <div className="space-y-3">
            {topSources.map(([source, count]) => (
              <div key={source} className="flex items-center justify-between">
                <span className="text-sm font-medium capitalize text-gray-700">{source}</span>
                <div className="flex items-center gap-3 flex-1 justify-end">
                  <div className="w-32 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-blue-500 h-2 rounded-full" 
                      style={{ width: `${(count / rows.length) * 100}%` }} 
                    />
                  </div>
                  <span className="text-sm font-bold w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Events Log */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col h-[400px]">
          <div className="p-4 border-b bg-gray-50 font-bold text-gray-800">Live Event Log</div>
          <div className="overflow-y-auto flex-1">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 font-medium sticky top-0">
                <tr>
                  <th className="px-4 py-2">Time</th>
                  <th className="px-4 py-2">Event</th>
                  <th className="px-4 py-2">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.slice(0, 50).map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-500 whitespace-nowrap">
                      {new Date(e.created_at).toLocaleString('en-MY', { 
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                      })}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        e.event_type === 'pageview' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'
                      }`}>
                        {e.event_type}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-600 truncate max-w-[200px]">
                      {e.path} <span className="text-xs opacity-50">({e.source})</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}