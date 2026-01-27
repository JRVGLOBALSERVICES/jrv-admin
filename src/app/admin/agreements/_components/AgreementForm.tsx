"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
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
  Wand2,
  Sparkles,
  FileText,
  ArrowLeft,
  Wrench,
  History as HistoryIcon,
  MessageSquare,
} from "lucide-react";

// --- STYLES ---
const inputClass =
  "w-full border-0 bg-gray-50/50 rounded-lg px-3 py-2 text-sm ring-1 ring-gray-200 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-inner placeholder:text-gray-600 text-gray-800 uppercase h-10";
const labelClass =
  "text-[10px] font-bold text-gray-700 uppercase tracking-wide mb-1.5 flex items-center gap-1.5";

type InitialAgreement = {
  creator_email?: string | null;
  editor_email?: string | null;
  deposit_refunded?: boolean | null;
  created_at?: string;
  updated_at?: string;
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
  start_mileage?: number | null;
  eligible_for_event?: boolean | null;
  booking_payment?: string | number;
  remarks?: string | null;
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
function fmtDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

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
      audioRefs.current[key]?.play().catch(() => { });
    } catch { }
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

// CLIENT-SIDE IMAGE PROCESSING
async function processImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(e.target?.result as string);

        const w = img.width;
        const h = img.height;
        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, w, h);
        const data = imageData.data;
        const bgR = data[0],
          bgG = data[1],
          bgB = data[2];
        const threshold = 40;

        let minX = w,
          minY = h,
          maxX = 0,
          maxY = 0;
        let found = false;

        for (let y = 0; y < h; y += 5) {
          for (let x = 0; x < w; x += 5) {
            const i = (y * w + x) * 4;
            const r = data[i],
              g = data[i + 1],
              b = data[i + 2];
            if (
              Math.abs(r - bgR) > threshold ||
              Math.abs(g - bgG) > threshold ||
              Math.abs(b - bgB) > threshold
            ) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
              found = true;
            }
          }
        }

        if (!found || maxX <= minX || maxY <= minY) {
          minX = 0;
          maxX = w;
          minY = 0;
          maxY = h;
        }

        const pad = 15;
        minX = Math.max(0, minX - pad);
        minY = Math.max(0, minY - pad);
        maxX = Math.min(w, maxX + pad);
        maxY = Math.min(h, maxY + pad);

        const boxW = maxX - minX;
        const boxH = maxY - minY;

        const targetRatio = 1.58;
        let finalW = boxW;
        let finalH = boxH;
        let finalX = minX;
        let finalY = minY;

        if (boxW / boxH > targetRatio) {
          finalW = boxH * targetRatio;
          finalX = minX + (boxW - finalW) / 2;
        } else {
          finalH = boxW / targetRatio;
          finalY = minY + (boxH - finalH) / 2;
        }

        const finalCanvas = document.createElement("canvas");
        finalCanvas.width = finalW;
        finalCanvas.height = finalH;
        const finalCtx = finalCanvas.getContext("2d");
        if (!finalCtx) return resolve(e.target?.result as string);

        finalCtx.drawImage(
          img,
          finalX,
          finalY,
          finalW,
          finalH,
          0,
          0,
          finalW,
          finalH
        );

        const finalData = finalCtx.getImageData(0, 0, finalW, finalH);
        const d = finalData.data;
        for (let i = 0; i < d.length; i += 4) {
          const avg = (d[i] + d[i + 1] + d[i + 2]) / 3;
          const contrast = 1.25;
          const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
          const color = factor * (avg - 128) + 128;
          d[i] = color;
          d[i + 1] = color;
          d[i + 2] = color;
        }
        finalCtx.putImageData(finalData, 0, 0);

        resolve(finalCanvas.toDataURL("image/jpeg", 0.9));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function dataURLtoFile(dataurl: string, filename: string) {
  const arr = dataurl.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
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

  const isEdit = mode === "edit";
  const isDeleted = initial?.status === "Deleted";

  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteStage, setDeleteStage] = useState<"idle" | "confirm">("idle");
  const [cars, setCars] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [previousAgreements, setPreviousAgreements] = useState<any[]>([]);

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
  const [originalIcFile, setOriginalIcFile] = useState<File | null>(null);

  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [originalIcPreview, setOriginalIcPreview] = useState<string | null>(
    null
  );
  const [processedIcPreview, setProcessedIcPreview] = useState<string | null>(
    null
  );
  const [pendingIcFile, setPendingIcFile] = useState<File | null>(null);

  const [extendModalOpen, setExtendModalOpen] = useState(false);
  const [pendingSaveOpts, setPendingSaveOpts] = useState<any>(null);

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
  const [depositRefunded, setDepositRefunded] = useState<boolean>(
    Boolean(initial?.deposit_refunded)
  );
  const [status, setStatus] = useState(initial?.status ?? "New");
  const [eligibleForEvent, setEligibleForEvent] = useState(
    initial?.eligible_for_event ?? true
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    initial?.agreement_url ?? null
  );
  const [currentMileage, setCurrentMileage] = useState(String(initial?.start_mileage ?? ""));
  const [bookingPayment, setBookingPayment] = useState(String(initial?.booking_payment ?? "0"));
  const [remarks, setRemarks] = useState(initial?.remarks ?? "");

  const [minMileage, setMinMileage] = useState(0);
  const [serviceAlerts, setServiceAlerts] = useState<string[]>([]);
  const [showAlertModal, setShowAlertModal] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [totalTouched, setTotalTouched] = useState(false);
  const [showIcOptions, setShowIcOptions] = useState(false);

  // Feature 7: Upcoming Status & Conflicts
  const [showUpcomingPrompt, setShowUpcomingPrompt] = useState(false);
  const [conflictData, setConflictData] = useState<any>(null); // { agreement, daysUntil }

  // Preserve manually set total on edit: initialize touch state if existing total present
  useEffect(() => {
    if (isEdit && initial?.total_price != null) {
      setTotalTouched(true);
    }
  }, [isEdit, initial?.total_price]);
  // const [regeneratePdf, setRegeneratePdf] = useState(true); // DEPRECATED: Always true/auto handled

  const selectedCar = useMemo(
    () => cars.find((c) => c.id === carId) ?? null,
    [cars, carId]
  );

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
      if (initial.eligible_for_event !== undefined)
        setEligibleForEvent(initial.eligible_for_event ?? true);
    }
  }, [initial]);

  useEffect(() => {
    (async () => {
      const url = new URL("/admin/cars/api", window.location.origin);
      url.searchParams.set("mode", "dropdown");
      if (initial?.car_id) url.searchParams.set("include", initial.car_id);
      try {
        const res = await fetch(url.toString());
        const json = await res.json();
        if (json.rows) setCars(json.rows);

        // Fetch current mileage for selected car if carId matches and we don't have a value yet
        if (initial?.car_id && json.rows) {
          const c = json.rows.find((r: any) => r.id === initial.car_id);
          if (c) {
            const m = c.current_mileage ?? 100000;
            setMinMileage(m);
          }
        }
      } catch { }
    })();
  }, [initial?.car_id, initial?.start_mileage]);

  // Fetch History on Mount if ID/Mobile exists
  useEffect(() => {
    if (initial?.mobile || initial?.id_number) {
      fetchCustomerHistory(initial.id_number || "", initial.mobile || "");
    }
  }, [initial]);

  const fetchCustomerHistory = async (ic: string, mob: string) => {
    try {
      setLoadingHistory(true);
      const res = await fetch("/admin/agreements/api/previous", {
        method: "POST",
        body: JSON.stringify({ ic, mobile: mob }),
      });
      const j = await res.json();
      if (j.ok && j.rows) setPreviousAgreements(j.rows);
    } catch {
    } finally {
      setLoadingHistory(false);
    }
  };

  // Update mileage when user selects a different car manually
  useEffect(() => {
    if (selectedCar && selectedCar.current_mileage) {
      const m = selectedCar.current_mileage;
      setCurrentMileage(String(m));
      setMinMileage(m);
    }
  }, [selectedCar]);

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

  // Feature 7: Detect "Upcoming" Status
  useEffect(() => {
    if (mode !== "create" || !startDate) return;
    const now = new Date();
    // Midnight comparison
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const start = new Date(startDate).getTime();

    // If start date is strictly in the future
    if (start > today && status === "New") {
      setShowUpcomingPrompt(true);
    }
  }, [startDate, mode]); // Only re-check if date changes

  // Feature 7: Conflict / Upcoming Warning Check
  useEffect(() => {
    if (!selectedCar || !startDate || !(selectedCar as any).future_bookings) return;

    // Check for "Upcoming" bookings on this car
    const bookings = (selectedCar as any).future_bookings as any[];
    if (bookings.length === 0) return;

    const myStart = new Date(startDate).getTime();

    // Find closest upcoming booking
    const upcoming = bookings
      .filter(b => b.id !== initial?.id) // Exclude self
      .filter(b => b.status === "Upcoming" || new Date(b.date_start).getTime() > myStart)
      .sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime())[0];

    if (upcoming) {
      const upStart = new Date(upcoming.date_start).getTime();
      // Warn if upcoming booking is within 3 days of my start
      const diffMs = upStart - myStart;
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      if (diffDays >= 0 && diffDays <= 3) {
        setConflictData({
          date: upcoming.date_start.slice(0, 10),
          id: upcoming.id,
          status: upcoming.status
        });
      } else {
        setConflictData(null);
      }
    } else {
      setConflictData(null);
    }
  }, [selectedCar, startDate]);

  const handleMobileBlur = async () => {
    if (mobile.length < 5) return;
    setCheckingMobile(true);
    setMobileStatus("checking");
    const bl = await checkBlacklist("mobile", mobile);
    if (!historyMatch && mode === "create") {
      const h = await checkHistory("", mobile);
      if (h) setHistoryMatch(h);
    }
    fetchCustomerHistory("", mobile);
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
    fetchCustomerHistory(idNumber, "");
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
    const fileToScan = originalIcFile || icFile;
    if (!fileToScan) return setErr("Upload IC first.");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", fileToScan);
      const res = await fetch("/api/ocr/scan", { method: "POST", body: fd });
      const j = await res.json();
      if (!j.ok && !j.data) throw new Error(j.error || "Scan failed");

      if (j.data?.name) setCustomerName(j.data.name.toUpperCase());
      if (j.data?.id_number) {
        const scanId = j.data.id_number.toUpperCase();
        setIdNumber(scanId);
        setCheckingId(true);
        const [bl, hist] = await Promise.all([
          checkBlacklist("ic", scanId),
          checkHistory(scanId, ""),
        ]);
        setCheckingId(false);
        if (bl) {
          setIdStatus("danger");
          setBlacklistAlert({ type: "IC", value: scanId, reason: bl.reason });
          play("fail");
        } else if (hist) {
          setHistoryMatch(hist);
          setIdStatus("safe");
          play("ok");
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

  const handleIcSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const f = e.target.files[0];
      setPendingIcFile(f);
      setOriginalIcFile(f);

      const origUrl = URL.createObjectURL(f);
      setOriginalIcPreview(origUrl);

      const processedUrl = await processImage(f);
      setProcessedIcPreview(processedUrl);

      setAiModalOpen(true);
    }
  };

  const handleAiChoice = (useAi: boolean) => {
    if (useAi && processedIcPreview && pendingIcFile) {
      const newFile = dataURLtoFile(processedIcPreview, pendingIcFile.name);
      setIcFile(newFile);
      setIcPreview(processedIcPreview);
    } else if (pendingIcFile && originalIcPreview) {
      setIcFile(pendingIcFile);
      setIcPreview(originalIcPreview);
    }
    setAiModalOpen(false);
    setPendingIcFile(null);
  };

  const validate = () => {
    // --- BLACKLIST CHECK ---
    if (idStatus === "danger")
      return "Cannot proceed: IC Number is blacklisted.";
    if (mobileStatus === "danger")
      return "Cannot proceed: Mobile Number is blacklisted.";
    // -----------------------

    if (!customerName) return "Customer Name is required";
    if (!idNumber) return "IC / Passport is required";
    if (!mobile) return "Mobile Number is required";
    if (!carId) return "Please select a Car";
    if (!currentMileage) return "Car Current Mileage is required";
    if (!icPreview && !icFile) return "IC / Passport Image is REQUIRED.";
    if (toMoney(total) <= 0) return "Total Price is required";

    // Simplified mileage check: Just show the modal alert, don't block saving.

    return null;
  };

  // SERVICE ALERT LOGIC
  useEffect(() => {
    if (!selectedCar || !currentMileage) return;
    const cur = Number(currentMileage);
    if (isNaN(cur)) return;

    const alerts: string[] = [];
    const check = (label: string, target: number, isOil: boolean) => {
      if (!target) return;
      const diff = target - cur;
      if (isOil) {
        if (diff <= 0) alerts.push(`CRITICAL: ${label} Service Overdue!`);
        else if (diff <= 100) alerts.push(`CRITICAL: ${label} Service due in ${diff}km!`);
        else if (diff <= 500) alerts.push(`${label} Service due in ${diff}km!`);
        else if (diff <= 1000) alerts.push(`${label} Service due in ${diff}km.`);
        else if (diff <= 2000) alerts.push(`Upcoming: ${label} Service in ${diff}km.`);
      } else {
        // Others (Tyres, Brakes, General)
        if (diff <= 0) alerts.push(`OVERDUE: ${label} Service!`);
        else if (diff <= 1500) alerts.push(`${label} Service due in ${diff}km.`);
      }
    };

    check("Engine Oil / General", selectedCar.next_service_mileage, true);
    check("Gearbox Oil", selectedCar.next_gear_oil_mileage, true);
    check("Tyres", selectedCar.next_tyre_mileage, false);
    check("Brake Pads", selectedCar.next_brake_pad_mileage, false);

    if (alerts.length > 0) {
      setServiceAlerts(alerts);
      setShowAlertModal(true);
    } else {
      setServiceAlerts([]);
    }
  }, [currentMileage, carId]);


  const handleShare = async () => {
    const url = window.location.href;
    const text = `JRV Admin: Review Agreement for ${customerName || "Customer"
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
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text + "\n" + url)}`,
      "_blank"
    );
    play("click");
  };
  const preview = async () => {
    const v = validate();
    if (v) return setErr(v);
    setBusy(true);
    try {
      let url = initial?.ic_url ?? null;
      if (icFile) url = await uploadImage(icFile);
      else if (icPreview && icPreview.startsWith("http")) url = icPreview;
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
            booking_payment: bookingPayment,
            remarks,
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
  const executeSave = async (opts?: {
    overrideStatus?: string;
    silent?: boolean;
  }) => {
    const { overrideStatus, silent } = opts || {};
    const v = validate();
    if (v) return setErr(v);
    setBusy(true);
    try {
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
        deposit_refunded: depositRefunded,
        status: overrideStatus || status,
        agent_email: agentEmail,
        ic_url: url,
        skip_pdf: silent,
        eligible_for_event: eligibleForEvent,
        current_mileage: currentMileage,
        booking_payment: bookingPayment,
        remarks,
      };

      // --- SMART EXTENSION CHECK ---
      console.log("Checking extension...", {
        silent,
        overrideStatus,
        initialEnd: initial?.date_end,
        newEnd: endIso,
        currentStatus: status
      });

      // Allow silent saves to trigger extension check too, so we can prompt modal
      if (!overrideStatus && initial?.date_end && endIso) {
        // Compare dates at midnight to avoid time diff issues if only date changed
        const oldD = new Date(initial.date_end);
        const newD = new Date(endIso);

        const oldTime = oldD.getTime();
        const newTime = newD.getTime();

        // Check for start date change (Reschedule vs Extension)
        const oldStart = initial.date_start ? new Date(initial.date_start).getTime() : 0;
        const newStart = new Date(startIso).getTime();
        // If start date changed by > 12 hours, treat as reschedule, not extension
        const isReschedule = Math.abs(newStart - oldStart) > 1000 * 60 * 60 * 12;

        // Check if new date is at least 24h after old date (or just > old date if strictly different)
        // Skip if status is Upcoming (that's just an edit constraint) or if it's a reschedule
        if (newTime > oldTime && status !== "Extended" && status !== "Upcoming" && !isReschedule) {
          console.log("Extension detected!");
          setPendingSaveOpts({ payload, action: mode === "edit" ? "confirm_update" : "confirm_create", silent });
          setExtendModalOpen(true);
          setBusy(false); // Stop spinner so modal is interactive
          return;
        }
      }
      // -----------------------------

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
      if (!silent && j.whatsapp_url) window.open(j.whatsapp_url, "_blank");
      // Redirect for both Silent (Save & Exit) and Normal (Save & WhatsApp)
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
  const handleRestoreClick = async () =>
    await executeSave({ overrideStatus: "Editted" });
  const statusOptions = isSuperadmin
    ? ["New", "Upcoming", "Editted", "Extended", "Cancelled", "Deleted", "Completed"]
    : mode === "create"
      ? ["New", "Upcoming", "Completed"]
      : ["Upcoming", "Editted", "Extended", "Completed"];

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto pb-20">
      {err && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white p-6 rounded-2xl border-l-4 border-red-500 shadow-2xl max-w-sm w-full">
            <div className="flex items-center gap-3 text-red-700 font-bold mb-2">
              <AlertTriangle /> Action Required
            </div>
            <p className="text-gray-600 text-sm mb-4">{err}</p>
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
            <div className="bg-blue-50 p-4 rounded-xl space-y-1 text-sm text-blue-700 mb-4">
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
                onClick={confirmHistoryUse}
                className="flex-1 bg-blue-600 text-white"
              >
                Use Data
              </Button>
            </div>
          </div>
        </div>
      )}

      {aiModalOpen && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl">
            <div className="p-4 bg-indigo-50 border-b border-indigo-100 flex items-center gap-3">
              <Wand2 className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-indigo-700">
                AI Enhancement Suggestion
              </h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="text-center text-xs font-bold text-gray-500 uppercase">
                  Original
                </div>
                <div className="aspect-[1.58/1] bg-gray-100 rounded-lg overflow-hidden border border-gray-200 shadow-inner">
                  {originalIcPreview && (
                    <img
                      src={originalIcPreview}
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>
                <Button
                  onClick={() => handleAiChoice(false)}
                  variant="secondary"
                  className="w-full"
                >
                  Use Original
                </Button>
              </div>
              <div className="space-y-3">
                <div className="text-center text-xs font-bold text-indigo-500 uppercase flex items-center justify-center gap-2">
                  <Sparkles className="w-3 h-3" /> AI Cropped & Enhanced
                </div>
                <div className="aspect-[1.58/1] bg-indigo-50 rounded-lg overflow-hidden border-2 border-indigo-200 shadow-inner relative">
                  {processedIcPreview ? (
                    <img
                      src={processedIcPreview}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 animate-spin text-indigo-300" />
                    </div>
                  )}
                </div>
                <Button
                  onClick={() => handleAiChoice(true)}
                  className="w-full bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  Use AI Suggestion
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <h1 className="text-2xl font-black text-gray-700 tracking-tight flex items-center gap-2">
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
        <div className="flex gap-2 w-full md:w-auto justify-between">
          <Button
            onClick={handleDeleteClick}
            loading={busy}
            variant="secondary"
            className="bg-white border-blue-200 text-indigo-600 hover:bg-indigo-50 shadow-sm text-xs font-bold p-6"
          >
            <Link href={onDoneHref} className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Cancel & Exit
            </Link>
          </Button>
          {isEdit &&
            isSuperadmin &&
            (isDeleted ? (
              <Button
                onClick={handleRestoreClick}
                loading={busy}
                variant="secondary"
                className="p-6 flex-1 md:flex-none bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
              >
                Restore
              </Button>
            ) : (
              <Button
                onClick={handleDeleteClick}
                loading={busy}
                variant="secondary"
                className="p-6 flex text-red-600 border-red-200 hover:bg-red-50 shadow-sm"
              >
                {deleteStage === "confirm" ? "Confirm?" : "Delete"}
              </Button>
            ))}
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className={labelClass}>
              <User className="w-4 h-4" /> Created By
            </div>
            <div className="text-sm font-bold text-gray-800">
              {(initial?.creator_email || agentEmail || "—").toString()}
            </div>
          </div>
          {isEdit && initial?.editor_email ? (
            <div>
              <div className={labelClass}>
                <Clock className="w-4 h-4" /> Last Edited
              </div>
              <div className="text-sm font-bold text-gray-800">
                {initial.editor_email}
              </div>
              <div className="text-[11px] text-gray-500">
                {initial.updated_at ? fmtDate(initial.updated_at) : "—"}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {previousAgreements.length > 0 && (
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm animate-in fade-in slide-in-from-bottom-2">
          <h3 className="text-xs font-bold text-gray-700 font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
            <HistoryIcon className="w-4 h-4" /> Previous Agreements
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {previousAgreements.slice(0, 3).map((a) => (
              <Link key={a.id} href={`/admin/agreements/${a.id}`} className="block group">
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 group-hover:bg-blue-50 group-hover:border-blue-200 transition-colors">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-bold text-gray-700 font-bold group-hover:text-blue-700">
                      {fmtDate(a.date_start).split(",")[0]}
                    </span>
                    <span className={`text-[10px] px-1.5 rounded-full border font-bold ${a.status === 'Completed' ? 'bg-green-100 text-green-700 border-green-200' :
                      a.status === 'Cancelled' ? 'bg-red-100 text-red-700 border-red-200' :
                        a.status === 'Upcoming' ? 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200' :
                          a.status === 'Extended' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                            a.status === 'On Going' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' :
                              a.status === 'New' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                'bg-gray-100 text-gray-700 border-gray-200'
                      }`}>
                      {a.status}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {a.cars?.plate_number}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <Card className="p-0 overflow-hidden shadow-xl shadow-gray-200/50 border border-gray-100">
        <div className="p-6 space-y-6">
          <div className="bg-linear-to-br from-blue-50/50 to-indigo-50/30 p-5 rounded-2xl border border-blue-100/50 flex flex-col md:flex-row gap-6">
            <div className="w-full md:w-48 flex flex-col gap-3">
              <div
                onClick={() => {
                  if (icPreview) {
                    setShowIcOptions(true);
                  } else {
                    fileInputRef.current?.click();
                  }
                }}
                className="relative w-full h-36 bg-white rounded-xl border-2 border-dashed border-blue-200 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-600 hover:scale-[1.02] transition-all shadow-sm group overflow-hidden"
              >
                {icPreview ? (
                  <>
                    <img src={icPreview} className="w-full h-full object-cover" />
                    {showIcOptions && (
                      <div className="absolute inset-0 bg-black/60 z-10 flex flex-col items-center justify-center gap-1.5 p-3 animate-in fade-in zoom-in-95"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          className="absolute top-2 right-2 text-white/70 hover:text-white bg-black/20 hover:bg-black/40 rounded-full p-1 transition-colors"
                          onClick={(e) => { e.stopPropagation(); setShowIcOptions(false); }}
                        >
                          <XCircle className="w-5 h-5" />
                        </button>

                        <Button size="sm" variant="secondary" className="w-full bg-white text-gray-700 border-0 hover:bg-gray-100 h-8 text-xs" onClick={() => window.open(icPreview, '_blank')}>
                          <ScanLine className="w-3 h-3 mr-1.5" /> View / Download
                        </Button>
                        <Button size="sm" variant="danger" className="w-full h-8 text-xs" onClick={() => fileInputRef.current?.click()}>
                          <Upload className="w-3 h-3 mr-1.5" /> Replace Image
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center space-y-1">
                    <div className="p-2 bg-blue-50 rounded-full inline-flex text-blue-600 group-hover:text-indigo-500 transition-colors">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div className="text-[10px] font-bold text-blue-300 uppercase tracking-widest">
                      Upload IC
                    </div>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  hidden
                  onChange={(e) => {
                    handleIcSelect(e);
                    setShowIcOptions(false);
                  }}
                />
              </div>

              {/* ✅ Fixed: Wrapped in div to strictly enforce hiding on desktop */}
              <div className="md:hidden w-full justify-center flex">
                <Button
                  onClick={handleScan}
                  variant="secondary"
                  size="sm"
                  className="bg-white border-blue-200 text-indigo-600 hover:bg-indigo-50 shadow-sm text-xs font-bold p-6"
                  disabled={busy}
                >
                  {busy ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <ScanLine className="w-4 h-4 mr-2" />
                  )}{" "}
                  Scan & Autofill
                </Button>
              </div>
            </div>

            <div className="flex-1 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-indigo-700 flex items-center gap-2">
                  <ScanLine className="w-4 h-4" /> Customer Details
                </h3>

                {/* ✅ Fixed: Wrapped in div to strictly enforce hiding on mobile */}
                <div className="hidden md:block">
                  <Button
                    onClick={handleScan}
                    variant="secondary"
                    size="sm"
                    className="bg-white border-blue-200 text-indigo-600 hover:bg-indigo-50 shadow-sm text-xs font-bold p-6"
                    disabled={busy}
                  >
                    {busy ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <ScanLine className="w-4 h-4 mr-2" />
                    )}{" "}
                    Scan & Autofill
                  </Button>
                </div>
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
                        <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
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
          {/* ... Rest of component remains the same ... */}
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
                    <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
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

            {/* MILEAGE INPUT */}
            <div>
              <label className={labelClass}>
                <History size={10} /> Current Mileage (km)
              </label>
              <input
                type="number"
                className={`${inputClass} ${Number(currentMileage) < minMileage ? "ring-2 ring-red-500 bg-red-50" : ""}`}
                placeholder="e.g. 120000"
                value={currentMileage}
                onChange={(e) => setCurrentMileage(e.target.value)}
              />
              {Number(currentMileage) < minMileage && (
                <div className="text-[10px] text-red-600 font-bold mt-1">
                  Must be {minMileage}+
                </div>
              )}
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
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
            <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
              <label className="text-[10px] font-bold text-indigo-700 uppercase tracking-wide mb-1 block">
                Paid / Check-Out (RM)
              </label>
              <input
                type="number"
                className="w-full bg-transparent text-2xl font-black text-indigo-700 placeholder-indigo-300 outline-none border-0 p-0 focus:ring-0"
                value={bookingPayment}
                onChange={(e) => setBookingPayment(e.target.value)}
              />
              <div className="mt-1 text-xs font-bold text-gray-700 font-bold">
                Balance: <span className="text-gray-700 font-bold">RM {toMoney(total) - toMoney(bookingPayment)}</span>
              </div>
            </div>
            <div className="p-4 rounded-xl border border-gray-100">
              <label className={labelClass}>Security Deposit (RM)</label>
              <input
                type="number"
                className="w-full bg-transparent text-xl font-bold text-gray-700 font-bold outline-none border-0 p-0 focus:ring-0"
                value={deposit}
                onChange={(e) => setDeposit(e.target.value)}
              />
              {isEdit && toMoney(deposit) > 0 ? (
                <label className="mt-3 flex items-center gap-2 text-xs font-semibold text-gray-700 font-bold">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    checked={depositRefunded}
                    onChange={(e) => setDepositRefunded(e.target.checked)}
                  />{" "}
                  Deposit refunded
                </label>
              ) : null}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <div className="flex justify-between items-center mb-1">
              <label className={labelClass}><MessageSquare className="w-3 h-3" /> Remarks (Visible on PDF/WhatsApp)</label>
              <div className="relative overflow-hidden inline-block">
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                  onChange={async (e) => {
                    console.log("File selected", e.target.files);
                    if (!e.target.files?.length) return;
                    setBusy(true);
                    try {
                      const files = Array.from(e.target.files);
                      for (const f of files) {
                        const url = await uploadImage(f);
                        setRemarks(prev => (prev ? prev + "\n" : "") + url);
                      }
                      play("ok");
                    } catch (err: any) {
                      console.error("Upload error", err);
                      setErr(err.message || "Upload failed");
                      play("fail");
                    } finally {
                      setBusy(false);
                      // Reset input
                      e.target.value = "";
                    }
                  }}
                />
                <Button size="sm" variant="secondary" className="py-6 text-[10px] h-10 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200 pointer-events-none relative z-0">
                  <Upload className="w-3 h-3 mr-1 md:block hidden" /> Upload Photo/Video
                </Button>
              </div>
            </div>
            <textarea
              className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none min-h-[80px]"
              placeholder="Enter comments, links (Google Drive, etc)... Uploads will be appended here."
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
            />

            {/* MEDIA PREVIEW */}
            {remarks && (
              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
                {(remarks.match(/https?:\/\/[^\s]+/g) || []).map((url, i) => {
                  const cleanUrl = url.replace(/["')]+$/, ""); // Clean trailing punctuation just in case
                  const lower = cleanUrl.toLowerCase();
                  const isImg = /\.(jpeg|jpg|gif|png|webp|bmp|svg)/.test(lower);
                  const isVid = /\.(mp4|webm|mov|avi|mkv)/.test(lower);

                  if (isImg) {
                    return (
                      <a key={i} href={cleanUrl} target="_blank" rel="noopener noreferrer" className="block relative aspect-video bg-gray-100 rounded-lg overflow-hidden border border-gray-200 hover:opacity-90 transition-opacity">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={cleanUrl} alt="Evidence" className="w-full h-full object-cover" />
                      </a>
                    );
                  }
                  if (isVid) {
                    return (
                      <div key={i} className="relative aspect-video bg-black rounded-lg overflow-hidden border border-gray-800">
                        <video src={cleanUrl} controls className="w-full h-full object-contain" />
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            )}
          </div>

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
            <div className="flex flex-col w-full md:w-auto gap-3">
              <div className="flex flex-row flex-wrap gap-4 justify-end">
                {/* Regenerate PDF removed as requested */}
                {/* Regenerate PDF removed as requested */}
                <Toggle
                  label="Eligible for Event?"
                  checked={eligibleForEvent}
                  onChange={setEligibleForEvent}
                  className="w-full border rounded-lg px-3 py-2 bg-white hover:bg-gray-50"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => preview()}
                  loading={busy}
                  variant="secondary"
                  disabled={
                    idStatus === "danger" || mobileStatus === "danger" || busy
                  }
                  className="flex-1 md:flex-none shadow-sm p-8 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Preview PDF
                </Button>
                {isEdit && (
                  <Button
                    onClick={() => executeSave({ silent: true })}
                    loading={busy}
                    variant="secondary"
                    disabled={
                      idStatus === "danger" || mobileStatus === "danger" || busy
                    }
                    className="p-8 flex-1 md:flex-none bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Save Changes & Exit
                  </Button>
                )}
                <Button
                  onClick={() => executeSave()}
                  loading={busy}
                  disabled={
                    idStatus === "danger" || mobileStatus === "danger" || busy
                  }
                  className="p-8 flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  Save & WhatsApp
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

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

      {/* MODAL: Upcoming Prompt */}
      {showUpcomingPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="mx-auto bg-indigo-100 w-12 h-12 rounded-full flex items-center justify-center">
              <Calendar className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-lg text-gray-900">Upcoming Booking?</h3>
              <p className="text-sm text-gray-500 mt-2">
                The start date is in the future. Should this be marked as <strong>Upcoming</strong> status?
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => setShowUpcomingPrompt(false)}
              >
                No, Keep as New
              </Button>
              <Button
                fullWidth
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                onClick={() => {
                  setStatus("Upcoming");
                  setShowUpcomingPrompt(false);
                  play("ok");
                }}
              >
                Yes, Set Upcoming
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Conflict Warning */}
      {conflictData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 border-2 border-amber-300">
            <div className="mx-auto bg-amber-100 w-12 h-12 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-lg text-gray-900">Vehicle Conflict Detected</h3>
              <p className="text-sm text-gray-500 mt-2">
                This car has another booking coming up soon!
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3 text-left">
                <div className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">Conflicting Booking</div>
                <div className="text-sm text-gray-800">Start Date: <strong>{fmtDate(conflictData.date)}</strong></div>
                <div className="text-sm text-gray-800">Status: <strong>{conflictData.status}</strong></div>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => setConflictData(null)}
              >
                Ignore Warning
              </Button>
              <a href={`/admin/agreements/${conflictData.id}`} target="_blank" className="w-full">
                <Button
                  fullWidth
                  variant="danger"
                >
                  View Conflict
                </Button>
              </a>
            </div>
          </div>
        </div>
      )}

      {extendModalOpen && (
        <div className="fixed inset-0 z-70 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-sm w-full space-y-4">
            <div className="text-center">
              <div className="mx-auto bg-indigo-100 w-12 h-12 rounded-full flex items-center justify-center mb-3">
                <HistoryIcon className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="font-bold text-lg text-gray-700">Extend Agreement?</h3>
              <p className="text-sm text-gray-500 mt-1">
                We noticed the end date has been moved forward. Is this an extension?
              </p>
            </div>
            <div className="space-y-2">
              <Button
                onClick={async () => {
                  setExtendModalOpen(false);
                  // Apply "Extended" status and save
                  if (pendingSaveOpts) {
                    const newPayload = { ...pendingSaveOpts.payload, status: "Extended" };
                    // We need to call executeSave but we can't easily pass payload dynamically without refactoring executeSave to accept it.
                    // Instead, we'll manually call the fetch here or modify executeSave to take raw payload.
                    // Simpler: Just set status state and re-trigger save? No, race condition.
                    // Best: Just manually trigger the fetch with the new payload.

                    setBusy(true);
                    try {
                      const res = await fetch("/admin/agreements/api", {
                        method: "POST",
                        body: JSON.stringify({
                          action: pendingSaveOpts.action,
                          payload: newPayload
                        }),
                      });
                      const j = await res.json();
                      if (!j.ok) throw new Error(j.error);
                      play("ok");
                      if (!pendingSaveOpts.silent && j.whatsapp_url) window.open(j.whatsapp_url, "_blank");
                      window.location.href = onDoneHref;
                    } catch (e: any) {
                      setErr(e.message);
                      play("fail");
                    } finally {
                      setBusy(false);
                    }
                  }
                }}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Yes, Extend Agreement
              </Button>
              <Button
                variant="ghost"
                onClick={async () => {
                  setExtendModalOpen(false);
                  // Just save normally (as Editted)
                  if (pendingSaveOpts) {
                    setBusy(true);
                    try {
                      const res = await fetch("/admin/agreements/api", {
                        method: "POST",
                        body: JSON.stringify({
                          action: pendingSaveOpts.action,
                          payload: pendingSaveOpts.payload // Keep original payload
                        }),
                      });
                      const j = await res.json();
                      if (!j.ok) throw new Error(j.error);
                      play("ok");
                      if (!pendingSaveOpts.silent && j.whatsapp_url) window.open(j.whatsapp_url, "_blank");
                      window.location.href = onDoneHref;
                    } catch (e: any) {
                      setErr(e.message);
                      play("fail");
                    } finally {
                      setBusy(false);
                    }
                  }
                }}
                className="w-full"
              >
                No, just an edit
              </Button>
            </div>
          </div>
        </div>
      )}

      {showAlertModal && serviceAlerts.length > 0 && (
        <div className="fixed inset-0 z-70 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl border-l-4 border-amber-500 shadow-2xl max-w-sm w-full animate-in zoom-in duration-200">
            <div className="flex items-center gap-3 text-amber-700 font-black text-lg mb-4">
              <Wrench className="w-6 h-6" /> Maintenance Alert
            </div>
            <div className="space-y-3 mb-6">
              {serviceAlerts.map((msg, i) => (
                <div key={i} className="flex gap-3 text-sm font-bold text-gray-700 font-bold bg-amber-50 p-3 rounded-lg border border-amber-100 italic">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                  {msg}
                </div>
              ))}
            </div>
            <Button
              onClick={() => setShowAlertModal(false)}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-black py-4"
            >
              Acknowledge
            </Button>
          </div>
        </div>
      )}
    </div>

  );
}
