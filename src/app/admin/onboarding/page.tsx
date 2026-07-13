"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Settings, Share2, Users, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export default function OnboardingDashboard() {
  const [forms, setForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    try {
      const res = await fetch("/api/admin/onboarding/forms");
      const data = await res.json();
      if (data.success) {
        setForms(data.forms);
      }
    } finally {
      setLoading(false);
    }
  };

  const copyLink = (id: string) => {
    const url = `${window.location.origin}/public/onboarding/${id}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  };

  return (
    <div className="space-y-6">
      <div className="page-header flex justify-between items-start">
        <div>
          <h1 className="page-title">Onboarding</h1>
          <p className="page-subtitle">Manage candidate onboarding forms and submissions.</p>
        </div>
        <Link href="/admin/onboarding/new" className="btn-primary">
          <Plus size={16} /> Create Form
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 size={24} className="animate-spin text-blue-500" />
        </div>
      ) : forms.length === 0 ? (
        <div className="card p-12 text-center flex flex-col items-center justify-center border-dashed">
          <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4">
            <Users size={24} />
          </div>
          <h3 className="font-semibold text-slate-900 mb-1">No forms found</h3>
          <p className="text-slate-500 mb-6 max-w-sm">Create your first onboarding form to start collecting details from candidates.</p>
          <Link href="/admin/onboarding/new" className="btn-primary">
            <Plus size={16} /> Create Form
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {forms.map(form => (
            <div key={form.id} className="card p-5 flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-slate-900 truncate">{form.title}</h3>
                  <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full font-medium ${form.status === 'PUBLISHED' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                    {form.status}
                  </span>
                </div>
              </div>
              <p className="text-sm text-slate-500 flex-1 mb-4 line-clamp-2">{form.description || "No description"}</p>
              
              <div className="flex items-center gap-4 text-sm text-slate-600 mb-4 bg-slate-50 p-2 rounded-lg">
                <div className="flex items-center gap-1.5">
                  <Users size={14} />
                  <span>{form._count.submissions} Submissions</span>
                </div>
              </div>

              <div className="flex gap-2 mt-auto pt-4 border-t border-slate-100">
                <Link href={`/admin/onboarding/${form.id}`} className="btn-secondary flex-1 justify-center text-xs">
                  <Settings size={14} /> Manage
                </Link>
                {form.status === "PUBLISHED" && (
                  <button onClick={() => copyLink(form.id)} className="btn-secondary flex-1 justify-center text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-100">
                    <Share2 size={14} /> Share
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
