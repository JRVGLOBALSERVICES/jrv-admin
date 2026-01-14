"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/Button"; // Assuming you have this from your other files
import notFoundAnim from "../../public/assets/404.json";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6 text-center">
      {/* Animation Container */}
      <div className="w-full max-w-md mb-8">
        <Lottie
          animationData={notFoundAnim}
          loop={true}
          autoPlay={true}
          rendererSettings={{ preserveAspectRatio: "xMidYMid slice" }}
        />
      </div>

      {/* Text Content */}
      <div className="space-y-4 max-w-lg">
        <h1 className="text-4xl font-black text-gray-900 tracking-tight">
          Page Not Found
        </h1>
        <p className="text-gray-500 text-lg">
          Oops! It looks like you've ventured off the map. The page you are
          looking for doesn't exist or has been moved.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">


          <Link href="/admin">
            <Button className="p-6" variant="emeraldGreen">
              Back to Dashboard
            </Button>
          </Link>

          <Button
            variant="indigoLight"
            onClick={() => window.history.back()}
            className="p-6"
          >
            Go Back Previous Page
          </Button>
        </div>
      </div>

      {/* Optional Footer Help */}
      <div className="mt-12 text-xs text-gray-400">
        Error Code: 404 | JRV Admin Panel
      </div>
    </div>
  );
}
