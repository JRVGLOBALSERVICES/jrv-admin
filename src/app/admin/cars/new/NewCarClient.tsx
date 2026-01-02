"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  Car,
  Settings,
  Tag,
  MapPin,
  Users,
  Fuel,
  Upload,
  CheckCircle,
  XCircle,
  Palette,
  Zap,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

// --- STYLES (Matching Agreements) ---
const inputClass =
  "w-full border-0 bg-gray-50/50 rounded-lg px-3 py-2 text-sm ring-1 ring-gray-200 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-inner placeholder:text-gray-400 text-gray-800 uppercase h-10";
const labelClass =
  "text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5";

type CatalogRow = {
  id: string;
  make: string | null;
  model: string | null;
  default_images?: string | null;
};

const LOCATIONS = [
  "Seremban",
  "Seremban 2",
  "Seremban 3",
  "Nilai",
  "Port Dickson",
  "KLIA",
  "Kuala Lumpur",
] as const;

const BODY_TYPES = [
  "Local",
  "Hatchback",
  "Sedan",
  "MPV/Van",
  "SUV",
  "Sports",
] as const;

const TRANSMISSIONS = ["auto", "manual"] as const;
const FUEL_TYPES = ["95", "97"] as const;

function uniq(arr: string[]) {
  return Array.from(new Set(arr)).sort((a, b) => a.localeCompare(b));
}

async function uploadImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/admin/upload", { method: "POST", body: fd });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || "Upload failed");
  if (!json?.url) throw new Error("Upload did not return url");
  return String(json.url);
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 bg-white cursor-pointer hover:bg-gray-50 transition-colors">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={[
          "h-6 w-11 rounded-full border transition-colors relative",
          value
            ? "bg-indigo-600 border-indigo-600"
            : "bg-gray-200 border-gray-300",
        ].join(" ")}
      >
        <span
          className={[
            "absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full shadow transition-all",
            value ? "left-6 bg-white" : "left-1 bg-white",
          ].join(" ")}
        />
      </button>
    </label>
  );
}

function toNumberOrNull(v: string): number | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export default function NewCarPage() {
  const [catalog, setCatalog] = useState<CatalogRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [catalogId, setCatalogId] = useState("");

  const [plate, setPlate] = useState("");
  const [status, setStatus] = useState("available");
  const [year, setYear] = useState("2025");
  const [location, setLocation] =
    useState<(typeof LOCATIONS)[number]>("Seremban");

  const [dailyPrice, setDailyPrice] = useState("140");
  const [price3Days, setPrice3Days] = useState("");
  const [weeklyPrice, setWeeklyPrice] = useState("");
  const [monthlyPrice, setMonthlyPrice] = useState("");
  const [deposit, setDeposit] = useState("0");

  const [isFeatured, setIsFeatured] = useState(false);
  const [promoPrice, setPromoPrice] = useState("");
  const [promoLabel, setPromoLabel] = useState("");

  const [bodyType, setBodyType] =
    useState<(typeof BODY_TYPES)[number]>("Local");
  const [seats, setSeats] = useState("5");
  const [transmission, setTransmission] =
    useState<(typeof TRANSMISSIONS)[number]>("auto");
  const [color, setColor] = useState("#111827");

  const [bluetooth, setBluetooth] = useState(true);
  const [smokingAllowed, setSmokingAllowed] = useState(false);
  const [fuelType, setFuelType] = useState<(typeof FUEL_TYPES)[number]>("95");
  const [aux, setAux] = useState(false);
  const [usb, setUsb] = useState(true);
  const [androidAuto, setAndroidAuto] = useState(false);
  const [appleCarplay, setAppleCarplay] = useState(false);

  const [primaryImageUrl, setPrimaryImageUrl] = useState<string>("");
  const [gallery, setGallery] = useState<string[]>(["", "", "", ""]);
  const [uploadingPrimary, setUploadingPrimary] = useState(false);
  const [uploadingGalleryIdx, setUploadingGalleryIdx] = useState<number | null>(
    null
  );

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/admin/catalog/api", { cache: "no-store" });
        const json = await res.json();
        if (res.ok) setCatalog(json.data || []);
      } catch (e) {
        setErr("Failed to load catalog");
      }
    })();
  }, []);

  const makes = useMemo(
    () => uniq(catalog.map((r) => (r.make ?? "").trim()).filter(Boolean)),
    [catalog]
  );
  const modelsForMake = useMemo(() => {
    if (!make) return [];
    return uniq(
      catalog
        .filter((r) => (r.make ?? "").trim() === make)
        .map((r) => (r.model ?? "").trim())
        .filter(Boolean)
    );
  }, [catalog, make]);

  useEffect(() => {
    setModel("");
    setCatalogId("");
  }, [make]);
  useEffect(() => {
    if (!make || !model) {
      setCatalogId("");
      return;
    }
    const row = catalog.find(
      (r) => (r.make ?? "").trim() === make && (r.model ?? "").trim() === model
    );
    setCatalogId(row?.id ?? "");
  }, [catalog, make, model]);

  const catalogDefaultPrimary = useMemo(() => {
    if (!catalogId) return "";
    return (
      catalog.find((c) => c.id === catalogId)?.default_images?.trim() || ""
    );
  }, [catalog, catalogId]);

  useEffect(() => {
    if (!primaryImageUrl && catalogDefaultPrimary)
      setPrimaryImageUrl(catalogDefaultPrimary);
  }, [catalogDefaultPrimary, primaryImageUrl]);

  const handlePrimaryUpload = async (file: File) => {
    setUploadingPrimary(true);
    try {
      const url = await uploadImage(file);
      setPrimaryImageUrl(url);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setUploadingPrimary(false);
    }
  };

  const handleGalleryUpload = async (idx: number, file: File) => {
    setUploadingGalleryIdx(idx);
    try {
      const url = await uploadImage(file);
      setGallery((prev) => {
        const next = [...prev];
        next[idx] = url;
        return next;
      });
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setUploadingGalleryIdx(null);
    }
  };

  const submit = async () => {
    setErr(null);
    if (!catalogId || !plate.trim()) {
      setErr("Catalog and Plate Number are required");
      return;
    }
    const effectivePrimary = primaryImageUrl || catalogDefaultPrimary;
    if (!effectivePrimary) {
      setErr("Primary image required");
      return;
    }
    if (gallery.some((x) => !x)) {
      setErr("All 4 gallery images are required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/admin/cars/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          payload: {
            plate_number: plate.trim(),
            catalog_id: catalogId,
            status,
            year,
            location,
            daily_price: toNumberOrNull(dailyPrice),
            price_3_days: toNumberOrNull(price3Days),
            weekly_price: toNumberOrNull(weeklyPrice),
            monthly_price: toNumberOrNull(monthlyPrice),
            deposit: toNumberOrNull(deposit),
            is_featured: isFeatured,
            promo_price: toNumberOrNull(promoPrice),
            promo_label: promoLabel.trim() || null,
            body_type: bodyType,
            seats: toNumberOrNull(seats),
            transmission,
            color,
            primary_image_url: effectivePrimary,
            images: gallery,
            bluetooth,
            smoking_allowed: smokingAllowed,
            fuel_type: fuelType,
            aux,
            usb,
            android_auto: androidAuto,
            apple_carplay: appleCarplay,
          },
        }),
      });
      if (!res.ok) throw new Error("Failed to create car");
      window.location.href = "/admin/cars";
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-5xl mx-auto pb-20">
      <div className="flex justify-between items-center gap-4">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
          New Car Listing
        </h1>
        <Button
          variant="secondary"
          className="bg-white border-gray-200 text-gray-600 shadow-sm text-xs font-bold p-6"
        >
          <Link href="/admin/cars" className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Cancel & Exit
          </Link>
        </Button>
      </div>

      {err && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3 text-red-700 font-bold text-sm">
            <XCircle className="w-5 h-5" /> {err}
          </div>
        </div>
      )}

      <Card className="p-0 overflow-hidden shadow-xl shadow-gray-200/50 border border-gray-100">
        <div className="p-6 space-y-8">
          {/* CATALOG SECTION */}
          <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100/50 space-y-4">
            <h3 className="text-sm font-bold text-indigo-900 flex items-center gap-2 uppercase tracking-wider">
              <Car className="w-4 h-4" /> Catalog Selection
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Make</label>
                <select
                  className={inputClass}
                  value={make}
                  onChange={(e) => setMake(e.target.value)}
                >
                  <option value="">Select Make...</option>
                  {makes.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Model</label>
                <select
                  className={inputClass}
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  disabled={!make}
                >
                  <option value="">
                    {make ? "Select Model..." : "Select Make First"}
                  </option>
                  {modelsForMake.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* BASIC INFO */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 uppercase tracking-wider">
              <Settings className="w-4 h-4" /> Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Plate Number</label>
                <input
                  className={inputClass}
                  value={plate}
                  onChange={(e) => setPlate(e.target.value)}
                  placeholder="VLV 1234"
                />
              </div>
              <div>
                <label className={labelClass}>Year</label>
                <input
                  className={inputClass}
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Location</label>
                <select
                  className={inputClass}
                  value={location}
                  onChange={(e) => setLocation(e.target.value as any)}
                >
                  {LOCATIONS.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* PRICING & PROMO */}
          <div className="bg-emerald-50/30 p-5 rounded-2xl border border-emerald-100/50 space-y-6">
            <h3 className="text-sm font-bold text-emerald-900 flex items-center gap-2 uppercase tracking-wider">
              <Zap className="w-4 h-4" /> Pricing & Promotion
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <label className={labelClass}>Daily (RM)</label>
                <input
                  type="number"
                  className={inputClass}
                  value={dailyPrice}
                  onChange={(e) => setDailyPrice(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>3 Days (RM)</label>
                <input
                  type="number"
                  className={inputClass}
                  value={price3Days}
                  onChange={(e) => setPrice3Days(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Weekly (RM)</label>
                <input
                  type="number"
                  className={inputClass}
                  value={weeklyPrice}
                  onChange={(e) => setWeeklyPrice(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Monthly (RM)</label>
                <input
                  type="number"
                  className={inputClass}
                  value={monthlyPrice}
                  onChange={(e) => setMonthlyPrice(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Deposit (RM)</label>
                <input
                  type="number"
                  className={inputClass}
                  value={deposit}
                  onChange={(e) => setDeposit(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-emerald-100/50">
              <Toggle
                label="Feature on Home Page"
                value={isFeatured}
                onChange={setIsFeatured}
              />
              <div>
                <label className={labelClass}>Promo Label</label>
                <input
                  className={inputClass}
                  value={promoLabel}
                  onChange={(e) => setPromoLabel(e.target.value)}
                  placeholder="Flash Sale"
                />
              </div>
              <div>
                <label className={labelClass}>Promo Price (RM)</label>
                <input
                  type="number"
                  className={inputClass}
                  value={promoPrice}
                  onChange={(e) => setPromoPrice(e.target.value)}
                  placeholder="Lower Daily Price"
                />
              </div>
            </div>
          </div>

          {/* SPECS */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 uppercase tracking-wider">
              <Tag className="w-4 h-4" /> Specifications
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className={labelClass}>Body Type</label>
                <select
                  className={inputClass}
                  value={bodyType}
                  onChange={(e) => setBodyType(e.target.value as any)}
                >
                  {BODY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Seats</label>
                <input
                  type="number"
                  className={inputClass}
                  value={seats}
                  onChange={(e) => setSeats(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Transmission</label>
                <select
                  className={inputClass}
                  value={transmission}
                  onChange={(e) => setTransmission(e.target.value as any)}
                >
                  {TRANSMISSIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Fuel</label>
                <select
                  className={inputClass}
                  value={fuelType}
                  onChange={(e) => setFuelType(e.target.value as any)}
                >
                  {FUEL_TYPES.map((t) => (
                    <option key={t} value={t}>{`RON${t}`}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* FEATURES */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 uppercase tracking-wider">
              <Sparkles className="w-4 h-4" /> Features
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Toggle
                label="Bluetooth"
                value={bluetooth}
                onChange={setBluetooth}
              />
              <Toggle
                label="Smoking Allowed"
                value={smokingAllowed}
                onChange={setSmokingAllowed}
              />
              <Toggle label="AUX" value={aux} onChange={setAux} />
              <Toggle label="USB" value={usb} onChange={setUsb} />
              <Toggle
                label="Android Auto"
                value={androidAuto}
                onChange={setAndroidAuto}
              />
              <Toggle
                label="Apple CarPlay"
                value={appleCarplay}
                onChange={setAppleCarplay}
              />
            </div>
          </div>

          {/* IMAGES */}
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 uppercase tracking-wider">
              <Upload className="w-4 h-4" /> Media Assets
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className={labelClass}>Primary Image</label>
                <div className="aspect-video bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center relative overflow-hidden group">
                  {primaryImageUrl ? (
                    <img
                      src={primaryImageUrl}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center text-gray-400">
                      <Upload className="w-8 h-8 mx-auto mb-2 opacity-20" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">
                        Main Thumbnail
                      </span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={(e) =>
                      e.target.files?.[0] &&
                      handlePrimaryUpload(e.target.files[0])
                    }
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className={labelClass}>Gallery (4 Required)</label>
                <div className="grid grid-cols-2 gap-3">
                  {gallery.map((url, idx) => (
                    <div
                      key={idx}
                      className="aspect-video bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center relative overflow-hidden"
                    >
                      {url ? (
                        <img src={url} className="w-full h-full object-cover" />
                      ) : (
                        <Upload className="w-4 h-4 text-gray-300" />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) =>
                          e.target.files?.[0] &&
                          handleGalleryUpload(idx, e.target.files[0])
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-100 flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className={labelClass}>Listing Status</label>
              <select
                className={inputClass}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="available">Available</option>
                <option value="rented">Rented</option>
                <option value="maintenance">Maintenance</option>
                <option value="inactive">Inactive</option>
                <option value="website-display-only">
                  Website Display Only
                </option>
              </select>
            </div>
            <Button
              onClick={submit}
              loading={saving}
              className="h-14 md:w-64 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 shadow-lg shadow-indigo-200"
            >
              Save New Car
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
