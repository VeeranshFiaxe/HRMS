// src/components/admin/AnnouncementsAdminClient.tsx
"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Plus, Pencil, Trash2, Calendar, Megaphone, X, Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface Announcement {
  id: string;
  title: string;
  content: string;
  reflectOnCalendar: boolean;
  eventDate: string | null;
  eventName: string | null;
  createdAt: string;
  createdBy: { name: string } | null;
}

interface Props {
  initialAnnouncements: Announcement[];
}

interface FormState {
  title: string;
  content: string;
  reflectOnCalendar: boolean;
  eventDate: string;
  eventName: string;
}

const emptyForm: FormState = {
  title: "",
  content: "",
  reflectOnCalendar: false,
  eventDate: "",
  eventName: "",
};

export function AnnouncementsAdminClient({ initialAnnouncements }: Props) {
  const [announcements, setAnnouncements] = useState<Announcement[]>(initialAnnouncements);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (ann: Announcement) => {
    setEditingId(ann.id);
    setForm({
      title: ann.title,
      content: ann.content,
      reflectOnCalendar: ann.reflectOnCalendar,
      eventDate: ann.eventDate ? ann.eventDate.slice(0, 10) : "",
      eventName: ann.eventName || "",
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error("Title and content are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        content: form.content.trim(),
        reflectOnCalendar: form.reflectOnCalendar,
        eventDate: form.reflectOnCalendar && form.eventDate ? form.eventDate : null,
        eventName: form.reflectOnCalendar && form.eventName ? form.eventName.trim() : null,
      };

      let res: Response;
      if (editingId) {
        res = await fetch(`/api/announcements/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/announcements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) throw new Error("Save failed");
      const saved: Announcement = await res.json();

      if (editingId) {
        setAnnouncements((prev) => prev.map((a) => (a.id === editingId ? saved : a)));
        toast.success("Announcement updated");
      } else {
        setAnnouncements((prev) => [saved, ...prev]);
        toast.success("Announcement posted");
      }
      closeForm();
    } catch {
      toast.error("Failed to save announcement");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this announcement?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/announcements/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      toast.success("Announcement deleted");
    } catch {
      toast.error("Failed to delete announcement");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with action button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Announcements</h1>
          <p className="page-subtitle">Create and manage announcements for all employees.</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus size={16} />
          New Announcement
        </button>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="card p-5 border-blue-200 bg-blue-50/30">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">
              {editingId ? "Edit Announcement" : "New Announcement"}
            </h2>
            <button onClick={closeForm} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500">
              <X size={16} />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="label">Title</label>
              <input
                className="input"
                placeholder="Announcement title..."
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                maxLength={120}
              />
            </div>

            <div>
              <label className="label">Content</label>
              <textarea
                className="input !h-auto resize-none"
                rows={4}
                placeholder="Write the announcement content..."
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              />
            </div>

            {/* Calendar reflection toggle */}
            <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-white">
              <input
                type="checkbox"
                id="reflectOnCalendar"
                checked={form.reflectOnCalendar}
                onChange={(e) => setForm((f) => ({ ...f, reflectOnCalendar: e.target.checked }))}
                className="w-4 h-4 rounded border-slate-300 text-blue-600"
              />
              <label htmlFor="reflectOnCalendar" className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                <Calendar size={15} className="text-blue-500" />
                Reflect on employee calendar
              </label>
            </div>

            {form.reflectOnCalendar && (
              <div className="grid grid-cols-2 gap-3 pl-4 border-l-2 border-blue-200">
                <div>
                  <label className="label">Event Date</label>
                  <input
                    type="date"
                    className="input"
                    value={form.eventDate}
                    onChange={(e) => setForm((f) => ({ ...f, eventDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Event Name (on calendar)</label>
                  <input
                    className="input"
                    placeholder="e.g. Team Offsite"
                    value={form.eventName}
                    onChange={(e) => setForm((f) => ({ ...f, eventName: e.target.value }))}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 pt-1">
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                <Check size={15} />
                {saving ? "Saving..." : editingId ? "Save Changes" : "Post Announcement"}
              </button>
              <button onClick={closeForm} className="btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Announcements list */}
      {announcements.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Megaphone size={22} className="text-blue-500" />
          </div>
          <p className="text-slate-700 font-medium">No announcements yet</p>
          <p className="text-sm text-slate-400 mt-1">Post your first announcement to inform employees.</p>
          <button onClick={openCreate} className="btn-primary mt-4 mx-auto">
            <Plus size={15} />
            Make Announcement
          </button>
        </div>
      ) : (
        <div className="card overflow-hidden divide-y divide-slate-100">
          {announcements.map((ann) => {
            const isExpanded = expandedId === ann.id;
            return (
              <div key={ann.id} className="px-5 py-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Megaphone size={16} className="text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 text-sm">{ann.title}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs text-slate-400">
                            {ann.createdBy?.name ?? "Admin"} · {format(new Date(ann.createdAt), "dd MMM yyyy")}
                          </span>
                          {ann.reflectOnCalendar && (
                            <span className="badge text-blue-600 bg-blue-50 text-xs">
                              <Calendar size={10} className="mr-1" />
                              On Calendar
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : ann.id)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                          title={isExpanded ? "Collapse" : "Expand"}
                        >
                          {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        </button>
                        <button
                          onClick={() => openEdit(ann)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors"
                          title="Edit"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(ann.id)}
                          disabled={deletingId === ann.id}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    {/* Content (expandable) */}
                    <p className={cn(
                      "text-sm text-slate-600 mt-2 leading-relaxed",
                      !isExpanded && "line-clamp-2"
                    )}>
                      {ann.content}
                    </p>

                    {ann.reflectOnCalendar && ann.eventDate && (
                      <p className="text-xs text-blue-600 mt-1.5 flex items-center gap-1">
                        <Calendar size={11} />
                        Calendar event: {ann.eventName || ann.title} on {format(new Date(ann.eventDate), "dd MMM yyyy")}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
