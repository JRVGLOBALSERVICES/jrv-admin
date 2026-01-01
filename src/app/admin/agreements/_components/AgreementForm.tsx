"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { normalizePhoneInternational } from "@/lib/phone";
import { useRole } from "@/lib/auth/useRole";
import { PdfViewer } from "./PdfViewer";
import { uploadImage } from "@/lib/upload";
import {
  RotateCcw,
  Trash2,
  ShieldAlert,
  CheckCircle,
  Upload,
  ScanLine,
  XCircle,
  Loader2,
  Calendar,
  Clock,
  User,
  CreditCard,
  Phone,
  Car,
  History,
  AlertTriangle,
} from "lucide-react";

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
  ic_url?: string | null;
};

// --- HELPERS ---
function toMoney(v: any) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}
function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function nowTimeHHmm() {
  const d = new Date(Date.now() + 8 * 60 * 60 * 1000);
  return `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
}
function klLocalToUtcIso(dateYYYYMMDD: string, timeHHmm: string) {
  const [y, m, d] = dateYYYYMMDD.split("-").map((x) => Number(x));
  const [hh, mm] = timeHHmm.split(":").map((x) => Number(x));
  if (!y || !m || !d || !Number.isFinite(hh) || !Number.isFinite(mm)) return "";
  const ms = Date.UTC(y, m - 1, d, hh - 8, mm, 0, 0);
  const dt = new Date(ms);
  return Number.isNaN(dt.getTime()) ? "" : dt.toISOString();
}
function diffDays(startIso: string, endIso: string) {
  const a = new Date(startIso).getTime();
  const b = new Date(endIso).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 0;
  return Math.ceil((b - a) / (24 * 60 * 60 * 1000));
}
function suggestPrice(car: any, days: number) {
  if (!car || days <= 0) return 0;
  let remaining = days;
  let total = 0;
  const monthly = car.monthly_price ? Number(car.monthly_price) : Infinity;
  const weekly = car.weekly_price ? Number(car.weekly_price) : Infinity;
  const promo3 = car.price_3_days ? Number(car.price_3_days) : Infinity;
  const daily = car.daily_price ? Number(car.daily_price) : Infinity;

  if (remaining >= 30 && monthly !== Infinity) {
    total += Math.floor(remaining / 30) * monthly;
    remaining %= 30;
  }
  if (remaining >= 7 && weekly !== Infinity) {
    total += Math.floor(remaining / 7) * weekly;
    remaining %= 7;
  }
  if (remaining >= 3 && promo3 !== Infinity) {
    total += Math.floor(remaining / 3) * promo3;
    remaining %= 3;
  }
  if (remaining > 0 && daily !== Infinity) {
    total += remaining * daily;
  }
  return total;
}

function useSfx() {
  const clickRef = useRef<HTMLAudioElement | null>(null);
  const okRef = useRef<HTMLAudioElement | null>(null);
  const failRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    if (typeof window !== "undefined") {
      clickRef.current = new Audio("/sfx/click.mp3");
      okRef.current = new Audio("/sfx/success.mp3");
      failRef.current = new Audio("/sfx/fail.mp3");
    }
  }, []);
  const play = (which: "click" | "ok" | "fail") => {
    const el =
      which === "click"
        ? clickRef.current
        : which === "ok"
        ? okRef.current
        : failRef.current;
    if (el) {
      el.currentTime = 0;
      void el.play();
    }
  };
  return { play };
}

async function checkBlacklist(type: "mobile" | "ic", value: string) {
  if (!value || value.length < 5) return null;
  try {
    const res = await fetch("/admin/blacklist/check", {
      method: "POST",
      body: JSON.stringify({ type, value }),
    });
    const j = await res.json();
    return j.blacklisted ? j.entry : null;
  } catch {
    return null;
  }
}

async function checkHistory(ic: string, mobile: string) {
  if (ic.length < 6 && mobile.length < 6) return null;
  try {
    const res = await fetch("/admin/agreements/api/check-history", {
      method: "POST",
      body: JSON.stringify({ ic, mobile }),
    });
    const j = await res.json();
    return j.found ? j.agreement : null;
  } catch {
    return null;
  }
}

export function AgreementForm({
  mode,
  initial,
  onDoneHref = "/admin/agreements",
}: {
  mode: "create" | "edit";
  initial?: InitialAgreement;
  onDoneHref?: string;
}) {
  const roleState = useRole();
  const agentEmail = roleState?.email ?? "";
  const agentRole = roleState?.role ?? "admin";
  const isSuperadmin = agentRole === "superadmin";
  const isEdit = mode === "edit";
  const isDeleted = initial?.status === "Deleted";
  const { play } = useSfx();

  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteStage, setDeleteStage] = useState<"idle" | "confirm">("idle");

  const [cars, setCars] = useState<any[]>([]);
  const [carId, setCarId] = useState(initial?.car_id ?? "");
  const selectedCar = useMemo(
    () => cars.find((c) => c.id === carId) ?? null,
    [cars, carId]
  );

  // Form Fields
  const [customerName, setCustomerName] = useState(
    (initial?.customer_name ?? "").toUpperCase()
  );
  const [idNumber, setIdNumber] = useState(
    (initial?.id_number ?? "").toUpperCase()
  );
  const [mobile, setMobile] = useState(() => {
    const m = String(initial?.mobile ?? "").trim();
    if (!m) return "";
    return m.startsWith("+") ? m : `+${m}`;
  });

  const [icFile, setIcFile] = useState<File | null>(null);
  const [icPreview, setIcPreview] = useState<string | null>(
    initial?.ic_url ?? null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Loading States
  const [checkingMobile, setCheckingMobile] = useState(false);
  const [checkingId, setCheckingId] = useState(false);

  const [blacklistAlert, setBlacklistAlert] = useState<{
    type: string;
    value: string;
    reason: string;
  } | null>(null);
  const [historyMatch, setHistoryMatch] = useState<any>(null);

  const [idStatus, setIdStatus] = useState<"idle" | "safe" | "danger">("idle");
  const [mobileStatus, setMobileStatus] = useState<"idle" | "safe" | "danger">(
    "idle"
  );

  // Dates & Prices
  const [startDate, setStartDate] = useState(
    (initial?.date_start ?? "").slice(0, 10)
  );
  const [startTime, setStartTime] = useState(
    initial?.start_time ?? nowTimeHHmm()
  );
  const [endDate, setEndDate] = useState(
    (initial?.date_end ?? "").slice(0, 10)
  );
  const [endTime, setEndTime] = useState(initial?.end_time ?? nowTimeHHmm());
  const [total, setTotal] = useState(String(initial?.total_price ?? "0"));
  const [deposit, setDeposit] = useState(String(initial?.deposit_price ?? "0"));
  const [status, setStatus] = useState(initial?.status ?? "New");
  const [totalTouched, setTotalTouched] = useState(false);
  const [depositTouched, setDepositTouched] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    initial?.agreement_url ?? null
  );
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Sync Initial
  useEffect(() => {
    if (initial?.ic_url) setIcPreview(initial.ic_url);
    if (initial?.customer_name)
      setCustomerName(initial.customer_name.toUpperCase());
    if (initial?.id_number) setIdNumber(initial.id_number.toUpperCase());
  }, [initial]);

  useEffect(() => {
    (async () => {
      try {
        const url = new URL("/admin/cars/api", window.location.origin);
        url.searchParams.set("mode", "dropdown");
        if (isEdit && initial?.car_id)
          url.searchParams.set("include", initial.car_id);
        const res = await fetch(url.toString());
        const json = await res.json();
        setCars(json.rows || []);
      } catch {}
    })();
  }, [isEdit, initial?.car_id]);

  const startIso = useMemo(
    () => (startDate && startTime ? klLocalToUtcIso(startDate, startTime) : ""),
    [startDate, startTime]
  );
  const endIso = useMemo(
    () => (endDate && endTime ? klLocalToUtcIso(endDate, endTime) : ""),
    [endDate, endTime]
  );
  const durationDays = startIso && endIso ? diffDays(startIso, endIso) : 0;

  useEffect(() => {
    if (!selectedCar || totalTouched) return;
    if (durationDays > 0)
      setTotal(String(suggestPrice(selectedCar, durationDays).toFixed(2)));
    else setTotal("0.00");
  }, [selectedCar, durationDays, totalTouched]);

  // ✅ HANDLERS
  const handleMobileBlur = async () => {
    if (mobile.length < 6) return;
    setCheckingMobile(true);
    setMobileStatus("idle");

    const bl = await checkBlacklist("mobile", mobile);
    if (!historyMatch && mode === "create") {
      const hist = await checkHistory("", mobile);
      if (hist) setHistoryMatch(hist);
    }
    setCheckingMobile(false);

    if (bl) {
      setMobileStatus("danger");
      setBlacklistAlert({
        type: "Mobile Number",
        value: mobile,
        reason: bl.reason,
      });
      play("fail");
    } else {
      setMobileStatus("safe");
    }
  };

  const handleIdBlur = async () => {
    if (idNumber.length < 6) return;
    setCheckingId(true);
    setIdStatus("idle");

    const bl = await checkBlacklist("ic", idNumber);
    if (!historyMatch && mode === "create") {
      const hist = await checkHistory(idNumber, "");
      if (hist) setHistoryMatch(hist);
    }
    setCheckingId(false);

    if (bl) {
      setIdStatus("danger");
      setBlacklistAlert({
        type: "IC Number",
        value: idNumber,
        reason: bl.reason,
      });
      play("fail");
    } else {
      setIdStatus("safe");
    }
  };

  const confirmHistoryUse = () => {
    if (!historyMatch) return;
    setCustomerName(historyMatch.customer_name?.toUpperCase() || "");
    if (historyMatch.id_number)
      setIdNumber(historyMatch.id_number.toUpperCase());
    if (historyMatch.mobile) setMobile(historyMatch.mobile);
    if (historyMatch.ic_url) {
      setIcPreview(historyMatch.ic_url);
      setIcFile(null);
    }
    setHistoryMatch(null);
    play("ok");
  };

  const handleScan = async () => {
    if (!icFile) return setErr("Please select an IC image first.");
    setBusy(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.append("file", icFile);
      const res = await fetch("/api/ocr/scan", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Scan failed");

      if (json.data.name) setCustomerName(json.data.name.toUpperCase());
      if (json.data.id_number) {
        const id = json.data.id_number.toUpperCase();
        setIdNumber(id);
        setCheckingId(true);
        checkBlacklist("ic", id).then((entry) => {
          setCheckingId(false);
          if (entry) {
            setBlacklistAlert({
              type: "IC Number",
              value: id,
              reason: entry.reason,
            });
            play("fail");
            setIdStatus("danger");
          } else {
            play("ok");
            setIdStatus("safe");
          }
        });
      } else {
        play("ok");
      }
    } catch (e: any) {
      setErr("Scan failed: " + e.message);
      play("fail");
    } finally {
      setBusy(false);
    }
  };

  const handleIcSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const f = e.target.files[0];
      setIcFile(f);
      setIcPreview(URL.createObjectURL(f));
    }
  };

  const validate = () => {
    if (!customerName) return "Customer Name is required";
    if (!idNumber) return "IC / Passport is required";
    if (!mobile) return "Mobile Number is required";
    if (!carId) return "Please select a Car";
    if (toMoney(total) <= 0) return "Total Price is required";
    return null;
  };

  const executeSave = async (overrideStatus?: string) => {
    setErr(null);
    const v = validate();
    if (v) return setErr(v);
    setBusy(true);
    try {
      // 🚨 BLOCKING BLACKLIST CHECK
      const blMobile = await checkBlacklist("mobile", mobile);
      if (blMobile) {
        throw new Error(
          `Mobile number ${mobile} is BLACKLISTED. Cannot proceed until removed.`
        );
      }

      const blIc = await checkBlacklist("ic", idNumber);
      if (blIc) {
        throw new Error(
          `IC number ${idNumber} is BLACKLISTED. Cannot proceed until removed.`
        );
      }

      let finalIcUrl = initial?.ic_url ?? null;
      if (icFile) {
        finalIcUrl = await uploadImage(icFile);
      } else if (
        icPreview &&
        typeof icPreview === "string" &&
        icPreview.startsWith("http")
      ) {
        finalIcUrl = icPreview;
      }

      const payload = {
        id: initial?.id,
        customer_name: customerName.toUpperCase(),
        id_number: idNumber.toUpperCase(),
        mobile,
        car_id: carId,
        plate_number: (selectedCar?.plate_number || "").toUpperCase(),
        car_type: (selectedCar?.car_label || "").toUpperCase(),
        date_start_iso: startIso,
        date_end_iso: endIso,
        booking_duration_days: durationDays,
        total_price: total,
        deposit_price: deposit,
        status: overrideStatus || status,
        agent_email: agentEmail,
        ic_url: finalIcUrl,
      };

      const res = await fetch("/admin/agreements/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: mode === "edit" ? "confirm_update" : "confirm_create",
          payload,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");

      play("ok");
      if (json.whatsapp_url) window.open(json.whatsapp_url, "_blank");
      window.location.href = onDoneHref;
    } catch (e: any) {
      setErr(e.message);
      play("fail");
    } finally {
      setBusy(false);
    }
  };

  const preview = async () => {
    // 🚨 BLOCKING BLACKLIST CHECK FOR PREVIEW TOO
    const blMobile = await checkBlacklist("mobile", mobile);
    if (blMobile) return setErr(`Mobile number ${mobile} is BLACKLISTED.`);
    const blIc = await checkBlacklist("ic", idNumber);
    if (blIc) return setErr(`IC number ${idNumber} is BLACKLISTED.`);

    if (icFile) {
      try {
        const tempUrl = await uploadImage(icFile);
        callPreviewApi(tempUrl);
      } catch {
        setErr("Failed to upload IC for preview");
      }
    } else {
      callPreviewApi(icPreview);
    }
  };

  const callPreviewApi = async (icUrlOverride: string | null) => {
    setBusy(true);
    try {
      const res = await fetch("/admin/agreements/api", {
        method: "POST",
        body: JSON.stringify({
          action: "preview",
          payload: {
            customer_name: customerName.toUpperCase(),
            id_number: idNumber.toUpperCase(),
            mobile,
            plate_number: (selectedCar?.plate_number || "").toUpperCase(),
            car_type: (selectedCar?.car_label || "").toUpperCase(),
            date_start_iso: startIso,
            date_end_iso: endIso,
            total_price: total,
            deposit_price: deposit,
            ic_url: icUrlOverride,
            agent_email: agentEmail,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Preview generation failed");

      if (json.preview_url) {
        setPreviewUrl(json.preview_url);
        setConfirmOpen(true);
        play("ok");
      }
    } catch (e: any) {
      console.error(e);
      setErr(e.message);
      play("fail");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteClick = async () => {
    if (!initial?.id) return;
    if (deleteStage === "idle") {
      setDeleteStage("confirm");
      play("click");
      setTimeout(() => setDeleteStage("idle"), 4000);
      return;
    }
    if (deleteStage === "confirm") {
      play("click");
      setBusy(true);
      setErr(null);
      try {
        await fetch("/admin/agreements/api", {
          method: "POST",
          body: JSON.stringify({ action: "delete", id: initial.id }),
        });
        play("ok");
        window.location.href = onDoneHref;
      } catch (e: any) {
        setErr(e?.message || "Delete failed");
        play("fail");
        setBusy(false);
        setDeleteStage("idle");
      }
    }
  };

  const handleRestoreClick = async () => await executeSave("Editted");

  const statusOptions = isSuperadmin
    ? ["New", "Editted", "Cancelled", "Deleted", "Completed"]
    : ["New", "Editted", "Cancelled"];

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-5xl mx-auto">
      {/* ✅ GENERIC ERROR MODAL */}
      {err && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4 animate-in fade-in backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl border-l-4 border-red-500 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-red-100 rounded-full text-red-600">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-red-700 font-bold text-lg">
                Action Required
              </h3>
            </div>
            <p className="text-gray-700 font-medium text-sm leading-relaxed mb-4">
              {err}
            </p>
            <Button
              onClick={() => setErr(null)}
              className="w-full bg-red-600 hover:bg-red-700 text-white shadow-md"
            >
              Okay, I'll fix it
            </Button>
          </div>
        </div>
      )}

      {/* Blacklist Modal */}
      {blacklistAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl border-l-4 border-red-600 max-w-md shadow-2xl w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full text-red-600">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className="text-red-700 font-bold text-lg">
                Blacklist Warning
              </h3>
            </div>
            <p className="text-gray-800 font-medium">
              The {blacklistAlert.type}{" "}
              <span className="font-mono bg-red-100 px-1 rounded mx-1">
                {blacklistAlert.value}
              </span>{" "}
              is in the blacklist.
            </p>
            <p className="text-sm bg-red-50 p-4 mt-4 rounded-xl text-red-800 border border-red-100">
              <strong>Reason:</strong>{" "}
              {blacklistAlert.reason || "No reason provided."}
            </p>
            <Button
              onClick={() => setBlacklistAlert(null)}
              className="mt-6 w-full bg-red-600 hover:bg-red-700 text-white shadow-md"
            >
              Acknowledge Warning
            </Button>
          </div>
        </div>
      )}

      {/* History Match Modal */}
      {historyMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md border border-blue-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-full text-blue-600">
                <History className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-gray-900 font-bold text-lg">
                  Found Existing Customer
                </h3>
                <p className="text-xs text-gray-500">
                  Matches your input details
                </p>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl space-y-2 mb-6 border border-gray-100">
              <div className="text-sm">
                <strong>Name:</strong> {historyMatch.customer_name}
              </div>
              <div className="text-sm">
                <strong>IC:</strong> {historyMatch.id_number}
              </div>
              <div className="text-sm">
                <strong>Mobile:</strong> {historyMatch.mobile}
              </div>
              {historyMatch.ic_url && (
                <div className="mt-2 text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Previous IC Image
                  Available
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => setHistoryMatch(null)}
                variant="secondary"
                className="flex-1"
              >
                Ignore
              </Button>
              <Button
                onClick={confirmHistoryUse}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                Use Previous Data
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-xl font-bold flex items-center gap-2">
          {mode === "edit" ? "Edit Agreement" : "New Agreement"}
          {isDeleted && (
            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold border border-red-200">
              DELETED
            </span>
          )}
        </h1>
        <div className="flex gap-2 w-full md:w-auto">
          {isEdit &&
            isSuperadmin &&
            (isDeleted ? (
              <Button
                onClick={handleRestoreClick}
                loading={busy}
                variant="secondary"
                className="flex-1 md:flex-none bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
              >
                Restore
              </Button>
            ) : (
              <Button
                onClick={handleDeleteClick}
                loading={busy}
                variant="secondary"
                className="flex-1 md:flex-none text-red-600 border-red-200 hover:bg-red-50 shadow-sm"
              >
                {deleteStage === "confirm" ? "Confirm?" : "Delete"}
              </Button>
            ))}
          <Link
            href={onDoneHref}
            className="text-sm underline self-center px-2 text-gray-500"
          >
            Back
          </Link>
        </div>
      </div>

      <Card className="p-4 space-y-5">
        {/* IC UPLOAD & SCAN */}
        <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex flex-col md:flex-row gap-5 items-start shadow-sm">
          <div className="relative w-full md:w-40 h-48 md:h-32 bg-white border-2 border-dashed border-blue-200 rounded-lg flex items-center justify-center overflow-hidden shrink-0 group hover:border-blue-400 transition-all shadow-sm">
            {icPreview ? (
              <img
                src={icPreview}
                alt="IC"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-center flex flex-col items-center">
                <Upload className="w-8 h-8 text-blue-300 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs text-blue-400 font-bold uppercase tracking-wider">
                  Upload IC
                </span>
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={handleIcSelect}
            />
          </div>

          <div className="flex-1 w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-blue-900 flex items-center gap-2">
                <ScanLine className="w-4 h-4" /> CUSTOMER DETAILS
              </h3>
              <Button
                onClick={handleScan}
                variant="secondary"
                size="sm"
                className="bg-white border-blue-200 text-blue-700 hover:bg-blue-50 shadow-sm"
              >
                Scan & Auto-fill
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-500 mb-1 font-semibold uppercase flex items-center gap-1">
                  <User className="w-3 h-3" /> Full Name
                </div>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm uppercase shadow-sm focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                  value={customerName}
                  onChange={(e) =>
                    setCustomerName(e.target.value.toUpperCase())
                  }
                  placeholder="AS PER IC / PASSPORT"
                />
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1 font-semibold uppercase flex items-center gap-1">
                  <CreditCard className="w-3 h-3" /> IC / Passport
                </div>
                <div className="relative">
                  <input
                    className={`w-full border rounded-lg px-3 py-2 text-sm uppercase shadow-sm focus:ring-2 outline-none transition-all pr-8 ${
                      idStatus === "danger"
                        ? "border-red-500 bg-red-50 focus:ring-red-100"
                        : idStatus === "safe"
                        ? "border-green-500 bg-green-50/30 focus:ring-green-100"
                        : "focus:ring-blue-100"
                    }`}
                    value={idNumber}
                    onChange={(e) => {
                      setIdNumber(e.target.value.toUpperCase());
                      setIdStatus("idle");
                    }}
                    onBlur={handleIdBlur}
                    placeholder="000000-00-0000"
                  />
                  <div className="absolute right-3 top-2.5 pointer-events-none">
                    {checkingId ? (
                      <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                    ) : idStatus === "safe" ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : idStatus === "danger" ? (
                      <XCircle className="w-4 h-4 text-red-600" />
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-xs opacity-60 mb-1 uppercase font-bold flex items-center gap-1">
              <Phone className="w-3 h-3" /> Mobile
            </div>
            <div className="relative">
              <input
                className={`w-full border rounded-lg px-3 py-2 shadow-sm focus:ring-2 outline-none transition-all pr-8 ${
                  mobileStatus === "danger"
                    ? "border-red-500 bg-red-50 focus:ring-red-100"
                    : mobileStatus === "safe"
                    ? "border-green-500 bg-green-50/30 focus:ring-green-100"
                    : "focus:ring-blue-100"
                }`}
                value={mobile}
                onChange={(e) => {
                  setMobile(e.target.value);
                  setMobileStatus("idle");
                }}
                onBlur={handleMobileBlur}
                placeholder="+60..."
              />
              <div className="absolute right-3 top-2.5 pointer-events-none">
                {checkingMobile ? (
                  <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                ) : mobileStatus === "safe" ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : mobileStatus === "danger" ? (
                  <XCircle className="w-4 h-4 text-red-600" />
                ) : null}
              </div>
            </div>
          </div>

          <div>
            <div className="text-xs opacity-60 mb-1 uppercase font-bold flex items-center gap-1">
              <Car className="w-3 h-3" /> Car Selection
            </div>
            <select
              className="w-full border rounded-lg px-3 py-2 uppercase bg-white shadow-sm focus:ring-2 focus:ring-blue-100 outline-none"
              value={carId}
              onChange={(e) => setCarId(e.target.value)}
            >
              <option value="">SELECT CAR...</option>
              {cars.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.plate_number.toUpperCase()} — {c.car_label.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div>
            <div className="text-xs opacity-60 font-bold mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Start Date
            </div>
            <input
              type="date"
              className="w-full border rounded px-2 py-2 shadow-sm focus:ring-2 focus:ring-blue-50 outline-none"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <div className="text-xs opacity-60 font-bold mb-1 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Start Time
            </div>
            <input
              type="time"
              className="w-full border rounded px-2 py-2 shadow-sm focus:ring-2 focus:ring-blue-50 outline-none"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
          <div>
            <div className="text-xs opacity-60 font-bold mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> End Date
            </div>
            <input
              type="date"
              className="w-full border rounded px-2 py-2 shadow-sm focus:ring-2 focus:ring-blue-50 outline-none"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div>
            <div className="text-xs opacity-60 font-bold mb-1 flex items-center gap-1">
              <Clock className="w-3 h-3" /> End Time
            </div>
            <input
              type="time"
              className="w-full border rounded px-2 py-2 shadow-sm focus:ring-2 focus:ring-blue-50 outline-none"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-xs opacity-60 font-bold mb-1">Total (RM)</div>
            <input
              type="number"
              className="w-full border rounded-lg px-3 py-2 font-black text-green-700 text-lg shadow-sm bg-green-50/20 border-green-200 focus:ring-2 focus:ring-green-200 outline-none transition-all"
              value={total}
              onChange={(e) => {
                setTotal(e.target.value);
                setTotalTouched(true);
              }}
            />
          </div>
          <div>
            <div className="text-xs opacity-60 font-bold mb-1">
              Deposit (RM)
            </div>
            <input
              type="number"
              className="w-full border rounded-lg px-3 py-2 shadow-sm font-semibold text-gray-700 focus:ring-2 focus:ring-gray-100 outline-none"
              value={deposit}
              onChange={(e) => setDeposit(e.target.value)}
            />
          </div>
        </div>

        <div>
          <div className="text-xs opacity-60 mb-1 font-bold">Status</div>
          <select
            disabled={isDeleted}
            className="w-full border rounded-lg px-3 py-2 bg-white disabled:bg-gray-100 shadow-sm focus:ring-2 focus:ring-gray-100 outline-none"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            variant="secondary"
            onClick={preview}
            loading={busy}
            className="shadow-sm w-full md:w-auto"
          >
            Preview PDF
          </Button>
        </div>
      </Card>

      {/* PDF Modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-0 md:p-4">
          <div className="bg-white w-full h-full md:h-[85vh] md:max-w-4xl md:rounded-xl flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50 shrink-0">
              <span className="font-bold text-lg">Confirm Agreement</span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setConfirmOpen(false)}
                >
                  Edit
                </Button>
                <Button
                  onClick={() => executeSave()}
                  loading={busy}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Send WhatsApp
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-gray-100">
              {previewUrl && <PdfViewer url={previewUrl} />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
