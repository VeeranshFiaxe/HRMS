"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";

export function LiveClock() {
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    setTime(new Date());
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!time) return <p className="font-semibold text-slate-700 text-lg">--:--</p>;
  return <p className="font-semibold text-slate-700 text-lg">{format(time, "HH:mm")}</p>;
}
