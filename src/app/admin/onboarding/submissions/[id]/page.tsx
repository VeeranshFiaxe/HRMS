"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, X, Loader2, Save, Download, FileText } from "lucide-react";
import toast from "react-hot-toast";

export default function SubmissionReview({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submission, setSubmission] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [probationMonths, setProbationMonths] = useState(3);
  const [probationTouched, setProbationTouched] = useState(false);

  useEffect(() => {
    fetchSubmission();
  }, [params.id]);

  const fetchSubmission = async () => {
    try {
      const res = await fetch(`/api/admin/onboarding/submissions/${params.id}`);
      const data = await res.json();
      if (data.success) {
        setSubmission(data.submission);
        setFormData(data.submission.data || {});
      }
    } finally {
      setLoading(false);
    }
  };

  // Prefill probation default (1 for INTERN, 3 otherwise) based on the mapped
  // employmentType field, unless the admin has already changed it manually.
  const mappedEmploymentType = (() => {
    if (!submission) return undefined;
    const field = (submission.form.fields || []).find((f: any) => f.profileMapping === "basicInfo.employmentType");
    return field ? formData[field.id] : undefined;
  })();

  useEffect(() => {
    if (probationTouched || !submission) return;
    setProbationMonths(mappedEmploymentType === "INTERN" ? 1 : 3);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submission, mappedEmploymentType]);

  const handleFieldChange = (key: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [key]: value }));
  };

  const saveEdits = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/onboarding/submissions/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...submission, data: formData }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Changes saved");
      }
    } finally {
      setSaving(false);
    }
  };

  const approveSubmission = async () => {
    if (!confirm("Are you sure you want to approve this candidate? This will create an Employee profile immediately.")) return;
    setSaving(true);
    try {
      // first save edits
      await fetch(`/api/admin/onboarding/submissions/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...submission, data: formData }),
      });

      const res = await fetch(`/api/admin/onboarding/submissions/${params.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ probationMonths }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Approved & Employee Profile created!");
        router.push(`/admin/employees`);
      } else {
        toast.error(data.error || "Approval failed");
      }
    } finally {
      setSaving(false);
    }
  };

  const rejectSubmission = async () => {
    if (!confirm("Reject this submission?")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/onboarding/submissions/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "REJECTED" }),
      });
      if (res.ok) {
        toast.success("Submission rejected");
        router.refresh();
        fetchSubmission();
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-blue-500" /></div>;
  if (!submission) return <div className="p-12 text-center text-slate-500">Submission not found</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/admin/onboarding/${submission.formId}`} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Review Onboarding</h1>
            <p className="text-sm text-slate-500">{submission.candidateName} - {submission.form.title}</p>
          </div>
        </div>
        
        {submission.status === "PENDING" && (
          <div className="flex gap-2">
            <button onClick={saveEdits} disabled={saving} className="btn-secondary">
              <Save size={16} /> Save Edits
            </button>
            <button onClick={rejectSubmission} disabled={saving} className="btn-secondary text-red-600 bg-red-50 hover:bg-red-100 border-red-100">
              <X size={16} /> Reject
            </button>
            <button onClick={approveSubmission} disabled={saving} className="btn-primary bg-emerald-600 hover:bg-emerald-700">
              <Check size={16} /> Approve & Create Employee
            </button>
          </div>
        )}
        {submission.status !== "PENDING" && (
          <div className={`px-4 py-1.5 rounded-lg font-medium text-sm ${submission.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
            {submission.status}
          </div>
        )}
      </div>

      {submission.status === "PENDING" && (
        <div className="card p-4 flex items-center gap-4">
          <div className="flex-1">
            <label className="label">Probation Period (months)</label>
            <p className="text-xs text-slate-400 mb-1">Defaults to 1 for interns, 3 otherwise. Paid leave is unavailable until probation ends.</p>
          </div>
          <input
            type="number"
            min={0}
            className="input w-24"
            value={probationMonths}
            onChange={e => { setProbationTouched(true); setProbationMonths(parseInt(e.target.value) || 0); }}
          />
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="card p-6 space-y-4">
            <h3 className="font-semibold text-slate-900 border-b border-slate-100 pb-2 mb-4">Submitted Details</h3>
            
            {submission.form.fields.map((field: any) => {
              if (field.type === "FILE_UPLOAD") return null; // handled separately
              return (
                <div key={field.id}>
                  <label className="label">{field.label}</label>
                  {field.type === "LONG_TEXT" ? (
                    <textarea 
                      className="input" 
                      value={formData[field.id] || ""} 
                      onChange={e => handleFieldChange(field.id, e.target.value)}
                      disabled={submission.status !== "PENDING"}
                      rows={3}
                    />
                  ) : field.type === "DROPDOWN" ? (
                    <select 
                      className="input" 
                      value={formData[field.id] || ""} 
                      onChange={e => handleFieldChange(field.id, e.target.value)}
                      disabled={submission.status !== "PENDING"}
                    >
                      <option value="">Select option...</option>
                      {field.options?.map((opt: string) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : field.type === "DATE" ? (
                    <input 
                      type="date" 
                      className="input" 
                      value={formData[field.id] || ""} 
                      onChange={e => handleFieldChange(field.id, e.target.value)}
                      disabled={submission.status !== "PENDING"}
                    />
                  ) : (
                    <input 
                      type="text" 
                      className="input" 
                      value={formData[field.id] || ""} 
                      onChange={e => handleFieldChange(field.id, e.target.value)}
                      disabled={submission.status !== "PENDING"}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="col-span-1 space-y-6">
          <div className="card p-5">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <FileText size={18} className="text-slate-500" /> 
              Documents
            </h3>
            {(!submission.documents || submission.documents.length === 0) ? (
              <p className="text-sm text-slate-500">No documents uploaded.</p>
            ) : (
              <div className="space-y-3">
                {submission.documents.map((doc: any) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="truncate pr-2">
                      <p className="text-sm font-medium text-slate-900 truncate">{doc.name}</p>
                      <p className="text-xs text-slate-400">{(doc.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <a href={`/api/documents/${doc.id}`} target="_blank" rel="noreferrer" className="p-1.5 text-blue-600 hover:bg-blue-50 rounded bg-white border border-slate-200">
                      <Download size={14} />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
