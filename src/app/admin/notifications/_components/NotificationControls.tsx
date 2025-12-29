"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button"; // ✅ Import

export default function NotificationControls() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const runChecks = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cron/reminders");
      const data = await res.json();
      alert(`Checks Complete!\nMessages Sent: ${data.sent}`);
      router.refresh();
    } catch (e) {
      alert("Error running checks");
    } finally {
      setLoading(false);
    }
  };

  const sendTest = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cron/reminders?test=true");
      if (res.ok) alert("Test message sent to Slack!");
      else alert("Failed to send test.");
    } catch (e) {
      alert("Error sending test");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={sendTest}
        disabled={loading}
        variant="secondary"
        size="sm"
        sound="on"
      >
        Send Test Alert
      </Button>

      <Button onClick={runChecks} loading={loading} size="sm">
        {!loading && "▶"} Run Checks Now
      </Button>
    </div>
  );
}
