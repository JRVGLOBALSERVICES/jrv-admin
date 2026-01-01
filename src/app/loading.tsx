// src/app/loading.tsx
import Image from "next/image";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-9999 flex flex-col items-center justify-center bg-linear-to-br from-[#F15828] via-[#FF3057] to-slate-900">
      <div className="animate-pulse flex flex-col items-center gap-6">
        <div className="bg-white p-5 rounded-3xl shadow-2xl">
          <Image
            src="/logo.png"
            alt="JRV Loading"
            width={100}
            height={100}
            priority
          />
        </div>
        <div className="text-center space-y-2">
          <h1 className="text-white text-3xl font-extrabold tracking-widest drop-shadow-lg">
            JRV ADMIN
          </h1>
          <p className="text-white/80 text-sm">Loading...</p>
        </div>
      </div>
    </div>
  );
}
