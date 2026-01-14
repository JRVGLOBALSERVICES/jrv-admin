"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { BellRing, CheckCircle, AlertCircle, Wrench, ShieldCheck, RefreshCw } from "lucide-react";

export default function NotificationControls() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const [modalState, setModalState] = useState({
    open: false,
    title: "",
    message: "",
    isError: false,
  });

  const showModal = (title: string, message: string, isError = false) => {
    setModalState({ open: true, title, message, isError });
  };

  const closeModal = () => {
    setModalState((prev) => ({ ...prev, open: false }));
  };

  const sendTest = async (type: "maintenance" | "insurance" | "reminders") => {
    setLoading(true);
    setStatus("idle");

    let url = "";
    if (type === "maintenance") url = "/api/cron/maintenance?test=true";
    if (type === "insurance") url = "/api/cron/insurance"; // Runs actual check
    if (type === "reminders") url = "/api/cron/reminders?test=true";

    try {
      const res = await fetch(url);
      const data = await res.json();

      if (res.ok) {
        setStatus("success");
        showModal(`Test ${type} Sent`, "✅ Triggered successfully! Check Slack.");
      } else {
        setStatus("error");
        showModal("Test Failed", `❌ Error: ${data.error}`, true);
      }
    } catch (e) {
      console.error(e);
      setStatus("error");
      showModal("Connection Error", "Could not reach server.", true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-2 pr-3 rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/50">
        {/* Status Indicator */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-gray-50/50 rounded-xl border border-gray-100 shadow-inner h-10 min-w-35 justify-center transition-all">
          {loading ? (
            <>
              <RefreshCw className="w-3 h-3 text-indigo-500 animate-spin" />
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide">
                Running...
              </span>
            </>
          ) : status === "success" ? (
            <>
              <CheckCircle className="w-3 h-3 text-emerald-500" />
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">
                Sent!
              </span>
            </>
          ) : status === "error" ? (
            <>
              <AlertCircle className="w-3 h-3 text-red-500" />
              <span className="text-[10px] font-bold text-red-600 uppercase tracking-wide">
                Failed
              </span>
            </>
          ) : (
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
              System Idle
            </span>
          )}
        </div>

        {/* Test Buttons Group */}
        <div className="flex w-full sm:w-auto gap-2">
          {/* Maintenance Test */}
          <Button
            onClick={() => sendTest("maintenance")}
            disabled={loading}
            className="flex-1 sm:flex-none h-10 bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 rounded-xl shadow-md shadow-amber-200 flex items-center justify-center gap-2"
            title="Test Maintenance Alert"
          >
            <Wrench className="w-4 h-4" />
          </Button>

          {/* Insurance Test */}
          <Button
            onClick={() => sendTest("insurance")}
            disabled={loading}
            className="flex-1 sm:flex-none h-10 bg-pink-600 hover:bg-pink-700 text-white font-bold px-4 rounded-xl shadow-md shadow-pink-200 flex items-center justify-center gap-2"
            title="Test Insurance Alert"
          >
            <ShieldCheck className="w-4 h-4" />
          </Button>

          {/* Reminders Test */}
          <Button
            onClick={() => sendTest("reminders")}
            disabled={loading}
            className="flex-1 sm:flex-none h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 rounded-xl shadow-md shadow-indigo-200 flex items-center justify-center gap-2"
            title="Test Agreement Reminders"
          >
            <BellRing className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Modal
        open={modalState.open}
        onClose={closeModal}
        title={modalState.title}
        description={modalState.isError ? "Error" : "Success"}
        footer={<Button onClick={closeModal}>Close</Button>}
      >
        <div className="text-sm text-gray-600 whitespace-pre-line">
          {modalState.message}
        </div>
      </Modal>
    </>
  );
}
