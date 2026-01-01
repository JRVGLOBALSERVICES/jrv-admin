"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useRole } from "@/lib/auth/useRole";
import { PdfViewer } from "./PdfViewer";
import { uploadImage } from "@/lib/upload";
import {
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
  Share2,
} from "lucide-react";

// --- STYLES ---
const inputClass =
  "w-full border-0 bg-gray-50/50 rounded-lg px-3 py-2 text-sm ring-1 ring-gray-200 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-inner placeholder:text-gray-400 text-gray-800 uppercase h-10";
const labelClass =
  "text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5";

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
  if (!y || !m || !d) return "";
  const ms = Date.UTC(y, m - 1, d, hh - 8, mm, 0, 0);
  const dt = new Date(ms);
  return Number.isNaN(dt.getTime()) ? "" : dt.toISOString();
}
function diffDays(startIso: string, endIso: string) {
  const a = new Date(startIso).getTime();
  const b = new Date(endIso).getTime();
  if (b <= a) return 0;
  return Math.ceil((b - a) / (24 * 60 * 60 * 1000));
}
function suggestPrice(car: any, days: number) {
  if (!car || days <= 0) return 0;
  let remaining = days;
  let total = 0;
  const monthly = car.monthly_price || Infinity;
  const weekly = car.weekly_price || Infinity;
  const promo3 = car.price_3_days || Infinity;
  const daily = car.daily_price || Infinity;
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

// Safe Sound Hook
function useSfx() {
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});
  useEffect(() => {
    if (typeof window !== "undefined") {
      audioRefs.current = {
        click: new Audio("/sfx/click.mp3"),
        ok: new Audio("/sfx/success.mp3"),
        fail: new Audio("/sfx/fail.mp3"),
      };
    }
  }, []);
  const play = (key: string) => {
    try {
      const audio = audioRefs.current[key];
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      }
    } catch {}
  };
  return { play };
}

async function checkBlacklist(type: string, value: string) {
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
  const isSuperadmin = roleState?.role === "superadmin";
  const { play } = useSfx();

  // ✅ Fix: Define these variables based on props
  const isEdit = mode === "edit";
  const isDeleted = initial?.status === "Deleted";

  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteStage, setDeleteStage] = useState<"idle" | "confirm">("idle");
  const [cars, setCars] = useState<any[]>([]);

  // State
  const [carId, setCarId] = useState(initial?.car_id ?? "");
  const [customerName, setCustomerName] = useState(
    (initial?.customer_name ?? "").toUpperCase()
  );
  const [idNumber, setIdNumber] = useState(
    (initial?.id_number ?? "").toUpperCase()
  );
  const [mobile, setMobile] = useState(initial?.mobile ?? "");

  const [icFile, setIcFile] = useState<File | null>(null);
  const [icPreview, setIcPreview] = useState<string | null>(
    initial?.ic_url ?? null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [checkingMobile, setCheckingMobile] = useState(false);
  const [checkingId, setCheckingId] = useState(false);
  const [blacklistAlert, setBlacklistAlert] = useState<any>(null);
  const [historyMatch, setHistoryMatch] = useState<any>(null);

  const [idStatus, setIdStatus] = useState("idle");
  const [mobileStatus, setMobileStatus] = useState("idle");

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

  const [previewUrl, setPreviewUrl] = useState<string | null>(
    initial?.agreement_url ?? null
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [totalTouched, setTotalTouched] = useState(false);

  const selectedCar = useMemo(
    () => cars.find((c) => c.id === carId) ?? null,
    [cars, carId]
  );

  // Sync Initial Data
  useEffect(() => {
    if (initial) {
      if (initial.car_id) setCarId(initial.car_id);
      if (initial.mobile) setMobile(initial.mobile);
      if (initial.customer_name)
        setCustomerName(initial.customer_name.toUpperCase());
      if (initial.id_number) setIdNumber(initial.id_number.toUpperCase());
      if (initial.ic_url) setIcPreview(initial.ic_url);
      if (initial.total_price) setTotal(String(initial.total_price));
      if (initial.deposit_price) setDeposit(String(initial.deposit_price));
      if (initial.status) setStatus(initial.status);
      if (initial.date_start) setStartDate(initial.date_start.slice(0, 10));
      if (initial.date_end) setEndDate(initial.date_end.slice(0, 10));
      if (initial.start_time) setStartTime(initial.start_time);
      if (initial.end_time) setEndTime(initial.end_time);
    }
  }, [initial]);

  // Load Cars
  useEffect(() => {
    (async () => {
      const url = new URL("/admin/cars/api", window.location.origin);
      url.searchParams.set("mode", "dropdown");
      if (initial?.car_id) url.searchParams.set("include", initial.car_id);
      try {
        const res = await fetch(url.toString());
        const json = await res.json();
        if (json.rows) setCars(json.rows);
      } catch {}
    })();
  }, [initial?.car_id]);

  const startIso = useMemo(
    () => klLocalToUtcIso(startDate, startTime),
    [startDate, startTime]
  );
  const endIso = useMemo(
    () => klLocalToUtcIso(endDate, endTime),
    [endDate, endTime]
  );
  const durationDays = useMemo(
    () => diffDays(startIso, endIso),
    [startIso, endIso]
  );

  useEffect(() => {
    if (selectedCar && durationDays > 0 && !totalTouched)
      setTotal(suggestPrice(selectedCar, durationDays).toFixed(2));
  }, [selectedCar, durationDays, totalTouched]);

  // Handlers
  const handleMobileBlur = async () => {
    if (mobile.length < 5) return;
    setCheckingMobile(true);
    setMobileStatus("checking");
    const bl = await checkBlacklist("mobile", mobile);
    if (!historyMatch && mode === "create") {
      const h = await checkHistory("", mobile);
      if (h) setHistoryMatch(h);
    }
    setCheckingMobile(false);
    if (bl) {
      setMobileStatus("danger");
      setBlacklistAlert({ type: "Mobile", value: mobile, reason: bl.reason });
      play("fail");
    } else {
      setMobileStatus("safe");
    }
  };

  const handleIdBlur = async () => {
    if (idNumber.length < 5) return;
    setCheckingId(true);
    setIdStatus("checking");
    const bl = await checkBlacklist("ic", idNumber);
    if (!historyMatch && mode === "create") {
      const h = await checkHistory(idNumber, "");
      if (h) setHistoryMatch(h);
    }
    setCheckingId(false);
    if (bl) {
      setIdStatus("danger");
      setBlacklistAlert({ type: "IC", value: idNumber, reason: bl.reason });
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
    if (!icFile) return setErr("Upload IC first.");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", icFile);
      const res = await fetch("/api/ocr/scan", { method: "POST", body: fd });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error);

      if (j.data.name) setCustomerName(j.data.name.toUpperCase());
      if (j.data.id_number) {
        const scanId = j.data.id_number.toUpperCase();
        setIdNumber(scanId);
        const bl = await checkBlacklist("ic", scanId);
        if (bl) {
          setIdStatus("danger");
          setBlacklistAlert({ type: "IC", value: scanId, reason: bl.reason });
          play("fail");
        } else {
          setIdStatus("safe");
          play("ok");
        }
      } else {
        play("ok");
      }
    } catch (e: any) {
      setErr(e.message);
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

  const handleShare = async () => {
    const url = window.location.href;
    const text = `JRV Admin: Review Agreement for ${
      customerName || "Customer"
    }`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "JRV Admin", text: text, url: url });
        play("click");
        return;
      } catch (err) {
        console.log("Share cancelled", err);
      }
    }
    const waUrl = `https://wa.me/?text=${encodeURIComponent(
      text + "\n" + url
    )}`;
    window.open(waUrl, "_blank");
    play("click");
  };

  const preview = async () => {
    const v = validate();
    if (v) return setErr(v);
    const bl1 = await checkBlacklist("mobile", mobile);
    if (bl1) return setErr("Mobile is Blacklisted.");
    const bl2 = await checkBlacklist("ic", idNumber);
    if (bl2) return setErr("IC is Blacklisted.");

    setBusy(true);
    try {
      let url = initial?.ic_url ?? null;
      if (icFile) {
        url = await uploadImage(icFile);
      } else if (icPreview && icPreview.startsWith("http")) {
        url = icPreview;
      }

      const res = await fetch("/admin/agreements/api", {
        method: "POST",
        body: JSON.stringify({
          action: "preview",
          payload: {
            customer_name: customerName,
            id_number: idNumber,
            mobile,
            plate_number: selectedCar?.plate_number,
            car_type: selectedCar?.car_label,
            date_start_iso: startIso,
            date_end_iso: endIso,
            total_price: total,
            deposit_price: deposit,
            ic_url: url,
            agent_email: agentEmail,
          },
        }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error);

      if (j.preview_url) {
        setPreviewUrl(j.preview_url);
        setConfirmOpen(true);
        play("ok");
      }
    } catch (e: any) {
      setErr(e.message);
      play("fail");
    } finally {
      setBusy(false);
    }
  };

  const executeSave = async (overrideStatus?: string) => {
    const v = validate();
    if (v) return setErr(v);
    setBusy(true);
    try {
      const bl1 = await checkBlacklist("mobile", mobile);
      if (bl1) throw new Error("Mobile Blacklisted");
      const bl2 = await checkBlacklist("ic", idNumber);
      if (bl2) throw new Error("IC Blacklisted");

      let url = initial?.ic_url ?? null;
      if (icFile) url = await uploadImage(icFile);
      else if (icPreview && icPreview.startsWith("http")) url = icPreview;

      const payload = {
        id: initial?.id,
        customer_name: customerName,
        id_number: idNumber,
        mobile,
        car_id: carId,
        plate_number: selectedCar?.plate_number,
        car_type: selectedCar?.car_label,
        date_start_iso: startIso,
        date_end_iso: endIso,
        total_price: total,
        deposit_price: deposit,
        status: overrideStatus || status,
        agent_email: agentEmail,
        ic_url: url,
      };

      const res = await fetch("/admin/agreements/api", {
        method: "POST",
        body: JSON.stringify({
          action: mode === "edit" ? "confirm_update" : "confirm_create",
          payload,
        }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error);

      play("ok");
      if (j.whatsapp_url) window.open(j.whatsapp_url, "_blank");
      window.location.href = onDoneHref;
    } catch (e: any) {
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
    setBusy(true);
    await fetch("/admin/agreements/api", {
      method: "POST",
      body: JSON.stringify({ action: "delete", id: initial.id }),
    });
    window.location.href = onDoneHref;
  };

  const handleRestoreClick = async () => await executeSave("Editted");

  const statusOptions = isSuperadmin
    ? ["New", "Editted", "Cancelled", "Deleted", "Completed"]
    : ["New", "Editted", "Cancelled"];

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-5xl mx-auto pb-20">
      {/* ALERTS */}
      {/* ✅ Use z-[60] to ensure this error pops over everything else */}
      {err && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white p-6 rounded-2xl border-l-4 border-red-500 shadow-2xl max-w-sm w-full">
            <div className="flex items-center gap-3 text-red-700 font-bold mb-2">
              <AlertTriangle /> Action Required
            </div>
            <p className="text-gray-700 text-sm mb-4">{err}</p>
            <Button
              onClick={() => setErr(null)}
              className="w-full bg-red-600 hover:bg-red-700 text-white"
            >
              Okay
            </Button>
          </div>
        </div>
      )}

      {blacklistAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl border-l-4 border-red-600 shadow-2xl max-w-md w-full">
            <div className="flex items-center gap-3 text-red-700 font-bold mb-3">
              <ShieldAlert /> Blacklist Warning
            </div>
            <p className="text-gray-800">
              The {blacklistAlert.type}{" "}
              <span className="bg-red-100 font-mono px-1 rounded">
                {blacklistAlert.value}
              </span>{" "}
              is blacklisted.
            </p>
            <div className="bg-red-50 p-3 rounded-lg text-xs text-red-800 mt-3 border border-red-100">
              <strong>Reason:</strong> {blacklistAlert.reason}
            </div>
            <Button
              onClick={() => setBlacklistAlert(null)}
              className="w-full mt-4 bg-red-600 text-white hover:bg-red-700"
            >
              Acknowledge
            </Button>
          </div>
        </div>
      )}

      {historyMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-md w-full border border-blue-100">
            <div className="flex items-center gap-3 text-blue-700 font-bold mb-3">
              <History /> Found Existing Customer
            </div>
            <div className="bg-blue-50 p-4 rounded-xl space-y-1 text-sm text-blue-900 mb-4">
              <div>
                <strong>Name:</strong> {historyMatch.customer_name}
              </div>
              <div>
                <strong>IC:</strong> {historyMatch.id_number}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setHistoryMatch(null)}
                variant="ghost"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setCustomerName(historyMatch.customer_name.toUpperCase());
                  setIdNumber(historyMatch.id_number.toUpperCase());
                  if (historyMatch.ic_url) setIcPreview(historyMatch.ic_url);
                  setHistoryMatch(null);
                }}
                className="flex-1 bg-blue-600 text-white"
              >
                Use Data
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            {mode === "edit" ? "Edit Agreement" : "New Agreement"}
            {isDeleted && (
              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded border border-red-200">
                DELETED
              </span>
            )}
          </h1>
          <button
            onClick={handleShare}
            className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-green-100 hover:text-green-600 transition-colors ml-auto md:ml-2 shadow-sm border border-gray-200"
            title="Share Page Link"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>
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
            className="text-sm font-medium text-gray-500 hover:text-black transition"
          >
            Cancel & Back
          </Link>
        </div>
      </div>

      <Card className="p-0 overflow-hidden shadow-xl shadow-gray-200/50 border border-gray-100">
        <div className="p-6 space-y-6">
          <div className="bg-linear-to-br from-blue-50/50 to-indigo-50/30 p-5 rounded-2xl border border-blue-100/50 flex flex-col md:flex-row gap-6">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative w-full md:w-48 h-36 bg-white rounded-xl border-2 border-dashed border-blue-200 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:scale-[1.02] transition-all shadow-sm group"
            >
              {icPreview ? (
                <img
                  src={icPreview}
                  className="w-full h-full object-contain p-2"
                />
              ) : (
                <div className="text-center space-y-1">
                  <div className="p-2 bg-blue-50 rounded-full inline-flex text-blue-400 group-hover:text-indigo-500 transition-colors">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div className="text-[10px] font-bold text-blue-300 uppercase tracking-widest">
                    Upload IC
                  </div>
                </div>
              )}
              <input
                type="file"
                ref={fileInputRef}
                hidden
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setIcFile(e.target.files[0]);
                    setIcPreview(URL.createObjectURL(e.target.files[0]));
                  }
                }}
              />
            </div>
            <div className="flex-1 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                  <ScanLine className="w-4 h-4" /> Customer Details
                </h3>
                <Button
                  onClick={handleScan}
                  variant="secondary"
                  size="sm"
                  className="bg-white border-blue-200 text-indigo-600 hover:bg-indigo-50 shadow-sm text-xs font-bold"
                >
                  Scan & Autofill
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>
                    <User className="w-3 h-3" /> Name
                  </label>
                  <input
                    className={inputClass}
                    value={customerName}
                    onChange={(e) =>
                      setCustomerName(e.target.value.toUpperCase())
                    }
                    placeholder="FULL NAME"
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    <CreditCard className="w-3 h-3" /> IC Number
                  </label>
                  <div className="relative">
                    <input
                      className={`${inputClass} pr-9`}
                      value={idNumber}
                      onChange={(e) => {
                        setIdNumber(e.target.value.toUpperCase());
                        setIdStatus("idle");
                      }}
                      onBlur={handleIdBlur}
                      placeholder="000000-00-0000"
                    />
                    <div className="absolute right-3 top-3">
                      {checkingId ? (
                        <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                      ) : idStatus === "safe" ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : idStatus === "danger" ? (
                        <XCircle className="w-4 h-4 text-red-500" />
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>
                <Phone className="w-3 h-3" /> Mobile
              </label>
              <div className="relative">
                <input
                  className={`${inputClass} pr-9`}
                  value={mobile}
                  onChange={(e) => {
                    setMobile(e.target.value);
                    setMobileStatus("idle");
                  }}
                  onBlur={handleMobileBlur}
                  placeholder="+60..."
                />
                <div className="absolute right-3 top-3">
                  {checkingMobile ? (
                    <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                  ) : mobileStatus === "safe" ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : mobileStatus === "danger" ? (
                    <XCircle className="w-4 h-4 text-red-500" />
                  ) : null}
                </div>
              </div>
            </div>
            <div>
              <label className={labelClass}>
                <Car className="w-3 h-3" /> Vehicle
              </label>
              <select
                className={inputClass}
                value={carId}
                onChange={(e) => setCarId(e.target.value)}
              >
                <option value="">Select Car...</option>
                {cars.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.plate_number.toUpperCase()} — {c.car_label.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className={labelClass}>Start Date</label>
              <input
                type="date"
                className={inputClass}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Start Time</label>
              <input
                type="time"
                className={inputClass}
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>End Date</label>
              <input
                type="date"
                className={inputClass}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>End Time</label>
              <input
                type="time"
                className={inputClass}
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
            <div className="bg-green-50/50 p-4 rounded-xl border border-green-100">
              <label className="text-[10px] font-bold text-green-700 uppercase tracking-wide mb-1 block">
                Total Amount (RM)
              </label>
              <input
                type="number"
                className="w-full bg-transparent text-2xl font-black text-green-700 placeholder-green-300 outline-none border-0 p-0 focus:ring-0"
                value={total}
                onChange={(e) => {
                  setTotal(e.target.value);
                  setTotalTouched(true);
                }}
              />
            </div>
            <div className="p-4 rounded-xl border border-gray-100">
              <label className={labelClass}>Deposit (RM)</label>
              <input
                type="number"
                className="w-full bg-transparent text-xl font-bold text-gray-700 outline-none border-0 p-0 focus:ring-0"
                value={deposit}
                onChange={(e) => setDeposit(e.target.value)}
              />
            </div>
          </div>

          {/* ✅ FIXED LAYOUT: Status top, Buttons below on Mobile */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-6 border-t border-gray-100">
            <div className="w-full md:w-48">
              <label className={labelClass}>Status</label>
              <select
                className={inputClass}
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

            <div className="flex w-full md:w-auto gap-3">
              <Button
                onClick={() => preview()}
                loading={busy}
                variant="secondary"
                className="flex-1 md:flex-none shadow-sm"
              >
                Preview PDF
              </Button>
              <Button
                onClick={() => executeSave()}
                loading={busy}
                className="flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 shadow-lg shadow-indigo-200"
              >
                Save & WhatsApp
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* PDF PREVIEW MODAL */}
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
