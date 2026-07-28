"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Plus, GripVertical, Trash2, Link2 } from "lucide-react";
import toast from "react-hot-toast";
import { PROFILE_FIELD_MAPPINGS, getMappingGroups } from "@/lib/profileFieldMappings";

type FieldType = "SHORT_TEXT" | "LONG_TEXT" | "EMAIL" | "PHONE" | "DATE" | "DROPDOWN" | "FILE_UPLOAD" | "ADDRESS";

interface FormField {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  options?: string[];
  profileMapping?: string;
}

export default function NewOnboardingForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<FormField[]>([]);

  const addField = (type: FieldType) => {
    setFields([...fields, {
      id: Math.random().toString(36).substr(2, 9),
      type,
      label: `New ${type.replace(/_/g, " ").toLowerCase()}`,
      required: false,
      options: type === "DROPDOWN" ? ["Option 1", "Option 2"] : undefined
    }]);
  };

  const removeField = (id: string) => {
    setFields(fields.filter(f => f.id !== id));
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const saveForm = async () => {
    if (!title.trim()) {
      toast.error("Form title is required");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/onboarding/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, fields }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Draft saved");
        router.push(`/admin/onboarding/${data.form.id}`);
      } else {
        toast.error(data.error);
      }
    } finally {
      setLoading(false);
    }
  };

  const groups = getMappingGroups();

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/onboarding" className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Create Form</h1>
            <p className="text-sm text-slate-500">Design a new onboarding workflow</p>
          </div>
        </div>
        <button onClick={saveForm} disabled={loading} className="btn-primary">
          <Save size={16} /> Save Draft
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <input 
              type="text" 
              placeholder="Form Title" 
              className="w-full text-2xl font-semibold border-0 border-b border-transparent hover:border-slate-200 focus:border-blue-500 focus:ring-0 px-0 py-2 bg-transparent transition-colors"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
            <textarea 
              placeholder="Description (optional)" 
              className="w-full text-slate-600 border-0 border-b border-transparent hover:border-slate-200 focus:border-blue-500 focus:ring-0 px-0 py-2 bg-transparent transition-colors resize-none mt-2"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="card p-4 flex gap-4 group">
                <div className="mt-2 text-slate-300 cursor-grab hidden sm:block">
                  <GripVertical size={16} />
                </div>
                <div className="flex-1 space-y-3">
                  {/* Label + Type row */}
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                    <input 
                      type="text" 
                      value={field.label} 
                      onChange={e => updateField(field.id, { label: e.target.value })}
                      className="input font-medium flex-1"
                      placeholder="Field label"
                    />
                    <select 
                      value={field.type} 
                      onChange={e => updateField(field.id, { type: e.target.value as FieldType, profileMapping: undefined })}
                      className="input sm:w-40"
                    >
                      <option value="SHORT_TEXT">Short Text</option>
                      <option value="LONG_TEXT">Long Text</option>
                      <option value="EMAIL">Email</option>
                      <option value="PHONE">Phone</option>
                      <option value="DATE">Date</option>
                      <option value="ADDRESS">Address</option>
                      <option value="DROPDOWN">Dropdown</option>
                      <option value="FILE_UPLOAD">File Upload</option>
                    </select>
                  </div>

                  {/* Dropdown options */}
                  {field.type === "DROPDOWN" && (
                    <div>
                      <label className="label text-xs text-slate-500">Options (comma separated)</label>
                      <input 
                        type="text" 
                        value={field.options?.join(", ") || ""} 
                        onChange={e => updateField(field.id, { options: e.target.value.split(",").map(s => s.trim()) })}
                        className="input text-sm"
                      />
                    </div>
                  )}

                  {/* Profile Mapping */}
                  <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                    <Link2 size={14} className="text-slate-400 shrink-0" />
                    <label className="text-xs text-slate-500 font-medium shrink-0">Maps to Profile:</label>
                    <select
                      value={field.profileMapping || ""}
                      onChange={e => updateField(field.id, { profileMapping: e.target.value || undefined })}
                      className="flex-1 text-xs bg-transparent border-0 focus:ring-0 text-slate-700 cursor-pointer py-0 px-0"
                    >
                      <option value="">— Not mapped —</option>
                      {groups.map(group => {
                        const groupMappings = PROFILE_FIELD_MAPPINGS.filter(
                          m => m.group === group && (!m.allowedTypes || m.allowedTypes.includes(field.type))
                        );
                        if (groupMappings.length === 0) return null;
                        return (
                          <optgroup key={group} label={group}>
                            {groupMappings.map(m => (
                              <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                          </optgroup>
                        );
                      })}
                    </select>
                    {field.profileMapping && (
                      <span className="shrink-0 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                        Mapped
                      </span>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={field.required}
                        onChange={e => updateField(field.id, { required: e.target.checked })}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-600">Required</span>
                    </label>
                    <button onClick={() => removeField(field.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            
            {fields.length === 0 && (
              <div className="p-8 border-2 border-dashed border-slate-200 rounded-xl text-center text-slate-500">
                Add fields from the right panel to build your form.
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="card p-4 sticky top-6 space-y-4">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <Plus size={16} /> Add Field
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
              <button onClick={() => addField("SHORT_TEXT")} className="btn-secondary justify-start font-normal">Short Text</button>
              <button onClick={() => addField("LONG_TEXT")} className="btn-secondary justify-start font-normal">Long Text</button>
              <button onClick={() => addField("EMAIL")} className="btn-secondary justify-start font-normal">Email Address</button>
              <button onClick={() => addField("PHONE")} className="btn-secondary justify-start font-normal">Phone Number</button>
              <button onClick={() => addField("DATE")} className="btn-secondary justify-start font-normal">Date</button>
              <button onClick={() => addField("ADDRESS")} className="btn-secondary justify-start font-normal">Address</button>
              <button onClick={() => addField("DROPDOWN")} className="btn-secondary justify-start font-normal">Dropdown List</button>
              <button onClick={() => addField("FILE_UPLOAD")} className="btn-secondary justify-start font-normal">File Upload</button>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Field Mapping</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Each field can be mapped to a destination in the Employee Profile. Mapped values are automatically populated when you approve a candidate.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
