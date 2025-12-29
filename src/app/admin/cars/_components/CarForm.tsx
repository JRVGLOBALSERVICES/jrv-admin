"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type CatalogRow = {
  id: string;
  make: string | null;
  model: string | null;

  // ✅ add this column in your car_catalog table
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

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-xs opacity-60 mb-1">{children}</div>;
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
    <label className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 bg-white">
      <span className="text-sm">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={[
          "h-7 w-12 rounded-full border transition relative",
          value ? "bg-black" : "bg-white",
        ].join(" ")}
        aria-pressed={value}
      >
        <span
          className={[
            "absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-full shadow transition",
            value ? "left-6 bg-white" : "left-1 bg-black",
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

  // ✅ Make first then model (derived from catalog_id)
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [catalogId, setCatalogId] = useState<string>(initial.catalog_id ?? "");

  // ✅ prevents initial hydrate from getting wiped by the "make changes" effect
  const [hydratedFromCatalog, setHydratedFromCatalog] = useState(false);

  // core
  const [id] = useState<string>(initial.id); // keep stable
  const [plate, setPlate] = useState(initial.plate_number ?? "");
  const [status, setStatus] = useState(initial.status ?? "available");
  const [location, setLocation] = useState(initial.location ?? "Seremban");

  // prices
  const [dailyPrice, setDailyPrice] = useState(String(initial.daily_price ?? ""));
  const [price3Days, setPrice3Days] = useState(String(initial.price_3_days ?? ""));
  const [weeklyPrice, setWeeklyPrice] = useState(String(initial.weekly_price ?? ""));
  const [monthlyPrice, setMonthlyPrice] = useState(String(initial.monthly_price ?? ""));
  const [deposit, setDeposit] = useState(String(initial.deposit ?? ""));

  // specs
  const [bodyType, setBodyType] = useState(initial.body_type ?? "Local");
  const [seats, setSeats] = useState(String(initial.seats ?? "5"));
  const [transmission, setTransmission] = useState(initial.transmission ?? "auto");
  const [color, setColor] = useState(initial.color ?? "#111827");

  // features
  const [bluetooth, setBluetooth] = useState(!!initial.bluetooth);
  const [smokingAllowed, setSmokingAllowed] = useState(!!initial.smoking_allowed);
  const [fuelType, setFuelType] = useState<(typeof FUEL_TYPES)[number]>(
    initial.fuel_type ?? "95"
  );
  const [aux, setAux] = useState(!!initial.aux);
  const [usb, setUsb] = useState(!!initial.usb);
  const [androidAuto, setAndroidAuto] = useState(!!initial.android_auto);
  const [appleCarplay, setAppleCarplay] = useState(!!initial.apple_carplay);

  // images
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
  const [uploadingGalleryIdx, setUploadingGalleryIdx] = useState<number | null>(null);

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

  // ✅ catalog default primary (fallback)
  const catalogDefaultPrimary = useMemo(() => {
    if (!catalogId) return "";
    const row = catalog.find((c) => c.id === catalogId);
    return String(row?.default_images ?? "").trim();
  }, [catalog, catalogId]);

  // ✅ what we display as "primary preview"
  const primaryPreviewUrl = (primaryImageUrl || catalogDefaultPrimary || "").trim();

  // ✅ Derive make/model from catalog_id on initial edit load
  useEffect(() => {
    if (!catalogId) return;
    if (!catalog?.length) return;

    const row = catalog.find((c) => c.id === catalogId);
    if (!row) return;

    const nextMake = (row.make ?? "").trim();
    const nextModel = (row.model ?? "").trim();

    setMake((prev) => (prev ? prev : nextMake));
    setModel((prev) => (prev ? prev : nextModel));

    setHydratedFromCatalog(true);
  }, [catalog, catalogId]);

  // when make changes - DO NOT wipe during initial hydrate
  useEffect(() => {
    if (!hydratedFromCatalog && mode === "edit") return;

    if (model && modelsForMake.includes(model)) return;

    setModel("");
    setCatalogId("");
  }, [make, hydratedFromCatalog, mode, model, modelsForMake]);

  // resolve catalogId on make+model
  useEffect(() => {
    if (!make || !model) return;

    const row = catalog.find(
      (r) => (r.make ?? "").trim() === make && (r.model ?? "").trim() === model
    );

    setCatalogId(row?.id ?? "");
  }, [catalog, make, model]);

  const handlePrimaryUpload = async (file: File) => {
    setErr(null);
    setUploadingPrimary(true);
    try {
      const url = await uploadImage(file);
      setPrimaryImageUrl(url); // ✅ custom primary overrides catalog default
    } catch (e: any) {
      setErr(e?.message || "Primary upload failed");
    } finally {
      setUploadingPrimary(false);
    }
  };

  const handleGalleryUpload = async (idx: number, file: File) => {
    setErr(null);
    setUploadingGalleryIdx(idx);
    try {
      const url = await uploadImage(file);
      setGallery((prev) => {
        const next = [...prev];
        next[idx] = url;
        return next;
      });
    } catch (e: any) {
      setErr(e?.message || "Gallery upload failed");
    } finally {
      setUploadingGalleryIdx(null);
    }
  };

  const validate = () => {
    if (mode === "edit" && !id) return "Missing car id";
    if (!catalogId) return "Select Make + Model";
    if (!plate.trim()) return "Plate number required";

    // ✅ primary is valid if either custom OR catalog default exists
    if (!primaryPreviewUrl) return "Primary image required (upload or set catalog default)";

    if (gallery.some((x) => !x)) return "Please upload all 4 gallery images";
    return null;
  };

  const save = async () => {
    setErr(null);
    const v = validate();
    if (v) return setErr(v);

    setSaving(true);
    try {
      // ✅ Store primary_image_url with fallback logic
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

            primary_image_url: primaryToSave,
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

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Save failed");
      window.location.href = "/admin/cars";
    } catch (e: any) {
      setErr(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const del = async () => {
    if (gateRole !== "superadmin") return;
    if (!id) return setErr("Missing car id");
    if (!confirm("Delete this car? This cannot be undone.")) return;

    setSaving(true);
    try {
      const res = await fetch("/admin/cars/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id: String(id) }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Delete failed");
      window.location.href = "/admin/cars";
    } catch (e: any) {
      setErr(e?.message || "Delete failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6">
      <Card className="p-4 md:p-6 space-y-6 max-w-4xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xl font-semibold">
              {mode === "edit" ? "Edit Car" : "New Car"}
            </div>
            <div className="text-sm opacity-70">
              Primary thumbnail + 4 gallery images. Make → Model.
              {catalogDefaultPrimary ? (
                <span className="block text-xs opacity-60 mt-1">
                  Catalog default primary detected ✅ (will be used if no custom primary)
                </span>
              ) : null}
            </div>
          </div>

          {mode === "edit" && gateRole === "superadmin" ? (
            <button
              type="button"
              onClick={del}
              className="rounded-lg border px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              disabled={saving}
            >
              Delete Car
            </button>
          ) : null}
        </div>

        {err ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {err}
          </div>
        ) : null}

        {/* Make / Model */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <FieldLabel>Make</FieldLabel>
            <select
              className="w-full border rounded-lg px-3 py-2 bg-white"
              value={make}
              onChange={(e) => setMake(e.target.value)}
            >
              <option value="">Select make…</option>
              {makes.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <FieldLabel>Model</FieldLabel>
            <select
              className="w-full border rounded-lg px-3 py-2 bg-white"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              disabled={!make}
            >
              <option value="">
                {make ? "Select model…" : "Select make first"}
              </option>
              {modelsForMake.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Plate + Location + Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <FieldLabel>Plate Number</FieldLabel>
            <input
              className="w-full border rounded-lg px-3 py-2"
              value={plate}
              onChange={(e) => setPlate(e.target.value)}
            />
          </div>

          <div>
            <FieldLabel>Location</FieldLabel>
            <select
              className="w-full border rounded-lg px-3 py-2 bg-white"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            >
              {LOCATIONS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          <div>
            <FieldLabel>Status</FieldLabel>
            <select
              className="w-full border rounded-lg px-3 py-2 bg-white"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="available">available</option>
              <option value="rented">rented</option>
              <option value="maintenance">maintenance</option>
              <option value="inactive">inactive</option>
            </select>
          </div>
        </div>

        {/* Pricing */}
        <div className="space-y-2">
          <div className="text-sm font-medium">Pricing</div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <FieldLabel>Daily (RM)</FieldLabel>
              <input
                className="w-full border rounded-lg px-3 py-2"
                type="number"
                value={dailyPrice}
                onChange={(e) => setDailyPrice(e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>3 Days (RM)</FieldLabel>
              <input
                className="w-full border rounded-lg px-3 py-2"
                type="number"
                value={price3Days}
                onChange={(e) => setPrice3Days(e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>Weekly (RM)</FieldLabel>
              <input
                className="w-full border rounded-lg px-3 py-2"
                type="number"
                value={weeklyPrice}
                onChange={(e) => setWeeklyPrice(e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>Monthly (RM)</FieldLabel>
              <input
                className="w-full border rounded-lg px-3 py-2"
                type="number"
                value={monthlyPrice}
                onChange={(e) => setMonthlyPrice(e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>Deposit (RM)</FieldLabel>
              <input
                className="w-full border rounded-lg px-3 py-2"
                type="number"
                value={deposit}
                onChange={(e) => setDeposit(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Specs */}
        <div className="space-y-2">
          <div className="text-sm font-medium">Specs</div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <FieldLabel>Body Type</FieldLabel>
              <select
                className="w-full border rounded-lg px-3 py-2 bg-white"
                value={bodyType}
                onChange={(e) => setBodyType(e.target.value)}
              >
                {BODY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel>Transmission</FieldLabel>
              <select
                className="w-full border rounded-lg px-3 py-2 bg-white"
                value={transmission}
                onChange={(e) => setTransmission(e.target.value)}
              >
                {TRANSMISSIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel>Seats</FieldLabel>
              <input
                className="w-full border rounded-lg px-3 py-2"
                type="number"
                value={seats}
                onChange={(e) => setSeats(e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>Fuel</FieldLabel>
              <select
                className="w-full border rounded-lg px-3 py-2 bg-white"
                value={fuelType}
                onChange={(e) => setFuelType(e.target.value as any)}
              >
                <option value="95">RON95</option>
                <option value="97">RON97</option>
              </select>
            </div>

            <div className="md:col-span-4">
              <FieldLabel>Color</FieldLabel>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-10 w-12 border rounded-lg p-1 bg-white"
                />
                <input
                  className="flex-1 border rounded-lg px-3 py-2"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="space-y-2">
          <div className="text-sm font-medium">Features</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Toggle label="Bluetooth" value={bluetooth} onChange={setBluetooth} />
            <Toggle
              label="Smoking Allowed"
              value={smokingAllowed}
              onChange={setSmokingAllowed}
            />
            <Toggle label="AUX" value={aux} onChange={setAux} />
            <Toggle label="USB" value={usb} onChange={setUsb} />
            <Toggle label="Android Auto" value={androidAuto} onChange={setAndroidAuto} />
            <Toggle label="Apple CarPlay" value={appleCarplay} onChange={setAppleCarplay} />
          </div>
        </div>

        {/* Images */}
        <div className="space-y-3">
          <div className="text-sm font-medium">Images</div>

          <div className="rounded-xl border p-3 space-y-2 bg-white">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs opacity-60">
                Primary Thumbnail{" "}
                {primaryImageUrl ? (
                  <span className="ml-2 text-[11px] opacity-70">(custom)</span>
                ) : catalogDefaultPrimary ? (
                  <span className="ml-2 text-[11px] opacity-70">(catalog default)</span>
                ) : null}
              </div>

              {primaryImageUrl ? (
                <button
                  type="button"
                  className="text-xs underline text-red-600"
                  onClick={() => setPrimaryImageUrl("")}
                  disabled={saving || uploadingPrimary}
                  title="Removes custom primary and falls back to catalog default"
                >
                  Remove Primary
                </button>
              ) : null}
            </div>

            <input
              type="file"
              accept="image/*"
              disabled={uploadingPrimary}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handlePrimaryUpload(f);
              }}
            />

            {primaryPreviewUrl ? (
              <img
                src={primaryPreviewUrl}
                className="h-28 rounded-lg border object-cover"
                alt="Primary"
              />
            ) : (
              <div className="text-xs text-red-600">
                No primary image available (upload one or set catalog default).
              </div>
            )}
          </div>

          <div className="rounded-xl border p-3 space-y-2 bg-white">
            <div className="text-xs opacity-60">Gallery (4 images)</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {gallery.map((url, idx) => (
                <div key={idx} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">Image {idx + 1}</div>
                    <div className="text-xs opacity-60">
                      {uploadingGalleryIdx === idx ? "Uploading…" : url ? "✅" : "Required"}
                    </div>
                  </div>

                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingGalleryIdx !== null && uploadingGalleryIdx !== idx}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleGalleryUpload(idx, f);
                    }}
                  />

                  {url ? (
                    <img
                      src={url}
                      className="h-24 rounded border object-cover"
                      alt={`Gallery ${idx + 1}`}
                    />
                  ) : null}

                  {url ? (
                    <button
                      type="button"
                      className="text-xs underline opacity-80"
                      onClick={() =>
                        setGallery((prev) => {
                          const next = [...prev];
                          next[idx] = "";
                          return next;
                        })
                      }
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>

        <Button loading={saving} onClick={save} className="w-full">
          {mode === "edit" ? "Update Car" : "Create Car"}
        </Button>
      </Card>
    </div>
  );
}
