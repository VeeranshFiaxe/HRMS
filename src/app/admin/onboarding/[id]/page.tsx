"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Share2, Users, Loader2, Copy, FileText, CheckCircle, XCircle } from "lucide-react";
import toast from "react-hot-toast";

export default function FormDetails({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, [params.id]);

  const fetchData = async () => {
    try {
      const [formRes, subRes] = await Promise.all([
        fetch(`/api/admin/onboarding/forms/${params.id}`),
        fetch(`/api/admin/onboarding/submissions?formId=${params.id}`)
      ]);
      const formData = await formRes.json();
      const subData = await subRes.json();
      
      if (formData.success) setForm(formData.form);
      if (subData.success) setSubmissions(subData.submissions);
    } finally {
      setLoading(false);
    }
  };

  const togglePublish = async () => {
    const newStatus = form.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    try {
      const res = await fetch(`/api/admin/onboarding/forms/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setForm(data.form);
        toast.success(`Form ${newStatus.toLowerCase()}`);
      }
    } catch (e) {
      toast.error("Failed to update status");
    }
  };

  const copyLink = () => {
    const url = `${window.location.origin}/public/onboarding/${form.id}`;
    navigator.clipboard.writeText(url);
    toast.success("Shareable link copied!");
  };

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-blue-500" /></div>;
  if (!form) return <div className="p-12 text-center text-slate-500">Form not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/onboarding" className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-slate-900">{form.title}</h1>
            <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${form.status === 'PUBLISHED' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
              {form.status}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">{form.description}</p>
        </div>
        
        <div className="flex items-center gap-2">
          {form.status === "PUBLISHED" && (
            <button onClick={copyLink} className="btn-secondary text-blue-600 border-blue-100 bg-blue-50 hover:bg-blue-100">
              <Share2 size={16} /> Share Link
            </button>
          )}
          <button onClick={togglePublish} className="btn-primary">
            {form.status === "PUBLISHED" ? "Unpublish" : "Publish Form"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="card p-0 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <Users size={18} className="text-slate-500" /> 
                Submissions ({submissions.length})
              </h3>
            </div>
            
            {submissions.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                No submissions yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {submissions.map(sub => (
                  <div key={sub.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div>
                      <p className="font-medium text-slate-900">{sub.candidateName || "Unknown"}</p>
                      <p className="text-xs text-slate-500">{sub.candidateEmail}</p>
                      <p className="text-xs text-slate-400 mt-1">{new Date(sub.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      {sub.status === "PENDING" && <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full"><Clock size={12} /> Pending</span>}
                      {sub.status === "APPROVED" && <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full"><CheckCircle size={12} /> Approved</span>}
                      {sub.status === "REJECTED" && <span className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full"><XCircle size={12} /> Rejected</span>}
                      
                      <Link href={`/admin/onboarding/submissions/${sub.id}`} className="btn-secondary text-xs">
                        Review
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="md:col-span-1 space-y-6">
          <div className="card p-5">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <FileText size={18} className="text-slate-500" /> 
              Form Fields ({form.fields.length})
            </h3>
            <div className="space-y-3">
              {form.fields.map((f: any, i: number) => (
                <div key={i} className="text-sm">
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-slate-700">{f.label}</span>
                    <span className="text-slate-400 text-xs">({f.type})</span>
                    {f.required && <span className="text-red-500 ml-0.5">*</span>}
                  </div>
                  {f.profileMapping && (
                    <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                      → {f.profileMapping.replace(".", " › ")}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Just adding a Clock icon manually for the pending badge
const Clock = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
);
