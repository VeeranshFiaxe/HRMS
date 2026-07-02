"use client";

import { Megaphone, Calendar } from "lucide-react";
import { format } from "date-fns";

interface Announcement {
  id: string;
  title: string;
  content: string;
  eventDate: string | null;
  eventName: string | null;
  createdBy: { name: string } | null;
}

export function PinnedAnnouncements({ announcements }: { announcements: Announcement[] }) {
  if (!announcements || announcements.length === 0) return null;

  return (
    <div className="space-y-3">
      {announcements.map((ann) => (
        <div 
          key={ann.id} 
          className="bg-blue-50 border-l-4 border-blue-500 rounded-r-xl p-4 shadow-sm relative overflow-hidden group"
        >
          {/* Subtle animated background gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-100/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          
          <div className="relative flex gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
              <Megaphone size={16} className="text-blue-600 animate-pulse" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900">{ann.title}</h3>
              <p className="text-sm text-blue-800 mt-1 whitespace-pre-wrap leading-relaxed">{ann.content}</p>
              
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                <span className="text-xs text-blue-600/80 font-medium bg-blue-100/50 px-2 py-0.5 rounded-full">
                  {ann.createdBy?.name || "Admin"}
                </span>
                
                {ann.eventDate && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white rounded-full text-xs font-semibold text-blue-700 shadow-sm border border-blue-100">
                    <Calendar size={12} />
                    {ann.eventName || ann.title}: {format(new Date(ann.eventDate), "MMM do")}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
