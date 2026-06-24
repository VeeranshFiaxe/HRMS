"use client";

import { useState, useEffect } from "react";
import { formatTime } from "@/lib/utils";

export function LiveClock({ timeFormat = "24h", timezone = "Asia/Kolkata" }: { timeFormat?: "12h"|"24h", timezone?: string }) {
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    setTime(new Date());
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!time) return <p className="font-semibold text-slate-700 text-lg">--:--</p>;
  return <p className="font-semibold text-slate-700 text-lg">{formatTime(time, timeFormat, timezone)}</p>;
}
