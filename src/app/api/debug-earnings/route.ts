import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = 'force-dynamic'; // Prevent caching

// TIMEZONE HELPERS (COPIED FROM DASHBOARD)
const KL_OFFSET_MS = 8 * 60 * 60 * 1000;
function toKL(date: Date) {
    return new Date(date.getTime() + KL_OFFSET_MS);
}
function startOfDayKL(now: Date) {
    const kl = toKL(now);
    const y = kl.getUTCFullYear();
    const m = kl.getUTCMonth();
    const d = kl.getUTCDate();
    return new Date(Date.UTC(y, m, d, 0, 0, 0, 0) - KL_OFFSET_MS);
}

export async function GET() {
    const now = new Date();
    const dayStart = startOfDayKL(now);

    const { data: logs, error } = await supabaseAdmin
        .from("agreement_logs")
        .select("agreement_id, created_at, action, before, after")
        .gte("created_at", dayStart.toISOString())
        .in("action", ["updated", "extended", "deposit_refunded_toggled"])
        .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error });

    const analysis = (logs || []).map((log: any) => {
        const before = Number(log.before?.total_price || 0);
        const after = Number(log.after?.total_price || 0);
        const diff = after - before;

        return {
            id: log.agreement_id,
            created_at: log.created_at,
            action: log.action,
            before_price: log.before?.total_price,
            after_price: log.after?.total_price,
            diff,
            willCount: diff !== 0
        };
    });

    const totalDiff = analysis.reduce((acc: number, item: any) => acc + item.diff, 0);

    // Check specific agreement status
    // Search by plate or mobile
    const { data: ag } = await supabaseAdmin
        .from("agreements")
        .select("*, cars!inner(plate_number)")
        .eq("cars.plate_number", "VMQ 1695")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

    let specificLogs: any[] = [];
    if (ag) {
        const { data } = await supabaseAdmin
            .from("agreement_logs")
            .select("*")
            .eq("agreement_id", ag.id)
            .order("created_at", { ascending: false });
        specificLogs = data || [];
    }

    return NextResponse.json({
        now: now.toISOString(),
        dayStart: dayStart.toISOString(),
        currentAgreement: ag,
        specificLogs,
        totalLogsFound: logs?.length,
        totalDiff,
        analysis
    });
}
