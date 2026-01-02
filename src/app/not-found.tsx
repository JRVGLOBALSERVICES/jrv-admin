"use client";

import Link from "next/link";
import Lottie from "lottie-react";
import { Button } from "@/components/ui/Button"; // Assuming you have this from your other files
import notFoundAnim from "../../public/assets/404.json";

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
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 shadow-lg shadow-indigo-200">
              Back to Dashboard
            </Button>
          </Link>

          <button
            onClick={() => window.history.back()}
            className="text-gray-500 hover:text-gray-800 font-medium text-sm underline underline-offset-4"
          >
            Go Back Previous Page
          </button>
        </div>
      </div>

      {/* Optional Footer Help */}
      <div className="mt-12 text-xs text-gray-400">
        Error Code: 404 | JRV Admin Panel
      </div>
    </div>
  );
}
