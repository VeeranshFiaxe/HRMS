"use client";

import { useEffect } from "react";

export function CronTrigger() {
  useEffect(() => {
    // Function to trigger the cron endpoint
    const triggerCron = async () => {
      try {
        await fetch("/api/cron/attendance", { method: "GET" });
      } catch (e) {
        console.error("Failed to trigger background cron:", e);
      }
    };

    // Trigger immediately on mount
    triggerCron();

    // Trigger every 1 hour (3600000 ms)
    const interval = setInterval(triggerCron, 3600000);

    return () => clearInterval(interval);
  }, []);

  // Invisible component
  return null;
}
