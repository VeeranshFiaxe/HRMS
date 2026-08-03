// src/components/admin/EditEmployeeForm.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Save, Loader2, Trash2, Download, Upload, Eye,
  FileText, FilePlus2, X, AlertTriangle, Users, Check
} from "lucide-react";
import toast from "react-hot-toast";

interface EditEmployeeFormProps {
  employee: any;
  schedules: any[];
  salaryRulesList: any[];
}

const EMPLOYMENT_TYPES = ["FULL_TIME", "PART_TIME", "INTERN", "CONTRACT"];
const EMPLOYMENT_LABELS: Record<string, string> = {
  FULL_TIME: "Full Time",
  PART_TIME: "Part Time",
  INTERN: "Intern",
  CONTRACT: "Contract",
};

// ─── Docs Tab ─────────────────────────────────────────────────────────────────

function DocsTab({ employeeId, employmentType }: { employeeId: string; employmentType: string }) {
  const [docs, setDocs] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null); // category being uploaded
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);

  // Upload state
  const [uploadName, setUploadName] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Template creation state
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateTypes, setTemplateTypes] = useState<string[]>([]);
  const [savingTemplate, setSavingTemplate] = useState(false);

  useEffect(() => { fetchAll(); }, [employeeId]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [docsRes, tplRes] = await Promise.all([
        fetch(`/api/employees/${employeeId}/documents`),
        fetch("/api/documents/templates"),
      ]);
      const docsData = await docsRes.json();
      const tplData = await tplRes.json();
      if (docsData.success) setDocs(docsData.documents);
      if (tplData.success) setTemplates(tplData.templates);
    } finally {
      setLoading(false);
    }
  };

  // Templates relevant to this employee's employment type
  const relevantTemplates = templates.filter((t) => {
    const types = (t.employmentTypes as string[]) || [];
    return types.length === 0 || types.includes(employmentType);
  });

  // Which template slots don't have a matching uploaded doc?
  const missingSlots = relevantTemplates.filter(
    (t) => !docs.some((d) => d.docCategory === t.name)
  );

  const handleDelete = async (docId: string, docName: string) => {
    if (!confirm(`Delete "${docName}"?`)) return;
    const res = await fetch(`/api/documents/${docId}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      toast.success("Document deleted");
      setDocs((prev) => prev.filter((d) => d.id !== docId));
    } else {
      toast.error(data.error || "Failed to delete");
    }
  };

  const handleUpload = async (categoryOverride?: string) => {
    const category = categoryOverride || uploadName.trim();
    const file = uploadFile || (fileRef.current?.files?.[0] ?? null);
    if (!file) return toast.error("Please select a file");
    if (!category) return toast.error("Please enter a document name");

    setUploading(category);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("docCategory", category);
      const res = await fetch(`/api/employees/${employeeId}/documents`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.replaced ? "Document replaced" : "Document uploaded");
        setUploadName("");
        setUploadFile(null);
        setShowUploadPanel(false);
        if (fileRef.current) fileRef.current.value = "";
        await fetchAll();
      } else {
        toast.error(data.error || "Upload failed");
      }
    } finally {
      setUploading(null);
    }
  };

  const handleCreateTemplate = async () => {
    if (!templateName.trim()) return toast.error("Enter a document name");
    setSavingTemplate(true);
    try {
      const res = await fetch("/api/documents/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: templateName.trim(), employmentTypes: templateTypes }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Template created for all matching employees");
        setTemplates((prev) => [...prev, data.template]);
        setTemplateName("");
        setTemplateTypes([]);
        setShowTemplateModal(false);
      } else {
        toast.error(data.error || "Failed");
      }
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (tplId: string, tplName: string) => {
    if (!confirm(`Remove "${tplName}" template slot? This won't delete already uploaded files.`)) return;
    const res = await fetch(`/api/documents/templates/${tplId}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      setTemplates((prev) => prev.filter((t) => t.id !== tplId));
      toast.success("Template removed");
    }
  };

  const canPreview = (mimeType: string) =>
    mimeType.startsWith("image/") || mimeType === "application/pdf";

  if (loading) return (
    <div className="card p-12 flex justify-center">
      <Loader2 className="animate-spin text-blue-500" size={24} />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-slate-900">Employee Documents</h3>
          <p className="text-sm text-slate-500 mt-0.5">
            Upload, preview, and manage official documents.
          </p>
        </div>
        <button
          onClick={() => setShowUploadPanel(!showUploadPanel)}
          className="btn-primary"
        >
          <FilePlus2 size={16} /> Upload Document
        </button>
      </div>

      {/* Upload Panel */}
      {showUploadPanel && (
        <div className="card p-5 border-blue-100 bg-blue-50/40 space-y-4">
          <h4 className="font-medium text-slate-900 text-sm">Upload New Document</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label text-xs">Document Name / Category</label>
              <input
                className="input"
                placeholder="e.g. Resume, Aadhaar, PAN..."
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
              />
            </div>
            <div>
              <label className="label text-xs">File</label>
              <input
                ref={fileRef}
                type="file"
                onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              />
            </div>
          </div>
          {uploadFile && (
            <p className="text-xs text-slate-500">{uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)</p>
          )}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={() => handleUpload()}
              disabled={!!uploading}
              className="btn-primary"
            >
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              Upload
            </button>
            <button
              onClick={() => {
                setShowTemplateModal(true);
                setTemplateName(uploadName);
                setTemplateTypes([employmentType]);
              }}
              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
            >
              <Users size={14} /> Create for all employees
            </button>
            <button
              onClick={() => { setShowUploadPanel(false); setUploadName(""); setUploadFile(null); }}
              className="text-sm text-slate-400 hover:text-slate-600 ml-auto"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Missing template slots */}
      {missingSlots.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Required Documents (not yet uploaded)
          </h4>
          {missingSlots.map((slot) => (
            <TemplateSlot
              key={slot.id}
              slot={slot}
              employeeId={employeeId}
              onUploaded={fetchAll}
              onDeleteTemplate={handleDeleteTemplate}
            />
          ))}
        </div>
      )}

      {/* Uploaded documents */}
      {docs.length > 0 ? (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Uploaded ({docs.length})
          </h4>
          <div className="space-y-2">
            {docs.map((doc) => (
              <DocRow
                key={doc.id}
                doc={doc}
                canPreview={canPreview(doc.mimeType)}
                onPreview={() => setPreviewDoc(doc)}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      ) : (
        missingSlots.length === 0 && (
          <div className="card p-8 text-center text-slate-500 text-sm">
            No documents uploaded yet.
          </div>
        )
      )}

      {/* Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
              <p className="font-medium text-slate-900 truncate">{previewDoc.name}</p>
              <div className="flex items-center gap-2">
                <a
                  href={`/api/documents/${previewDoc.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary text-xs"
                >
                  <Download size={14} /> Download
                </a>
                <button onClick={() => setPreviewDoc(null)} className="p-1.5 rounded-lg hover:bg-slate-100">
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {previewDoc.mimeType.startsWith("image/") ? (
                <img
                  src={`/api/documents/${previewDoc.id}?preview=true`}
                  alt={previewDoc.name}
                  className="max-w-full mx-auto rounded"
                />
              ) : previewDoc.mimeType === "application/pdf" ? (
                <iframe
                  src={`/api/documents/${previewDoc.id}?preview=true`}
                  className="w-full h-[70vh] rounded"
                  title={previewDoc.name}
                />
              ) : (
                <div className="flex items-center justify-center h-48 text-slate-400">
                  Preview not available for this file type.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
            <div>
              <h3 className="font-semibold text-slate-900">Create for All Employees</h3>
              <p className="text-sm text-slate-500 mt-1">
                This document slot will appear as a required upload for all matching employees.
              </p>
            </div>
            <div>
              <label className="label">Document Name</label>
              <input
                className="input"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g. PAN Card, Aadhaar..."
              />
            </div>
            <div>
              <label className="label">Apply to Employment Types</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {EMPLOYMENT_TYPES.map((et) => (
                  <button
                    key={et}
                    onClick={() =>
                      setTemplateTypes((prev) =>
                        prev.includes(et) ? prev.filter((t) => t !== et) : [...prev, et]
                      )
                    }
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      templateTypes.includes(et)
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
                    }`}
                  >
                    {templateTypes.includes(et) && <Check size={12} className="inline mr-1" />}
                    {EMPLOYMENT_LABELS[et]}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Leave all unselected to apply to all employee types.
              </p>
            </div>
            <div className="flex gap-3 pt-2 border-t border-slate-100">
              <button
                onClick={handleCreateTemplate}
                disabled={savingTemplate}
                className="btn-primary flex-1 justify-center"
              >
                {savingTemplate ? <Loader2 size={16} className="animate-spin" /> : <Users size={16} />}
                Create Template
              </button>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DocRow({
  doc,
  canPreview,
  onPreview,
  onDelete,
}: {
  doc: any;
  canPreview: boolean;
  onPreview: () => void;
  onDelete: (id: string, name: string) => void;
}) {
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl hover:border-slate-200 transition-colors group">
      <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
        <FileText size={16} className="text-slate-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 truncate">{doc.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {doc.docCategory && (
            <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium">
              {doc.docCategory}
            </span>
          )}
          <span className="text-xs text-slate-400">{formatSize(doc.size)}</span>
          <span className="text-xs text-slate-300">·</span>
          <span className="text-xs text-slate-400">
            {new Date(doc.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {canPreview && (
          <button
            onClick={onPreview}
            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            title="Preview"
          >
            <Eye size={15} />
          </button>
        )}
        <a
          href={`/api/documents/${doc.id}`}
          target="_blank"
          rel="noreferrer"
          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
          title="Download"
        >
          <Download size={15} />
        </a>
        <button
          onClick={() => onDelete(doc.id, doc.name)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          title="Delete"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}

function TemplateSlot({
  slot,
  employeeId,
  onUploaded,
  onDeleteTemplate,
}: {
  slot: any;
  employeeId: string;
  onUploaded: () => void;
  onDeleteTemplate: (id: string, name: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("docCategory", slot.name);
      const res = await fetch(`/api/employees/${employeeId}/documents`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`${slot.name} uploaded`);
        onUploaded();
      } else {
        toast.error(data.error || "Upload failed");
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
      <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
        <FileText size={16} className="text-amber-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800">{slot.name}</p>
        <p className="text-xs text-amber-600 mt-0.5">Not yet uploaded</p>
      </div>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:border-blue-300 cursor-pointer transition-colors">
          <Upload size={13} />
          {file ? file.name.slice(0, 20) + "..." : "Choose file"}
          <input
            ref={fileRef}
            type="file"
            className="sr-only"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        {file && (
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="btn-primary text-xs py-1.5"
          >
            {uploading ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            Upload
          </button>
        )}
        <button
          onClick={() => onDeleteTemplate(slot.id, slot.name)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50"
          title="Remove this template slot"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function EditEmployeeForm({ employee, schedules, salaryRulesList }: EditEmployeeFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"profile" | "schedule" | "salary" | "docs">("profile");
  const [salaryBreakup, setSalaryBreakup] = useState<any>(null);
  const [breakupLoading, setBreakupLoading] = useState(false);

  // Profile form
  const [profile, setProfile] = useState({
    name: employee.name || "",
    email: employee.email || "",
    personalEmail: employee.personalEmail || "",
    designation: employee.designation || "",
    department: employee.department || "",
    phone: employee.phone || "",
    emergencyContactName: employee.emergencyContactName || "",
    emergencyContactNumber: employee.emergencyContactNumber || "",
    dateOfBirth: employee.dateOfBirth ? new Date(employee.dateOfBirth).toISOString().slice(0, 10) : "",
    joiningDate: employee.joiningDate ? new Date(employee.joiningDate).toISOString().slice(0, 10) : "",
    exitDate: employee.exitDate ? new Date(employee.exitDate).toISOString().slice(0, 10) : "",
    role: employee.role || "EMPLOYEE",
    employmentType: employee.employmentType || "FULL_TIME",
    isActive: employee.isActive,
    probationMonths: employee.probationMonths != null ? String(employee.probationMonths) : "",
  });

  // Schedule form
  const defaultSchedule = schedules.find(s => s.isDefault) || schedules[0] || {};
  const sched = employee.customSchedule || schedules.find((s: any) => s.id === employee.companyScheduleId) || defaultSchedule;
  const [schedule, setSchedule] = useState({
    assignedId: employee.companyScheduleId || "default",
    enabled: !!employee.customSchedule,
    startTime: employee.customSchedule?.startTime || "09:00",
    endTime: employee.customSchedule?.endTime || "18:00",
    overrideLateAfter: employee.customSchedule?.overrideLateAfter ?? false,
    lateAfter: sched.lateAfter || "11:15",
    halfDayAfter: sched.halfDayAfter || "14:00",
    monday: sched.monday ?? true,
    tuesday: sched.tuesday ?? true,
    wednesday: sched.wednesday ?? true,
    thursday: sched.thursday ?? true,
    friday: sched.friday ?? true,
    saturday: sched.saturday ?? false,
    sunday: sched.sunday ?? false,
    note: employee.customSchedule?.note || "",
  });

  // Salary form
  const defaultRule = salaryRulesList.find(r => r.isDefault) || salaryRulesList[0] || {};
  const rule = salaryRulesList.find((r: any) => r.id === employee.salaryRulesId) || defaultRule;
  const so = employee.salaryRuleOverride || {};
  const [salary, setSalary] = useState({
    assignedId: employee.salaryRulesId || "default",
    enabled: !!employee.salaryRuleOverride,
    baseSalary: employee.salaryRuleOverride?.baseSalary?.toString() || "",
    halfDayDeductionFactor: so.halfDayDeductionFactor?.toString() || (rule?.halfDayDeductionFactor?.toString() || "0.5"),
    lateDeductionFactor: so.lateDeductionFactor?.toString() || (rule?.lateDeductionFactor?.toString() || "0.33"),
    absentDeductionFactor: so.absentDeductionFactor?.toString() || (rule?.absentDeductionFactor?.toString() || "1"),
    paidLeaveDaysPerMonth: so.paidLeaveDaysPerMonth?.toString() || (rule?.paidLeaveDaysPerMonth?.toString() || "1"),
    note: so.note || "",
  });

  const saveProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/employees/${employee.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...profile,
          dateOfBirth: profile.dateOfBirth || null,
          joiningDate: profile.joiningDate || null,
          exitDate: profile.exitDate || null,
          probationMonths: profile.probationMonths.trim() === "" ? null : parseInt(profile.probationMonths),
          companyScheduleId: schedule.assignedId === "default" ? null : schedule.assignedId,
          salaryRulesId: salary.assignedId === "default" ? null : salary.assignedId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Profile updated");
        router.refresh();
      } else {
        toast.error(data.error || "Failed to update");
      }
    } finally {
      setLoading(false);
    }
  };

  const setEmployeeStatus = async (active: boolean) => {
    if (!confirm(active ? `Reactivate ${employee.name}?` : `Deactivate ${employee.name}?`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/employees/${employee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: active }),
      });
      if (res.ok) {
        toast.success(active ? "Employee reactivated" : "Employee deactivated");
        setProfile(p => ({ ...p, isActive: active }));
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  const hardDeleteEmployee = async () => {
    if (!confirm(`Permanently delete ${employee.name}? This action cannot be undone.`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/employees/${employee.id}/hard-delete`, { method: "DELETE" });
      if (res.ok) {
        toast.success(`Deleted ${employee.name}`);
        router.push("/admin/employees");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchSalaryBreakup = async () => {
    setBreakupLoading(true);
    try {
      const res = await fetch(`/api/employees/${employee.id}/salary`);
      const data = await res.json();
      if (data.success) setSalaryBreakup(data.data);
      else toast.error(data.error || "Failed to load salary breakup");
    } finally {
      setBreakupLoading(false);
    }
  };

  const downloadPDF = async () => {
    if (!salaryBreakup) return;
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF();
    const dateStr = new Date().toLocaleString("default", { month: "long", year: "numeric" });
    doc.setFontSize(20);
    doc.text("Salary Breakdown", 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Employee: ${employee.name}`, 14, 32);
    doc.text(`Department: ${employee.department || "N/A"}`, 14, 38);
    doc.text(`Month: ${dateStr}`, 14, 44);
    autoTable(doc, {
      startY: 52,
      head: [["Description", "Details", "Amount"]],
      body: [
        ["Base Salary", "", `Rs ${(salaryBreakup.baseSalary ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
        ["Total Working Days", `${salaryBreakup.totalWorkingDays ?? 0} days`, ""],
        ["Per Day Rate", "", `Rs ${(salaryBreakup.perDayRate ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
        ["Days Present (Full)", `${salaryBreakup.presentFullDays ?? salaryBreakup.presentFull ?? 0} days`, ""],
        ["Days Half", `${salaryBreakup.halfDays ?? 0} days`, ""],
        ["Days Late", `${salaryBreakup.lateDays ?? 0} days`, ""],
        ["Days Absent", `${salaryBreakup.absentDays ?? 0} days`, ""],
        ["Late Penalty", `-${salaryBreakup.latePenalty ?? 0} days`, ""],
        ["Paid Leaves Utilized", `${salaryBreakup.paidLeavesUtilized ?? salaryBreakup.paidLeaveDays ?? 0} / ${salaryBreakup.paidLeavesAllowed ?? 1}`, ""],
        ["Effective Payable Days", `${salaryBreakup.totalPaidDays ?? 0} days`, ""],
      ],
      foot: [["Final Calculated Salary", "", `Rs ${(salaryBreakup.netEarned ?? salaryBreakup.netSalary ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`]],
      theme: "grid",
      headStyles: { fillColor: [59, 130, 246] },
      footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: "bold" },
    });
    doc.save(`${employee.name.replace(/\s+/g, "_")}_Salary_${dateStr.replace(/\s+/g, "_")}.pdf`);
  };

  if (tab === "salary" && !salaryBreakup && !breakupLoading) {
    fetchSalaryBreakup();
  }

  const saveSchedule = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/employees/${employee.id}/schedule`, {
        method: schedule.enabled ? "PUT" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: schedule.enabled ? JSON.stringify(schedule) : undefined,
      });
      const data = await res.json();
      if (data.success) toast.success(schedule.enabled ? "Custom schedule saved" : "Reverted to company schedule");
      else toast.error(data.error || "Failed");
    } finally {
      setLoading(false);
    }
  };

  const saveSalary = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/employees/${employee.id}/salary`, {
        method: salary.enabled ? "PUT" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: salary.enabled ? JSON.stringify({
          baseSalary: parseFloat(salary.baseSalary) || null,
          halfDayDeductionFactor: parseFloat(salary.halfDayDeductionFactor),
          lateDeductionFactor: parseFloat(salary.lateDeductionFactor),
          absentDeductionFactor: parseFloat(salary.absentDeductionFactor),
          paidLeaveDaysPerMonth: parseInt(salary.paidLeaveDaysPerMonth),
          note: salary.note,
        }) : undefined,
      });
      const data = await res.json();
      if (data.success) toast.success(salary.enabled ? "Salary override saved" : "Reverted to default");
      else toast.error(data.error || "Failed");
    } finally {
      setLoading(false);
    }
  };

  const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="page-header">
        <Link href="/admin/employees" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-3">
          <ArrowLeft size={14} />
          Back to employees
        </Link>
        <h1 className="page-title">{employee.name}</h1>
        <p className="page-subtitle">{employee.email} · {employee.employmentType.replace("_", " ")}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {(["profile", "schedule", "salary", "docs"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
              tab === t ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Profile tab ── */}
      {tab === "profile" && (
        <div className="card p-6 space-y-5">
          {/* Name + Role */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Full Name</label>
              <input className="input" value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Role</label>
              <select className="input" value={profile.role} onChange={e => setProfile(p => ({ ...p, role: e.target.value }))}>
                <option value="EMPLOYEE">Employee</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
          </div>

          {/* Work email (editable, with warning) */}
          <div>
            <label className="label flex items-center gap-2">
              Work / Login Email
              <span className="text-xs text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full font-normal flex items-center gap-1">
                <AlertTriangle size={11} /> Changes login credentials
              </span>
            </label>
            <input
              type="email"
              className="input border-amber-200 focus:border-amber-400 focus:ring-amber-300"
              value={profile.email}
              onChange={e => setProfile(p => ({ ...p, email: e.target.value }))}
              placeholder="work@company.com"
            />
            <p className="text-xs text-slate-400 mt-1">This is the email used to log in to the HRMS. Changing it will require the employee to use the new address.</p>
          </div>

          {/* Personal email */}
          <div>
            <label className="label">Personal Email (optional)</label>
            <input
              type="email"
              className="input"
              value={profile.personalEmail}
              onChange={e => setProfile(p => ({ ...p, personalEmail: e.target.value }))}
              placeholder="personal@gmail.com"
            />
          </div>

          {/* Department + Designation */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Department</label>
              <input className="input" value={profile.department} onChange={e => setProfile(p => ({ ...p, department: e.target.value }))} />
            </div>
            <div>
              <label className="label">Designation</label>
              <input className="input" value={profile.designation} onChange={e => setProfile(p => ({ ...p, designation: e.target.value }))} />
            </div>
          </div>

          {/* Employment Type + Phone */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Employment Type</label>
              <select className="input" value={profile.employmentType} onChange={e => setProfile(p => ({ ...p, employmentType: e.target.value }))}>
                <option value="FULL_TIME">Full Time</option>
                <option value="PART_TIME">Part Time</option>
                <option value="INTERN">Intern</option>
                <option value="CONTRACT">Contract</option>
              </select>
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} />
            </div>
          </div>

          {/* DOB + Joining Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Date of Birth</label>
              <input type="date" className="input" value={profile.dateOfBirth} onChange={e => setProfile(p => ({ ...p, dateOfBirth: e.target.value }))} />
            </div>
            <div>
              <label className="label">Date of Joining</label>
              <input type="date" className="input" value={profile.joiningDate} onChange={e => setProfile(p => ({ ...p, joiningDate: e.target.value }))} />
            </div>
          </div>

          {/* Probation Period */}
          <div>
            <label className="label">Probation Period (months)</label>
            <input
              type="number"
              min={0}
              className="input"
              placeholder={profile.employmentType === "INTERN" ? "Default: 1" : "Default: 3"}
              value={profile.probationMonths}
              onChange={e => setProfile(p => ({ ...p, probationMonths: e.target.value }))}
            />
            <p className="text-xs text-slate-400 mt-1">Leave blank to use the default (1 month for interns, 3 months otherwise). Paid leave is unavailable until probation ends.</p>
          </div>

          {/* Exit Date */}
          <div>
            <label className="label">Exit Date (optional — for offboarding)</label>
            <input type="date" className="input" value={profile.exitDate} onChange={e => setProfile(p => ({ ...p, exitDate: e.target.value }))} />
          </div>

          {/* Emergency Contact */}
          <div className="border-t border-slate-100 pt-5">
            <h4 className="text-sm font-semibold text-slate-700 mb-3">Emergency Contact</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Contact Name</label>
                <input className="input" placeholder="e.g. Jane Doe" value={profile.emergencyContactName} onChange={e => setProfile(p => ({ ...p, emergencyContactName: e.target.value }))} />
              </div>
              <div>
                <label className="label">Contact Number</label>
                <input className="input" placeholder="e.g. +91 98765 43210" value={profile.emergencyContactNumber} onChange={e => setProfile(p => ({ ...p, emergencyContactNumber: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 border-t border-slate-100 pt-4">
            <button onClick={saveProfile} disabled={loading} className="btn-primary flex-1">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save Profile
            </button>
            {profile.isActive ? (
              <button onClick={() => setEmployeeStatus(false)} disabled={loading} className="px-4 py-2 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-lg text-sm font-medium transition-colors">
                Deactivate
              </button>
            ) : (
              <button onClick={() => setEmployeeStatus(true)} disabled={loading} className="px-4 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-sm font-medium transition-colors">
                Reactivate
              </button>
            )}
            <button onClick={hardDeleteEmployee} disabled={loading} className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-1.5">
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        </div>
      )}

      {/* ── Schedule tab ── */}
      {tab === "schedule" && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-slate-900">Assigned Schedule</h3>
              <p className="text-sm text-slate-500">Choose a company schedule, or create a custom override.</p>
            </div>
          </div>
          <div>
            <label className="label">Company Schedule</label>
            <select className="input mb-4" value={schedule.assignedId} onChange={e => setSchedule(s => ({ ...s, assignedId: e.target.value }))} disabled={schedule.enabled}>
              <option value="default">-- Global Default Schedule --</option>
              {schedules.map((s: any) => (
                <option key={s.id} value={s.id}>{s.name} {s.isDefault ? "(Default)" : ""}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <div>
              <h4 className="font-medium text-slate-900 text-sm">Custom Override</h4>
              <p className="text-xs text-slate-500">Enable this to ignore assigned schedule and specify exact hours.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={schedule.enabled} onChange={e => setSchedule(s => ({ ...s, enabled: e.target.checked }))} className="sr-only peer" />
              <div className="w-10 h-6 bg-slate-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
            </label>
          </div>
          {schedule.enabled && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Start Time</label>
                  <input type="time" className="input" value={schedule.startTime} onChange={e => setSchedule(s => ({ ...s, startTime: e.target.value }))} />
                </div>
                <div>
                  <label className="label">End Time</label>
                  <input type="time" className="input" value={schedule.endTime} onChange={e => setSchedule(s => ({ ...s, endTime: e.target.value }))} />
                </div>
                <div>
                  <label className="label flex items-center justify-between">
                    Late After
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input type="checkbox" checked={schedule.overrideLateAfter} onChange={e => setSchedule(s => ({ ...s, overrideLateAfter: e.target.checked }))} className="w-3 h-3 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                      <span className="text-[10px] text-slate-500">Override</span>
                    </label>
                  </label>
                  {schedule.overrideLateAfter ? (
                    <input type="time" className="input" value={schedule.lateAfter} onChange={e => setSchedule(s => ({ ...s, lateAfter: e.target.value }))} />
                  ) : (
                    <div className="input bg-slate-50 text-slate-400 text-xs flex items-center cursor-not-allowed truncate">Auto-calculated</div>
                  )}
                </div>
                <div>
                  <label className="label">Half Day After</label>
                  <input type="time" className="input" value={schedule.halfDayAfter} onChange={e => setSchedule(s => ({ ...s, halfDayAfter: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">Working Days</label>
                <div className="flex flex-wrap gap-2">
                  {days.map(day => (
                    <label key={day} className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={(schedule as any)[day]} onChange={e => setSchedule(s => ({ ...s, [day]: e.target.checked }))} className="w-4 h-4 rounded border-slate-300 text-blue-600" />
                      <span className="text-sm text-slate-700 capitalize">{day.slice(0, 3)}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Note (optional)</label>
                <input className="input" placeholder="e.g. Intern schedule" value={schedule.note} onChange={e => setSchedule(s => ({ ...s, note: e.target.value }))} />
              </div>
            </>
          )}
          <button onClick={saveSchedule} disabled={loading} className="btn-primary w-full justify-center">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {schedule.enabled ? "Save Custom Override" : "Save Selected Schedule Assignment"}
          </button>
        </div>
      )}

      {/* ── Salary tab ── */}
      {tab === "salary" && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-slate-900">Assigned Salary Rule</h3>
              <p className="text-sm text-slate-500">Choose a salary formula, or create a custom override.</p>
            </div>
          </div>
          <div>
            <label className="label">Salary Rule</label>
            <select className="input mb-4" value={salary.assignedId} onChange={e => setSalary(s => ({ ...s, assignedId: e.target.value }))} disabled={salary.enabled}>
              <option value="default">-- Global Default Salary Rule --</option>
              {salaryRulesList.map((r: any) => (
                <option key={r.id} value={r.id}>{r.name} {r.isDefault ? "(Default)" : ""} - ₹{r.baseSalary}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <div>
              <h4 className="font-medium text-slate-900 text-sm">Custom Override</h4>
              <p className="text-xs text-slate-500">Enable this to ignore assigned rules and define custom pay.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={salary.enabled} onChange={e => setSalary(s => ({ ...s, enabled: e.target.checked }))} className="sr-only peer" />
              <div className="w-10 h-6 bg-slate-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
            </label>
          </div>
          {salary.enabled && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Base Salary (₹/month)</label>
                  <input type="number" className="input" placeholder="e.g. 50000" value={salary.baseSalary} onChange={e => setSalary(s => ({ ...s, baseSalary: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Paid Leave Days/Month</label>
                  <input type="number" className="input" value={salary.paidLeaveDaysPerMonth} onChange={e => setSalary(s => ({ ...s, paidLeaveDaysPerMonth: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Half-Day Deduction Factor</label>
                  <input type="number" step="0.1" className="input" value={salary.halfDayDeductionFactor} onChange={e => setSalary(s => ({ ...s, halfDayDeductionFactor: e.target.value }))} />
                  <p className="text-xs text-slate-400 mt-1">0.5 = deduct half day's pay</p>
                </div>
                <div>
                  <label className="label">Late Deduction Factor</label>
                  <input type="number" step="0.05" className="input" value={salary.lateDeductionFactor} onChange={e => setSalary(s => ({ ...s, lateDeductionFactor: e.target.value }))} />
                  <p className="text-xs text-slate-400 mt-1">0.33 = deduct 0.33 day's pay per late day</p>
                </div>
                <div>
                  <label className="label">Absent Deduction Factor</label>
                  <input type="number" step="0.1" className="input" value={salary.absentDeductionFactor} onChange={e => setSalary(s => ({ ...s, absentDeductionFactor: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">Note</label>
                <input className="input" placeholder="Reason for override..." value={salary.note} onChange={e => setSalary(s => ({ ...s, note: e.target.value }))} />
              </div>
            </>
          )}
          <button onClick={saveSalary} disabled={loading} className="btn-primary w-full justify-center">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {salary.enabled ? "Save Custom Override" : "Save Selected Rule Assignment"}
          </button>

          {/* Salary Breakup */}
          <div className="mt-8 border-t border-slate-100 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-slate-900">Current Month Salary Breakup</h3>
              <div className="flex items-center gap-3">
                {salaryBreakup && (
                  <button onClick={downloadPDF} className="text-sm flex items-center gap-1 text-slate-600 hover:text-blue-600 font-medium">
                    <Download size={14} /> Download PDF
                  </button>
                )}
                <button onClick={fetchSalaryBreakup} className="text-sm text-blue-600 hover:text-blue-700 font-medium">Refresh</button>
              </div>
            </div>
            {breakupLoading ? (
              <div className="py-8 text-center text-slate-400 flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> Loading breakup...</div>
            ) : salaryBreakup ? (
              <div className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left">
                  <tbody className="divide-y divide-slate-200">
                    {[
                      ["Base Salary", `₹${(salaryBreakup.baseSalary ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, "bg-white"],
                      ["Total Working Days", salaryBreakup.totalWorkingDays ?? 0, ""],
                      ["Per Day Rate", `₹${(salaryBreakup.perDayRate ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, "bg-white"],
                      ["Days Present (Full)", salaryBreakup.presentFullDays ?? salaryBreakup.presentFull ?? 0, ""],
                      ["Days Half", salaryBreakup.halfDays ?? 0, "bg-white"],
                      ["Days Late", salaryBreakup.lateDays ?? 0, ""],
                      ["Late Penalty (Days)", `-${salaryBreakup.latePenalty ?? 0}`, "bg-white"],
                      ["Days Absent", salaryBreakup.absentDays ?? 0, ""],
                      ["Effective Days Worked", salaryBreakup.daysWorked ?? salaryBreakup.workedDays ?? 0, "bg-white"],
                      ["Paid Leaves Utilized", `${salaryBreakup.paidLeavesUtilized ?? salaryBreakup.paidLeaveDays ?? 0} / ${salaryBreakup.paidLeavesAllowed ?? 1}`, ""],
                    ].map(([label, val, bg]) => (
                      <tr key={label as string} className={bg as string}>
                        <td className="px-4 py-3 text-slate-600">{label}</td>
                        <td className="px-4 py-3 text-right font-mono">{val}</td>
                      </tr>
                    ))}
                    <tr className="bg-white">
                      <td className="px-4 py-3 font-semibold text-slate-900">Total Payable Days</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-600">{salaryBreakup.totalPaidDays ?? 0}</td>
                    </tr>
                    <tr className="bg-slate-100">
                      <td className="px-4 py-4 font-bold text-slate-900 text-base">Net Earned So Far</td>
                      <td className="px-4 py-4 text-right font-mono font-bold text-emerald-700 text-lg">₹{(salaryBreakup.netEarned ?? salaryBreakup.netSalary ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400">No salary rules configured.</div>
            )}
          </div>
        </div>
      )}

      {/* ── Docs tab ── */}
      {tab === "docs" && (
        <DocsTab employeeId={employee.id} employmentType={employee.employmentType} />
      )}
    </div>
  );
}
