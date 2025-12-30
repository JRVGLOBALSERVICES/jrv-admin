"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";


type CatalogRow = {
  id: string;
  make: string | null;
  model: string | null;
  default_images?: string | null; // ✅
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

  // Make -> Model
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [catalogId, setCatalogId] = useState("");

  // basics
  const [plate, setPlate] = useState("");
  const [status, setStatus] = useState("available");
  const [location, setLocation] =
    useState<(typeof LOCATIONS)[number]>("Seremban");

  // prices
  const [dailyPrice, setDailyPrice] = useState("140");
  const [price3Days, setPrice3Days] = useState("");
  const [weeklyPrice, setWeeklyPrice] = useState("");
  const [monthlyPrice, setMonthlyPrice] = useState("");
  const [deposit, setDeposit] = useState("0");

  // specs
  const [bodyType, setBodyType] =
    useState<(typeof BODY_TYPES)[number]>("Local");
  const [seats, setSeats] = useState("5");
  const [transmission, setTransmission] =
    useState<(typeof TRANSMISSIONS)[number]>("auto");
  const [color, setColor] = useState("#111827");

  // features
  const [bluetooth, setBluetooth] = useState(true);
  const [smokingAllowed, setSmokingAllowed] = useState(false);
  const [fuelType, setFuelType] = useState<(typeof FUEL_TYPES)[number]>("95");
  const [aux, setAux] = useState(false);
  const [usb, setUsb] = useState(true);
  const [androidAuto, setAndroidAuto] = useState(false);
  const [appleCarplay, setAppleCarplay] = useState(false);

  // images
  const [primaryImageUrl, setPrimaryImageUrl] = useState<string>("");
  const [gallery, setGallery] = useState<string[]>(["", "", "", ""]);

  const [uploadingPrimary, setUploadingPrimary] = useState(false);
  const [uploadingGalleryIdx, setUploadingGalleryIdx] = useState<number | null>(
    null
  );

  // fetch catalog
  useEffect(() => {
    (async () => {
      setErr(null);
      const res = await fetch("/admin/catalog/api", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) {
        setErr(json?.error || "Failed to load catalog");
        return;
      }
      setCatalog(json.data || []);
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

  // reset model when make changes
  useEffect(() => {
    setModel("");
    setCatalogId("");
    // NOTE: don’t clear primaryImageUrl here
  }, [make]);

  // resolve catalogId when make+model set
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

  // ✅ catalog default primary
  const catalogDefaultPrimary = useMemo(() => {
    if (!catalogId) return "";
    const row = catalog.find((c) => c.id === catalogId);
    return String(row?.default_images ?? "").trim();
  }, [catalog, catalogId]);

  // ✅ when selecting a catalog that has default image AND no uploaded primary yet, use it
  useEffect(() => {
    if (!primaryImageUrl && catalogDefaultPrimary) {
      setPrimaryImageUrl(catalogDefaultPrimary);
    }
  }, [catalogDefaultPrimary, primaryImageUrl]);

  const handlePrimaryUpload = async (file: File) => {
    setErr(null);
    setUploadingPrimary(true);
    try {
      const url = await uploadImage(file);
      setPrimaryImageUrl(url);
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
        next[idx] = url; // ✅ only that index
        return next;
      });
    } catch (e: any) {
      setErr(e?.message || "Gallery upload failed");
    } finally {
      setUploadingGalleryIdx(null);
    }
  };

  const validate = () => {
    if (!catalogId) return "Select Make + Model from catalog";
    if (!plate.trim()) return "Plate number required";

    // ✅ allow either uploaded primary OR catalog default
    const effectivePrimary = primaryImageUrl || catalogDefaultPrimary;
    if (!effectivePrimary)
      return "No primary image available (upload one or set catalog default).";

    if (gallery.some((x) => !x)) return "Please upload all 4 gallery images";
    return null;
  };

  const submit = async () => {
    setErr(null);
    const v = validate();
    if (v) return setErr(v);

    const effectivePrimary = primaryImageUrl || catalogDefaultPrimary;

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

            primary_image_url: effectivePrimary, // ✅
            images: gallery, // ✅ 4 urls

            bluetooth,
            smoking_allowed: smokingAllowed,
            fuel_type: fuelType, // ✅ correct column
            aux,
            usb,
            android_auto: androidAuto,
            apple_carplay: appleCarplay,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to create car");
      window.location.href = "/admin/cars";
    } catch (e: any) {
      setErr(e?.message || "Create failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6">
      <Card className="p-4 md:p-6 space-y-6 max-w-4xl">
        <div>
          <div className="text-xl font-semibold">New Car</div>
          <div className="text-sm opacity-70">
            Select <b>Make</b> first, then <b>Model</b>. Upload 4 gallery
            images. Primary uses uploaded image, else catalog default.
          </div>
        </div>

        {err ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {err}
          </div>
        ) : null}

        {/* Catalog */}
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

        {/* Basic */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <FieldLabel>Plate Number</FieldLabel>
            <input
              className="w-full border rounded-lg px-3 py-2"
              value={plate}
              onChange={(e) => setPlate(e.target.value)}
              placeholder="e.g. VLV 1234"
            />
          </div>

          <div>
            <FieldLabel>Location</FieldLabel>
            <select
              className="w-full border rounded-lg px-3 py-2 bg-white"
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
              <option value="website-display-only">website-display-only</option>
            </select>
          </div>
        </div>

        {/* Pricing */}
        <div className="space-y-2">
          <div className="text-sm font-medium">Pricing</div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <FieldLabel>Per Day (RM)</FieldLabel>
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
              <FieldLabel>Week (RM)</FieldLabel>
              <input
                className="w-full border rounded-lg px-3 py-2"
                type="number"
                value={weeklyPrice}
                onChange={(e) => setWeeklyPrice(e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>Month (RM)</FieldLabel>
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
              <FieldLabel>Transmission</FieldLabel>
              <select
                className="w-full border rounded-lg px-3 py-2 bg-white"
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
                {FUEL_TYPES.map((t) => (
                  <option key={t} value={t}>
                    RON{t}
                  </option>
                ))}
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

        {/* Images */}
        <div className="space-y-3">
          <div className="text-sm font-medium">Images</div>

          {/* Primary */}
          <div className="rounded-xl border p-3 space-y-2 bg-white">
            <div className="text-xs opacity-60">
              Primary Thumbnail (upload optional if catalog default exists)
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

            <div className="text-xs opacity-60">
              {uploadingPrimary
                ? "Uploading…"
                : primaryImageUrl || catalogDefaultPrimary
                ? "Ready ✅"
                : "Missing"}
            </div>

            {primaryImageUrl || catalogDefaultPrimary ? (
              <div className="space-y-2">
                <img
                  src={primaryImageUrl || catalogDefaultPrimary}
                  alt="Primary"
                  className="h-28 rounded-lg border object-cover"
                />

                {/* allow clearing uploaded primary -> fall back to catalog default */}
                {primaryImageUrl ? (
                  <button
                    type="button"
                    className="text-xs underline opacity-80"
                    onClick={() => setPrimaryImageUrl("")}
                  >
                    Remove uploaded primary (use catalog default)
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Gallery */}
          <div className="rounded-xl border p-3 space-y-2 bg-white">
            <div className="text-xs opacity-60">Gallery (exactly 4 images)</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {gallery.map((url, idx) => (
                <div key={idx} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">Image {idx + 1}</div>
                    <div className="text-xs opacity-60">
                      {uploadingGalleryIdx === idx
                        ? "Uploading…"
                        : url
                        ? "Uploaded ✅"
                        : "Required"}
                    </div>
                  </div>

                  <input
                    type="file"
                    accept="image/*"
                    disabled={
                      uploadingGalleryIdx !== null &&
                      uploadingGalleryIdx !== idx
                    }
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleGalleryUpload(idx, f);
                    }}
                  />

                  {url ? (
                    <>
                      <img
                        src={url}
                        alt={`Gallery ${idx + 1}`}
                        className="h-24 rounded border object-cover"
                      />
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
                    </>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>

        <Button loading={saving} onClick={submit} className="w-full">
          Create Car
        </Button>

        <div className="text-xs opacity-60">
          Selected Catalog: {catalogId ? `${make} ${model}` : "—"}
        </div>
      </Card>
    </div>
  );
}
