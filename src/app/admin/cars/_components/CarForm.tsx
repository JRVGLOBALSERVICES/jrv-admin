"use client";

import React, { useEffect, useMemo, useState } from "react";
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
  XCircle,
  Palette,
  Zap,
  Sparkles,
  ArrowLeft,
  Trash2,
  CalendarDays,
} from "lucide-react";
import Link from "next/link";

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
      <span className="text-sm font-bold text-gray-700">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={[
          "h-6 w-11 rounded-full border transition-colors relative",
          value ? "bg-black border-black" : "bg-gray-200 border-gray-300",
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

function toNumberOrNull(v: any): number | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function CarForm({
  mode,
  initial,
  catalog,
  gateRole,
}: {
  mode: "create" | "edit";
  gateRole: "admin" | "superadmin";
  initial: any;
  catalog: CatalogRow[];
}) {
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [catalogId, setCatalogId] = useState<string>(initial.catalog_id ?? "");
  const [hydratedFromCatalog, setHydratedFromCatalog] = useState(false);

  const [id] = useState<string>(initial.id);
  const [plate, setPlate] = useState(initial.plate_number ?? "");
  const [status, setStatus] = useState(initial.status ?? "available");
  const [location, setLocation] = useState(initial.location ?? "Seremban");
  const [year, setYear] = useState(initial.year ?? "2025");
  const [insuranceExpiry, setInsuranceExpiry] = useState(initial.insurance_expiry ?? "");
  const [roadtaxExpiry, setRoadtaxExpiry] = useState(initial.roadtax_expiry ?? "");
  const [trackInsurance, setTrackInsurance] = useState(initial.track_insurance ?? true);

  const [dailyPrice, setDailyPrice] = useState(
    String(initial.daily_price ?? "")
  );
  const [price3Days, setPrice3Days] = useState(
    String(initial.price_3_days ?? "")
  );
  const [weeklyPrice, setWeeklyPrice] = useState(
    String(initial.weekly_price ?? "")
  );
  const [monthlyPrice, setMonthlyPrice] = useState(
    String(initial.monthly_price ?? "")
  );
  const [deposit, setDeposit] = useState(String(initial.deposit ?? ""));

  const [isFeatured, setIsFeatured] = useState(!!initial.is_featured);
  const [promoPrice, setPromoPrice] = useState(
    String(initial.promo_price ?? "")
  );
  const [promoLabel, setPromoLabel] = useState(initial.promo_label ?? "");

  const [bodyType, setBodyType] = useState(initial.body_type ?? "Local");
  const [seats, setSeats] = useState(String(initial.seats ?? "5"));
  const [transmission, setTransmission] = useState(
    initial.transmission ?? "auto"
  );
  const [color, setColor] = useState(initial.color ?? "#111827");

  const [bluetooth, setBluetooth] = useState(!!initial.bluetooth);
  const [smokingAllowed, setSmokingAllowed] = useState(
    !!initial.smoking_allowed
  );
  const [fuelType, setFuelType] = useState<(typeof FUEL_TYPES)[number]>(
    initial.fuel_type ?? "95"
  );
  const [aux, setAux] = useState(!!initial.aux);
  const [usb, setUsb] = useState(!!initial.usb);
  const [androidAuto, setAndroidAuto] = useState(!!initial.android_auto);
  const [appleCarplay, setAppleCarplay] = useState(!!initial.apple_carplay);

  const [primaryImageUrl, setPrimaryImageUrl] = useState<string>(
    initial.primary_image_url ?? ""
  );
  const [gallery, setGallery] = useState<string[]>(() => {
    const arr = Array.isArray(initial.images) ? initial.images : [];
    const filled = [...arr].slice(0, 4);
    while (filled.length < 4) filled.push("");
    return filled;
  });

  const [uploadingPrimary, setUploadingPrimary] = useState(false);
  const [uploadingGalleryIdx, setUploadingGalleryIdx] = useState<number | null>(
    null
  );

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

  const catalogDefaultPrimary = useMemo(() => {
    if (!catalogId) return "";
    return (
      catalog.find((c) => c.id === catalogId)?.default_images?.trim() || ""
    );
  }, [catalog, catalogId]);

  const primaryPreviewUrl = (
    primaryImageUrl ||
    catalogDefaultPrimary ||
    ""
  ).trim();

  useEffect(() => {
    if (!catalogId || !catalog?.length) return;
    const row = catalog.find((c) => c.id === catalogId);
    if (!row) return;
    setMake((prev) => prev || (row.make ?? "").trim());
    setModel((prev) => prev || (row.model ?? "").trim());
    setHydratedFromCatalog(true);
  }, [catalog, catalogId]);

  useEffect(() => {
    if (!hydratedFromCatalog && mode === "edit") return;
    if (model && modelsForMake.includes(model)) return;
    setModel("");
    setCatalogId("");
  }, [make, hydratedFromCatalog, mode, model, modelsForMake]);

  useEffect(() => {
    if (!make || !model) return;
    const row = catalog.find(
      (r) => (r.make ?? "").trim() === make && (r.model ?? "").trim() === model
    );
    setCatalogId(row?.id ?? "");
  }, [catalog, make, model]);

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

  const save = async () => {
    setErr(null);
    if (!catalogId || !plate.trim()) {
      setErr("Missing required fields");
      return;
    }
    setSaving(true);
    try {
      const primaryToSave =
        (primaryImageUrl || catalogDefaultPrimary || "").trim() || null;
      const res = await fetch("/admin/cars/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: mode === "edit" ? "update" : "create",
          payload: {
            id: mode === "edit" ? id : undefined,
            plate_number: plate.trim(),
            catalog_id: catalogId,
            status,
            location,
            daily_price: toNumberOrNull(dailyPrice),
            price_3_days: toNumberOrNull(price3Days),
            weekly_price: toNumberOrNull(weeklyPrice),
            monthly_price: toNumberOrNull(monthlyPrice),
            deposit: toNumberOrNull(deposit),
            body_type: bodyType,
            seats: toNumberOrNull(seats),
            transmission,
            color,
            year,
            insurance_expiry: insuranceExpiry || null,
            roadtax_expiry: roadtaxExpiry || null,
            primary_image_url: primaryToSave,
            images: gallery,
            bluetooth,
            smoking_allowed: smokingAllowed,
            fuel_type: fuelType,
            aux,
            usb,
            android_auto: androidAuto,
            apple_carplay: appleCarplay,
            is_featured: isFeatured,
            promo_price: toNumberOrNull(promoPrice),
            promo_label: promoLabel.trim() || null,
            track_insurance: trackInsurance,
          },
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      window.location.href = "/admin/cars";
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  const del = async () => {
    if (gateRole !== "superadmin" || !id || !confirm("Delete this car?"))
      return;
    setSaving(true);
    try {
      const res = await fetch("/admin/cars/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id: String(id) }),
      });
      if (!res.ok) throw new Error("Delete failed");
      window.location.href = "/admin/cars";
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto pb-20">
      <div className="flex justify-between items-center gap-4">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
          {mode === "edit" ? "Edit Car Details" : "New Car Listing"}
        </h1>
        <div className="flex gap-2">
          {mode === "edit" && gateRole === "superadmin" && (
            <Button
              onClick={del}
              loading={saving}
              variant="secondary"
              className="bg-white border-red-100 text-red-600 shadow-sm text-xs font-bold p-6"
            >
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </Button>
          )}
          <Button
            variant="secondary"
            className="bg-white border-gray-200 text-gray-600 shadow-sm text-xs font-bold p-6"
          >
            <Link href="/admin/cars" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Back
            </Link>
          </Button>
        </div>
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
          <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100/50 space-y-4">
            <h3 className="text-sm font-bold text-indigo-900 flex items-center gap-2 uppercase tracking-wider">
              <Car className="w-4 h-4" /> Catalog Identity
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

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 uppercase tracking-wider">
              <Settings className="w-4 h-4" /> Key Specifications
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Plate Number</label>
                <input
                  className={inputClass}
                  value={plate}
                  onChange={(e) => setPlate(e.target.value)}
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

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 uppercase tracking-wider">
              <CalendarDays className="w-4 h-4" /> Expiry Dates (Internal)
            </h3>
            <div className="flex items-center gap-4 mb-2">
              <Toggle label="Track Insurance/Roadtax" value={trackInsurance} onChange={setTrackInsurance} />
              <p className="text-xs text-gray-400 italic">If disabled, this car won't appear in the Insurance Dashboard.</p>
            </div>
            {trackInsurance && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Insurance Expiry</label>
                  <input
                    type="date"
                    className={inputClass}
                    value={insuranceExpiry}
                    onChange={(e) => setInsuranceExpiry(e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>Roadtax Expiry</label>
                  <input
                    type="date"
                    className={inputClass}
                    value={roadtaxExpiry}
                    onChange={(e) => setRoadtaxExpiry(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

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
                label="Featured Car"
                value={isFeatured}
                onChange={setIsFeatured}
              />
              <div>
                <label className={labelClass}>Promo Label</label>
                <input
                  className={inputClass}
                  value={promoLabel}
                  onChange={(e) => setPromoLabel(e.target.value)}
                  placeholder="e.g. Member Special"
                />
              </div>
              <div>
                <label className={labelClass}>Promo Price (RM)</label>
                <input
                  type="number"
                  className={inputClass}
                  value={promoPrice}
                  onChange={(e) => setPromoPrice(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 uppercase tracking-wider">
              <Tag className="w-4 h-4" /> Build Details
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className={labelClass}>Body</label>
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
              <div className="col-span-2 md:col-span-4">
                <label className={labelClass}>
                  <Palette className="w-3 h-3" /> Color Hex
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-10 w-12 border rounded-lg p-1 bg-white cursor-pointer"
                  />
                  <input
                    className={inputClass}
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 uppercase tracking-wider">
              <Sparkles className="w-4 h-4" /> Interior Features
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

          <div className="space-y-6">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 uppercase tracking-wider">
              <Upload className="w-4 h-4" /> Media Assets
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className={labelClass}>Primary Thumbnail</label>
                  {primaryImageUrl && (
                    <button
                      onClick={() => setPrimaryImageUrl("")}
                      className="text-[10px] text-red-500 font-bold uppercase underline"
                    >
                      Reset to Default
                    </button>
                  )}
                </div>
                <div className="aspect-video bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center relative overflow-hidden">
                  {primaryPreviewUrl ? (
                    <img
                      src={primaryPreviewUrl}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Upload className="w-8 h-8 text-gray-200" />
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
                <label className={labelClass}>Gallery (4 images)</label>
                <div className="grid grid-cols-2 gap-3">
                  {gallery.map((url, idx) => (
                    <div
                      key={idx}
                      className="aspect-video bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center relative overflow-hidden"
                    >
                      {url ? (
                        <img src={url} className="w-full h-full object-cover" />
                      ) : (
                        <Upload className="w-4 h-4 text-gray-200" />
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

          <div className="pt-8 border-t border-gray-100 flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className={labelClass}>Availability Status</label>
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
              onClick={save}
              loading={saving}
              className="h-14 md:w-64 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 shadow-lg shadow-indigo-200"
            >
              Update Car Information
            </Button>
          </div>
        </div>
      </Card >
    </div >
  );
}
