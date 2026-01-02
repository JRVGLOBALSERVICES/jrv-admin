"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { BellRing, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";

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

  const runJob = async () => {
    setLoading(true);
    setStatus("idle");
    try {
      const res = await fetch("/api/cron/reminders?key=manual_override", {
        method: "GET",
      });
      if (!res.ok) throw new Error("Failed");
      setStatus("success");
      setTimeout(() => window.location.reload(), 1500);
    } catch {
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };

  const sendTest = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cron/reminders?test=true");
      const data = await res.json();

      if (res.ok) {
        showModal("Test Sent", "🔔 Test message sent successfully!");
      } else {
        showModal("Test Failed", `❌ Error: ${data.error}`, true);
      }
    } catch (e) {
      console.error(e);
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

        {/* ✅ Wrapper to keep buttons in a row even on mobile */}
        <div className="flex w-full sm:w-auto gap-2">
          <Button
            onClick={runJob}
            loading={loading}
            disabled={loading}
            // @ts-ignore
            sound="click"
            // ✅ Removed 'p-6' and 'w-45'. Removed 'flex-1' from icon.
            className="p-6 flex-1 sm:flex-none h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 rounded-xl shadow-md shadow-indigo-200 flex items-center justify-center gap-2"
          >
            <BellRing className="w-4 h-4" />
            <span className="translate-y-px">Force Run</span>
          </Button>

          <Button
            onClick={sendTest}
            disabled={loading}
            // ✅ Removed 'p-6'. Added 'flex-1' so they share width on mobile.
            className="p-6 flex-1 sm:flex-none h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 rounded-xl shadow-md shadow-indigo-200 flex items-center justify-center gap-2"
          >
            Send Test
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
