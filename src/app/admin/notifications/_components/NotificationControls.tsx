"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal"; // ✅ Import Modal

export default function NotificationControls() {
  const [loading, setLoading] = useState(false);
  const [modalState, setModalState] = useState({
    open: false,
    title: "",
    message: "",
    isError: false,
  });

  const router = useRouter();

  // Helper to open modal easily
  const showModal = (title: string, message: string, isError = false) => {
    setModalState({ open: true, title, message, isError });
  };

  const closeModal = () => {
    setModalState((prev) => ({ ...prev, open: false }));
  };

  const runChecks = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cron/reminders");
      const data = await res.json();
      
      // ✅ Using the correct variable from your API
      const count = data.notifications_sent ?? 0;
      const autoCompleted = data.auto_completed ?? 0;

      showModal(
        "Checks Complete", 
        `✅ Sent ${count} reminder(s).\n✨ Auto-completed ${autoCompleted} expired agreement(s).`
      );
      
      router.refresh();
    } catch (e) {
      console.error(e);
      showModal("Error", "Failed to run checks. Please check the console.", true);
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
        showModal("Test Sent", "🔔 Test message sent successfully! Check your Slack channel.");
      } else {
        showModal("Test Failed", `❌ Error: ${data.error || "Unknown error"}`, true);
      }
    } catch (e) {
      console.error(e);
      showModal("Connection Error", "Could not reach the server.", true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          onClick={sendTest}
          disabled={loading}
          variant="secondary"
          size="sm"
        >
          Send Test Alert
        </Button>

        <Button onClick={runChecks} loading={loading} size="sm">
          {!loading && "▶"} Run Checks Now
        </Button>
      </div>

      {/* ✅ The Popup Modal */}
      <Modal
        open={modalState.open}
        onClose={closeModal}
        title={modalState.title}
        description={modalState.isError ? "An issue occurred" : "Operation Successful"}
        footer={
          <Button onClick={closeModal} className="w-full sm:w-auto">
            Close
          </Button>
        }
      >
        <div className="text-sm text-gray-600 whitespace-pre-line">
          {modalState.message}
        </div>
      </Modal>
    </>
  );
}