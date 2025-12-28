"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { normalizePhoneInternational } from "@/lib/phone";
import { useRole } from "@/lib/auth/useRole";

type CarRow = {
  id: string;
  plate_number: string;
  catalog_id: string;
  car_label: string;
  deposit: number | null;
  daily_price: number | null;
  price_3_days: number | null;
  weekly_price: number | null;
  monthly_price: number | null;
};

type Mode = "create" | "edit";

type InitialAgreement = {
  id?: string;
  customer_name?: string;
  id_number?: string;
  mobile?: string;
  status?: string;
  car_id?: string;
  date_start?: string;
  date_end?: string;
  start_time?: string;
  end_time?: string;
  total_price?: string | number;
  deposit_price?: string | number;
  agreement_url?: string | null;
};

function toMoney(v: any) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function nowTimeHHmm() {
  const d = new Date();
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function diffDays(startIso: string, endIso: string) {
  const a = new Date(startIso).getTime();
  const b = new Date(endIso).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 0;
  return Math.ceil((b - a) / (24 * 60 * 60 * 1000));
}

function suggestPrice(car: CarRow | null, days: number) {
  if (!car || days <= 0) return 0;
  if (days >= 30 && car.monthly_price != null) return Number(car.monthly_price);
  if (days >= 7 && car.weekly_price != null) return Number(car.weekly_price);
  if (days >= 3 && car.price_3_days != null) return Number(car.price_3_days);
  if (car.daily_price != null) return Number(car.daily_price) * days;
  return 0;
}

// ✅ simple sound player
function useSfx() {
  const clickRef = useRef<HTMLAudioElement | null>(null);
  const okRef = useRef<HTMLAudioElement | null>(null);
  const failRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    clickRef.current = new Audio("/sfx/click.mp3");
    okRef.current = new Audio("/sfx/success.mp3");
    failRef.current = new Audio("/sfx/fail.mp3");
  }, []);

  const play = (which: "click" | "ok" | "fail") => {
    const el =
      which === "click"
        ? clickRef.current
        : which === "ok"
        ? okRef.current
        : failRef.current;
    if (!el) return;
    try {
      el.currentTime = 0;
      void el.play();
    } catch {}
  };

  return { play };
}

export function AgreementForm({
  mode,
  initial,
  onDoneHref = "/admin/agreements",
}: {
  mode: Mode;
  initial?: InitialAgreement;
  onDoneHref?: string;
}) {
  const roleState = useRole(); // expect { role, email }
  const agentEmail = roleState?.email ?? "";
  const agentRole = roleState?.role ?? "admin";
  const isSuperadmin = agentRole === "superadmin";
  const isEdit = mode === "edit";

  const { play } = useSfx();

  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [cars, setCars] = useState<CarRow[]>([]);
  const [carId, setCarId] = useState(initial?.car_id ?? "");

  const selectedCar = useMemo(
    () => cars.find((c) => c.id === carId) ?? null,
    [cars, carId]
  );

  const [customerName, setCustomerName] = useState(
    initial?.customer_name ?? ""
  );
  const [idNumber, setIdNumber] = useState(initial?.id_number ?? "");
  const [mobile, setMobile] = useState(() => {
    const m = String(initial?.mobile ?? "").trim();
    if (!m) return "";
    return m.startsWith("+") ? m : `+${m}`;
  });

  const [startDate, setStartDate] = useState(initial?.date_start ?? "");
  const [startTime, setStartTime] = useState(
    initial?.start_time ?? nowTimeHHmm()
  );
  const [endDate, setEndDate] = useState(initial?.date_end ?? "");
  const [endTime, setEndTime] = useState(initial?.end_time ?? nowTimeHHmm());

  const [total, setTotal] = useState(String(initial?.total_price ?? "0"));
  const [deposit, setDeposit] = useState(String(initial?.deposit_price ?? "0"));
  const [status, setStatus] = useState(initial?.status ?? "New");

  // ✅ Track if user manually typed price/deposit
  const [totalTouched, setTotalTouched] = useState(false);
  const [depositTouched, setDepositTouched] = useState(false);

  const [previewUrl, setPreviewUrl] = useState<string | null>(
    initial?.agreement_url ?? null
  );
  const [confirmOpen, setConfirmOpen] = useState(false);

  // ✅ Dirty detection (for auto "Editted")
  const initialSnapshot = useMemo(() => {
    return {
      carId: initial?.car_id ?? "",
      customerName: initial?.customer_name ?? "",
      idNumber: initial?.id_number ?? "",
      mobile: (initial?.mobile ?? "").toString(),
      startDate: initial?.date_start ?? "",
      startTime: initial?.start_time ?? "",
      endDate: initial?.date_end ?? "",
      endTime: initial?.end_time ?? "",
      total: String(initial?.total_price ?? "0"),
      deposit: String(initial?.deposit_price ?? "0"),
      status: initial?.status ?? "New",
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial?.id]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/admin/cars/api?mode=dropdown", {
          cache: "no-store",
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Failed to load cars");
        setCars(Array.isArray(json?.rows) ? json.rows : []);
      } catch (e: any) {
        setErr(e?.message || "Failed to load cars");
        setCars([]);
      }
    })();
  }, []);

  const plate = (selectedCar?.plate_number ?? "").trim();
  const carLabel = (selectedCar?.car_label ?? "").trim();
  const catalogId = selectedCar?.catalog_id ?? null;

  const startIso = startDate ? `${startDate}T${startTime}:00` : "";
  const endIso = endDate ? `${endDate}T${endTime}:00` : "";
  const durationDays = startIso && endIso ? diffDays(startIso, endIso) : 0;

  // ✅ auto-fill deposit from car (only if user didn't touch deposit)
  useEffect(() => {
    if (!selectedCar) return;
    if (depositTouched) return;

    const carDep = selectedCar.deposit;
    if (carDep == null) return;
    const current = toMoney(deposit);
    if (current <= 0) setDeposit(String(carDep));
  }, [selectedCar, depositTouched]); // keep deps

  // ✅ ALWAYS recalc when car/dates change unless user manually edited total
  useEffect(() => {
    if (!selectedCar) return;
    if (!durationDays) return;
    if (totalTouched) return;

    const suggested = suggestPrice(selectedCar, durationDays);
    if (suggested > 0) setTotal(String(suggested.toFixed(2)));
  }, [selectedCar, durationDays, totalTouched]);

  // ✅ Auto-status Editted on any edit (unless already Cancelled)
  useEffect(() => {
    if (!isEdit) return;
    if (!initial?.id) return;

    const dirty =
      carId !== initialSnapshot.carId ||
      customerName !== initialSnapshot.customerName ||
      idNumber !== initialSnapshot.idNumber ||
      mobile !==
        (initialSnapshot.mobile.startsWith("+")
          ? initialSnapshot.mobile
          : `+${initialSnapshot.mobile}`) ||
      startDate !== initialSnapshot.startDate ||
      startTime !== initialSnapshot.startTime ||
      endDate !== initialSnapshot.endDate ||
      endTime !== initialSnapshot.endTime ||
      String(total) !== String(initialSnapshot.total) ||
      String(deposit) !== String(initialSnapshot.deposit);

    if (!dirty) return;

    // if user set Cancelled, keep it
    setStatus((s) => (s === "Cancelled" ? "Cancelled" : "Editted"));
  }, [
    isEdit,
    initial?.id,
    carId,
    customerName,
    idNumber,
    mobile,
    startDate,
    startTime,
    endDate,
    endTime,
    total,
    deposit,
    initialSnapshot,
  ]);

  const validate = () => {
    if (!customerName.trim()) return "Customer name required";
    if (!idNumber.trim()) return "IC/Passport required";
    if (!mobile.trim()) return "Mobile required";

    try {
      normalizePhoneInternational(mobile);
    } catch (e: any) {
      return e.message;
    }

    if (!carId) return "Select a car (plate)";
    if (!plate) return "Selected car plate missing (add car first)";
    if (!carLabel)
      return "Selected car model missing (catalog make/model missing)";
    if (!catalogId) return "Selected car catalog_id missing";

    if (!startDate || !startTime) return "Start date/time required";
    if (!endDate || !endTime) return "End date/time required";

    const a = new Date(startIso).getTime();
    const b = new Date(endIso).getTime();
    if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a)
      return "End must be after start";

    if (toMoney(total) <= 0) return "Total price required";
    if (toMoney(deposit) < 0) return "Deposit cannot be negative";

    if (mode === "edit" && !initial?.id) return "Missing agreement id";
    return null;
  };

  const preview = async () => {
    play("click");
    setErr(null);
    const v = validate();
    if (v) return setErr(v);

    setBusy(true);
    try {
      const res = await fetch("/admin/agreements/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "preview",
          payload: {
            agent_email: agentEmail,
            customer_name: customerName,
            id_number: idNumber,
            mobile,
            car_id: carId,
            catalog_id: catalogId,
            plate_number: plate,
            car_type: carLabel,
            date_start_iso: startIso,
            date_end_iso: endIso,
            booking_duration_days: durationDays,
            total_price: total,
            deposit_price: deposit,
            status,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Preview failed");
      setPreviewUrl(json.preview_url);
      setConfirmOpen(true);
      play("ok");
    } catch (e: any) {
      setErr(e?.message || "Preview failed");
      play("fail");
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    play("click");
    setErr(null);
    const v = validate();
    if (v) return setErr(v);

    setBusy(true);
    try {
      const action = mode === "edit" ? "confirm_update" : "confirm_create";

      const res = await fetch("/admin/agreements/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          payload: {
            id: mode === "edit" ? initial?.id : undefined,
            agent_email: agentEmail,
            customer_name: customerName,
            id_number: idNumber,
            mobile,
            car_id: carId,
            catalog_id: catalogId,
            plate_number: plate,
            car_type: carLabel,
            date_start_iso: startIso,
            date_end_iso: endIso,
            booking_duration_days: durationDays,
            total_price: total,
            deposit_price: deposit,
            status,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Save failed");

      play("ok");

      if (json.whatsapp_url)
        window.open(json.whatsapp_url, "_blank", "noopener,noreferrer");
      window.location.href = onDoneHref;
    } catch (e: any) {
      setErr(e?.message || "Save failed");
      play("fail");
    } finally {
      setBusy(false);
    }
  };

  const deleteAgreement = async () => {
    if (!isEdit || !initial?.id) return;
    if (!isSuperadmin) return;

    const ok = window.confirm("Delete this agreement? (Superadmin only)");
    if (!ok) return;

    play("click");
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/admin/agreements/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id: initial.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Delete failed");
      play("ok");
      window.location.href = onDoneHref;
    } catch (e: any) {
      setErr(e?.message || "Delete failed");
      play("fail");
    } finally {
      setBusy(false);
    }
  };

  // ✅ status control rules:
  // - superadmin: can select any
  // - admin: can only set Cancelled; otherwise status is locked (and auto becomes Editted on changes)
  const statusDisabled = !isSuperadmin && status !== "Cancelled";
  const statusOptions = isSuperadmin
    ? ["New", "Confirmed", "Editted", "Cancelled"]
    : ["Cancelled"];

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xl font-semibold">
            {mode === "edit" ? "Edit Agreement" : "New Agreement"}
          </div>
          <div className="text-sm opacity-70">
            Fill fields → Preview PDF → Confirm → WhatsApp
          </div>
          {mode === "edit" && initial?.id ? (
            <div className="text-xs opacity-60 mt-1">ID: {initial.id}</div>
          ) : null}
          {agentEmail ? (
            <div className="text-xs opacity-60 mt-1">Agent: {agentEmail}</div>
          ) : null}
        </div>

        <div className="flex gap-2 items-center">
          {isEdit && isSuperadmin ? (
            <Button
              variant="secondary"
              onClick={deleteAgreement}
              loading={busy}
            >
              Delete
            </Button>
          ) : null}

          <Link href={onDoneHref} className="underline">
            Back
          </Link>
        </div>
      </div>

      {err ? (
        <div className="rounded-lg border bg-red-50 text-red-700 p-3 text-sm">
          {err}
        </div>
      ) : null}

      <Card className="p-4 space-y-4">
        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <div className="text-xs opacity-60 mb-1">Customer Name</div>
            <input
              className="w-full border rounded-lg px-3 py-2"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </div>
          <div>
            <div className="text-xs opacity-60 mb-1">IC / Passport</div>
            <input
              className="w-full border rounded-lg px-3 py-2"
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
            />
          </div>
          <div>
            <div className="text-xs opacity-60 mb-1">Mobile (any country)</div>
            <input
              className="w-full border rounded-lg px-3 py-2"
              placeholder="+6017..., +447..., +971..."
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
            />
          </div>
        </div>

        <div>
          <div className="text-xs opacity-60 mb-1">Select Car (Plate)</div>
          <select
            className="w-full border rounded-lg px-3 py-2 bg-white"
            value={carId}
            onChange={(e) => setCarId(e.target.value)}
          >
            <option value="">Select…</option>
            {cars.map((c) => (
              <option key={c.id} value={c.id}>
                {c.plate_number} — {c.car_label}
              </option>
            ))}
          </select>

          {selectedCar ? (
            <div className="text-sm opacity-70 mt-1">
              Selected: <b>{plate}</b> — {carLabel}
            </div>
          ) : (
            <div className="text-sm text-amber-700 mt-1">
              If you can’t pick a plate, add the car first in Cars.
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-4 gap-3">
          <div>
            <div className="text-xs opacity-60 mb-1">Start Date</div>
            <input
              type="date"
              className="w-full border rounded-lg px-3 py-2"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <div className="text-xs opacity-60 mb-1">Start Time</div>
            <input
              type="time"
              className="w-full border rounded-lg px-3 py-2"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
          <div>
            <div className="text-xs opacity-60 mb-1">End Date</div>
            <input
              type="date"
              className="w-full border rounded-lg px-3 py-2"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div>
            <div className="text-xs opacity-60 mb-1">End Time</div>
            <input
              type="time"
              className="w-full border rounded-lg px-3 py-2"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-3">
          <div>
            <div className="text-xs opacity-60 mb-1">Total (RM)</div>
            <input
              type="number"
              className="w-full border rounded-lg px-3 py-2"
              value={total}
              onChange={(e) => {
                setTotalTouched(true);
                setTotal(e.target.value);
              }}
            />
            <div className="text-[11px] opacity-60 mt-1">
              Auto-recalculates when dates change unless you edit it manually.
            </div>
          </div>

          <div>
            <div className="text-xs opacity-60 mb-1">Deposit (RM)</div>
            <input
              type="number"
              className="w-full border rounded-lg px-3 py-2"
              value={deposit}
              onChange={(e) => {
                setDepositTouched(true);
                setDeposit(e.target.value);
              }}
            />
          </div>

          <div>
            <div className="text-xs opacity-60 mb-1">Duration (days)</div>
            <input
              className="w-full border rounded-lg px-3 py-2 bg-black/5"
              value={durationDays || ""}
              readOnly
            />
          </div>

          <div>
            <div className="text-xs opacity-60 mb-1">Status</div>

            {isSuperadmin ? (
              <select
                className="w-full border rounded-lg px-3 py-2 bg-white"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            ) : (
              <div className="space-y-2">
                <input
                  className="w-full border rounded-lg px-3 py-2 bg-black/5"
                  value={status}
                  readOnly
                />
                <select
                  className="w-full border rounded-lg px-3 py-2 bg-white"
                  value={status === "Cancelled" ? "Cancelled" : ""}
                  onChange={(e) => {
                    if (e.target.value === "Cancelled") setStatus("Cancelled");
                  }}
                >
                  <option value="">(Admin) Only Cancel allowed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            )}

            {!isSuperadmin ? (
              <div className="text-[11px] opacity-60 mt-1">
                Admin cannot set Confirmed/New. Edits auto-mark as{" "}
                <b>Editted</b>.
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={preview} loading={busy}>
            Preview PDF
          </Button>
        </div>
      </Card>

      {confirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6">
          <button
            className="absolute inset-0 bg-black/40"
            onClick={() => setConfirmOpen(false)}
          />
          <div className="relative w-full max-w-6xl rounded-xl border bg-white overflow-hidden">
            <div className="p-3 border-b flex items-center justify-between">
              <div className="font-semibold">Agreement Preview</div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setConfirmOpen(false)}
                >
                  Close
                </Button>
                <Button onClick={confirm} loading={busy}>
                  Confirm & Send WhatsApp
                </Button>
              </div>
            </div>

            <div className="p-3">
              {previewUrl ? (
                <div className="AgreementViewer">
                  <iframe
                    title="Agreement PDF"
                    src={previewUrl}
                    className="AgreementFrame"
                  />
                </div>
              ) : (
                <div className="p-6 text-center opacity-60">
                  Generating preview…
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <style jsx global>{`
        .AgreementViewer {
          width: 100%;
          height: 90vh;
          display: flex;
          justify-content: center;
        }
        .AgreementFrame {
          width: min(100%, 900px);
          aspect-ratio: 210 / 297;
          height: auto;
          border: 1px solid rgba(0, 0, 0, 0.12);
          border-radius: 12px;
          background: #fff;
        }
        @media (max-width: 768px) {
          .AgreementViewer {
            height: 80vh;
          }
          .AgreementFrame {
            width: 95vw;
          }
        }
      `}</style>
    </div>
  );
}
