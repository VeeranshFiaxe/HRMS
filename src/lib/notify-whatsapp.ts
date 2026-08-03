// src/lib/notify-whatsapp.ts
// Fire-and-forget WhatsApp check-in/out notification sent directly to
// Evolution API — no external workflow tool involved.
// Never throws and never blocks/affects the attendance API response.

import { prisma } from "@/lib/prisma";

function renderTemplate(template: string, name: string, time: string) {
  return template.replace(/\{name\}/g, name).replace(/\{time\}/g, time);
}

export async function notifyAttendanceEvent(params: {
  name: string;
  type: "CHECK_IN" | "CHECK_OUT";
  time: Date;
}) {
  const baseUrl = process.env.EVOLUTION_API_URL;
  const apiKey = process.env.EVOLUTION_API_KEY;
  const instance = process.env.EVOLUTION_INSTANCE_NAME;
  const groupJid = process.env.EVOLUTION_GROUP_JID;
  if (!baseUrl || !apiKey || !instance || !groupJid) return;

  try {
    const settings = await prisma.officeSettings.findFirst({
      select: {
        timezone: true,
        whatsappNotifyEnabled: true,
        whatsappCheckInTemplate: true,
        whatsappCheckOutTemplate: true,
      },
    });
    if (!settings?.whatsappNotifyEnabled) return;

    const time = params.time.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: settings.timezone || "Asia/Kolkata",
    });

    const template =
      params.type === "CHECK_IN" ? settings.whatsappCheckInTemplate : settings.whatsappCheckOutTemplate;
    const message = renderTemplate(template, params.name, time);

    const url = `${baseUrl.replace(/\/$/, "")}/message/sendText/${instance}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: apiKey },
        body: JSON.stringify({ number: groupJid, text: message }),
        signal: controller.signal,
      });
      if (!res.ok) {
        console.error("[whatsapp-notify] Evolution API returned", res.status, await res.text().catch(() => ""));
      }
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (err) {
    console.error("[whatsapp-notify] failed", err);
    // swallow — never block or fail attendance write on notification failure
  }
}
